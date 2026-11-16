// Offline delivery prototype. Never imported by the app or used as a real ledger.
// No HTTP, provider credentials, persistent storage or production authentication.
import { createHash } from 'node:crypto';

export interface DeliveryBinding {
  ownerId: string;
  operationId: string;
  requestId: string;
  inputDigest: string;
  providerId: string;
  model: string;
  promptVersion: string;
  dataVersion: string;
  retentionVersion: string;
}
export interface DeliveryQuote {
  id: string;
  binding: DeliveryBinding;
  month: string;
  issuedAt: number;
  expiresAt: number;
  maximumMicroPln: number;
}
export interface DeliveryConsent {
  quoteId: string;
  bindingDigest: string;
  maximumMicroPln: number;
  confirmedAt: number;
}
export type DeliveryStatus = 'reserved' | 'submitted' | 'unknown_outcome' | 'completed'
  | 'rejected_output' | 'failed_before_send' | 'cancelled_before_send';
export interface DeliveryOperation {
  quote: DeliveryQuote;
  consent: DeliveryConsent;
  status: DeliveryStatus;
  accountedMicroPln: number;
  measuredMicroPln: number | null;
}
function fail(): never { throw new Error('Delivery operation unavailable or invalid.'); }
function identifier(value: string): void {
  if (typeof value !== 'string' || !value.trim() || value.length > 256) fail();
}
function amount(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) fail();
}
function instant(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 8_640_000_000_000_000) fail();
}
function monthAt(now: number): string { instant(now); return new Date(now).toISOString().slice(0, 7); }

// Explicit fixed-order encoding of metadata, not a canonical serializer for input.
// A real service must reconstruct/validate inputDigest from its whitelisted body.
export function deliveryBindingDigest(binding: DeliveryBinding): string {
  if (!binding || typeof binding !== 'object') fail();
  const fields = [binding.ownerId, binding.operationId, binding.requestId, binding.inputDigest,
    binding.providerId, binding.model, binding.promptVersion, binding.dataVersion, binding.retentionVersion];
  fields.forEach(identifier);
  if (!/^[a-f0-9]{64}$/.test(binding.inputDigest)) fail();
  return createHash('sha256').update(JSON.stringify(fields)).digest('hex');
}
function validateQuote(quote: DeliveryQuote): void {
  identifier(quote.id); deliveryBindingDigest(quote.binding);
  instant(quote.issuedAt); instant(quote.expiresAt); amount(quote.maximumMicroPln);
  if (!quote.maximumMicroPln || quote.expiresAt <= quote.issuedAt ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(quote.month) || monthAt(quote.issuedAt) !== quote.month) fail();
}
export function confirmDelivery(quote: DeliveryQuote, now: number): DeliveryConsent {
  validateQuote(quote); instant(now);
  if (now < quote.issuedAt || now >= quote.expiresAt || monthAt(now) !== quote.month) fail();
  return { quoteId: quote.id, bindingDigest: deliveryBindingDigest(quote.binding),
    maximumMicroPln: quote.maximumMicroPln, confirmedAt: now };
}

// Atomic only within this single synchronous in-memory instance. Future services
// need a transactional durable implementation; this class provides no crash recovery.
// Quotes are registered by the test/service side. Caller-supplied quotes cannot
// silently change a price, expiry, owner or model already bound to an operation.
export class OfflineDeliveryLedger {
  private readonly quotes = new Map<string, DeliveryQuote>();
  private readonly operations = new Map<string, DeliveryOperation>();
  private readonly monthlyCapMicroPln: number;
  private readonly ownerMonthlyCapMicroPln: number;
  constructor(monthlyCapMicroPln: number, ownerMonthlyCapMicroPln: number) {
    this.monthlyCapMicroPln = monthlyCapMicroPln; this.ownerMonthlyCapMicroPln = ownerMonthlyCapMicroPln;
    amount(monthlyCapMicroPln); amount(ownerMonthlyCapMicroPln);
    if (!monthlyCapMicroPln || !ownerMonthlyCapMicroPln) fail();
  }
  registerQuote(quote: DeliveryQuote): void {
    validateQuote(quote);
    if (this.quotes.has(quote.id)) fail();
    this.quotes.set(quote.id, structuredClone(quote));
  }
  private key(ownerId: string, operationId: string): string {
    identifier(ownerId); identifier(operationId); return JSON.stringify([ownerId, operationId]);
  }
  private lookup(ownerId: string, operationId: string): DeliveryOperation {
    const value = this.operations.get(this.key(ownerId, operationId));
    if (!value) fail();
    return value;
  }
  read(ownerId: string, operationId: string): DeliveryOperation {
    return structuredClone(this.lookup(ownerId, operationId));
  }
  accounted(month: string, ownerId?: string): number {
    return [...this.operations.values()].filter(o => o.quote.month === month &&
      (ownerId === undefined || o.quote.binding.ownerId === ownerId))
      .reduce((sum, o) => sum + o.accountedMicroPln, 0);
  }
  reserve(ownerId: string, binding: DeliveryBinding, consent: DeliveryConsent, now: number): DeliveryOperation {
    instant(now);
    const digest = deliveryBindingDigest(binding);
    const quote = this.quotes.get(consent.quoteId);
    if (!quote || quote.binding.ownerId !== ownerId || binding.ownerId !== ownerId ||
      digest !== deliveryBindingDigest(quote.binding) || consent.bindingDigest !== digest ||
      consent.maximumMicroPln !== quote.maximumMicroPln) fail();
    instant(consent.confirmedAt);
    if (consent.confirmedAt < quote.issuedAt || consent.confirmedAt >= quote.expiresAt ||
        consent.confirmedAt > now || monthAt(consent.confirmedAt) !== quote.month) fail();
    const key = this.key(ownerId, binding.operationId), prior = this.operations.get(key);
    if (prior) {
      // An expired quote may retrieve its existing operation, but cannot create one.
      if (prior.quote.id !== quote.id || prior.consent.confirmedAt !== consent.confirmedAt) fail();
      return structuredClone(prior);
    }
    if (now >= quote.expiresAt || monthAt(now) !== quote.month) fail();
    const global = this.accounted(quote.month) + quote.maximumMicroPln;
    const own = this.accounted(quote.month, ownerId) + quote.maximumMicroPln;
    if (!Number.isSafeInteger(global) || !Number.isSafeInteger(own) ||
      global > this.monthlyCapMicroPln || own > this.ownerMonthlyCapMicroPln) fail();
    const operation: DeliveryOperation = { quote: structuredClone(quote), consent: structuredClone(consent),
      status: 'reserved', accountedMicroPln: quote.maximumMicroPln, measuredMicroPln: null };
    this.operations.set(key, operation);
    return structuredClone(operation);
  }
  // The sole transition authorizing one fake-transport call in this prototype.
  // Mark submitted before calling transport. Never claim again after uncertainty.
  claimSubmission(ownerId: string, operationId: string, now: number): boolean {
    const operation = this.lookup(ownerId, operationId); instant(now);
    if (operation.status !== 'reserved') return false;
    if (now < operation.consent.confirmedAt || now >= operation.quote.expiresAt ||
        monthAt(now) !== operation.quote.month) fail();
    operation.status = 'submitted';
    return true;
  }
  stopBeforeSend(ownerId: string, operationId: string, status: 'failed_before_send' | 'cancelled_before_send'): void {
    const operation = this.lookup(ownerId, operationId);
    if (operation.status !== 'reserved' || !['failed_before_send', 'cancelled_before_send'].includes(status)) fail();
    operation.status = status; operation.accountedMicroPln = 0; operation.measuredMicroPln = 0;
  }
  markUnknown(ownerId: string, operationId: string): void {
    const operation = this.lookup(ownerId, operationId);
    if (operation.status === 'unknown_outcome') return;
    if (operation.status !== 'submitted') fail();
    operation.status = 'unknown_outcome';
  }
  recordOutcome(ownerId: string, operationId: string, requestId: string,
    status: 'completed' | 'rejected_output', measuredMicroPln: number | null): void {
    const operation = this.lookup(ownerId, operationId);
    if (!['completed', 'rejected_output'].includes(status) || requestId !== operation.quote.binding.requestId) fail();
    if (measuredMicroPln !== null) amount(measuredMicroPln);
    if (operation.status === status && operation.measuredMicroPln === measuredMicroPln) return;
    if (!['submitted', 'unknown_outcome'].includes(operation.status)) fail();
    // This prototype intentionally keeps the full reserve even with known usage.
    // Reconciliation needs a separately designed, evidenced accounting operation.
    // Above-cap usage must be recorded truthfully and block later reservations.
    operation.status = status; operation.measuredMicroPln = measuredMicroPln;
    operation.accountedMicroPln = Math.max(operation.accountedMicroPln, measuredMicroPln ?? 0);
  }
}

export function deliveryResultIsCurrent(operation: DeliveryOperation, currentInputDigest: string): boolean {
  return operation.status === 'completed' && operation.quote.binding.inputDigest === currentInputDigest;
}
