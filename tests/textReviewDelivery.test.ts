import assert from 'node:assert/strict';
import test from 'node:test';
import { OfflineDeliveryLedger, confirmDelivery, deliveryBindingDigest, deliveryResultIsCurrent,
  type DeliveryQuote } from '../tools/arc-review-benchmark/textDelivery.ts';

const now = Date.parse('2026-10-09T12:00:00Z');
function quote(id = 'one', ownerId = 'owner'): DeliveryQuote {
  return { id, month: '2026-10', issuedAt: now - 1000, expiresAt: now + 60000, maximumMicroPln: 3700000,
    binding: { ownerId, operationId: id, requestId: `review:${id}`, inputDigest: 'a'.repeat(64),
      providerId: 'fake', model: 'fake-model', promptVersion: 'v2', dataVersion: 'text.v1', retentionVersion: 'policy.v1' } };
}
function setup() {
  const ledger = new OfflineDeliveryLedger(10000000, 5000000), q = quote();
  ledger.registerQuote(q);
  return { ledger, q, consent: confirmDelivery(q, now) };
}

test('confirmation binds every identity, input, provider and disclosure version', () => {
  const { ledger, q, consent } = setup();
  for (const key of Object.keys(q.binding) as (keyof typeof q.binding)[]) {
    const changed = { ...q.binding, [key]: key === 'inputDigest' ? 'b'.repeat(64) : q.binding[key] + '-changed' };
    assert.notEqual(deliveryBindingDigest(changed), consent.bindingDigest);
    assert.throws(() => ledger.reserve('owner', changed, consent, now));
  }
  assert.throws(() => ledger.reserve('owner', q.binding, { ...consent, maximumMicroPln: 1 }, now));
  assert.equal(ledger.accounted('2026-10'), 0);
});

test('expired, future, cross-month or malformed quotes never authorize a submission', () => {
  const { ledger, q, consent } = setup();
  assert.throws(() => confirmDelivery(q, q.expiresAt));
  assert.throws(() => confirmDelivery(q, q.issuedAt - 1));
  assert.throws(() => ledger.reserve('owner', q.binding, consent, q.expiresAt));
  assert.throws(() => ledger.registerQuote({ ...quote('bad'), maximumMicroPln: NaN }));
  assert.throws(() => ledger.registerQuote({ ...quote('fraction'), maximumMicroPln: 1.5 }));
  const boundary = { ...quote('boundary'), issuedAt: Date.parse('2026-10-31T23:59:00Z'), expiresAt: Date.parse('2026-11-01T00:01:00Z') };
  assert.throws(() => confirmDelivery(boundary, Date.parse('2026-11-01T00:00:00Z')));
});

test('concurrent duplicate commands invoke fake transport once and reserve once', async () => {
  const { ledger, q, consent } = setup();
  let fakeCalls = 0;
  await Promise.all(Array.from({ length: 12 }, async () => {
    ledger.reserve('owner', q.binding, consent, now);
    if (ledger.claimSubmission('owner', q.binding.operationId, now)) {
      fakeCalls++;
      await Promise.resolve();
      ledger.recordOutcome('owner', 'one', 'review:one', 'completed', 1216070);
    }
  }));
  assert.equal(fakeCalls, 1);
  assert.equal(ledger.accounted('2026-10'), 3700000);
  assert.equal(ledger.read('owner', 'one').measuredMicroPln, 1216070);
});

test('lost response retains reserve, blocks resubmission and permits same-operation recovery', () => {
  const { ledger, q, consent } = setup();
  ledger.reserve('owner', q.binding, consent, now);
  assert.equal(ledger.claimSubmission('owner', 'one', now), true);
  ledger.markUnknown('owner', 'one');
  ledger.markUnknown('owner', 'one');
  assert.equal(ledger.claimSubmission('owner', 'one', now), false);
  assert.throws(() => ledger.stopBeforeSend('owner', 'one', 'cancelled_before_send'));
  assert.equal(ledger.reserve('owner', q.binding, consent, q.expiresAt + 1).status, 'unknown_outcome');
  assert.equal(ledger.accounted('2026-10'), 3700000);
  ledger.recordOutcome('owner', 'one', 'review:one', 'completed', 1216070);
  assert.equal(ledger.read('owner', 'one').status, 'completed');
});

test('known pre-send cancellation frees its reservation without making the operation reusable', () => {
  const { ledger, q, consent } = setup();
  ledger.reserve('owner', q.binding, consent, now);
  ledger.stopBeforeSend('owner', 'one', 'cancelled_before_send');
  assert.equal(ledger.accounted('2026-10'), 0);
  ledger.reserve('owner', q.binding, consent, now);
  assert.equal(ledger.claimSubmission('owner', 'one', now), false);
});

test('expired reservations cannot be submitted after a delay and cannot roll into another month', () => {
  const { ledger, q, consent } = setup();
  ledger.reserve('owner', q.binding, consent, now);
  assert.throws(() => ledger.claimSubmission('owner', 'one', q.expiresAt));
  assert.throws(() => ledger.claimSubmission('owner', 'one', now - 1));
  assert.equal(ledger.accounted('2026-10'), 3700000);
  assert.equal(ledger.accounted('2026-11'), 0);
  ledger.stopBeforeSend('owner', 'one', 'failed_before_send');
});

test('invalid paid output and unknown usage stay accounted and cannot trigger a repair call', () => {
  const { ledger, q, consent } = setup();
  ledger.reserve('owner', q.binding, consent, now);
  ledger.claimSubmission('owner', 'one', now);
  ledger.recordOutcome('owner', 'one', 'review:one', 'rejected_output', null);
  assert.equal(ledger.accounted('2026-10'), 3700000);
  assert.equal(ledger.claimSubmission('owner', 'one', now), false);
  assert.equal(deliveryResultIsCurrent(ledger.read('owner', 'one'), q.binding.inputDigest), false);
});

test('global and per-owner budgets include concurrent reservations and above-cap measured usage', () => {
  const { ledger, q, consent } = setup();
  ledger.reserve('owner', q.binding, consent, now);
  const own = quote('two'); ledger.registerQuote(own);
  assert.throws(() => ledger.reserve('owner', own.binding, confirmDelivery(own, now), now));
  const other = quote('three', 'other'); ledger.registerQuote(other);
  ledger.reserve('other', other.binding, confirmDelivery(other, now), now);
  const third = quote('four', 'third'); ledger.registerQuote(third);
  assert.throws(() => ledger.reserve('third', third.binding, confirmDelivery(third, now), now));
  ledger.claimSubmission('owner', 'one', now);
  ledger.recordOutcome('owner', 'one', 'review:one', 'completed', 11000000);
  assert.equal(ledger.accounted('2026-10'), 14700000);
  assert.throws(() => ledger.reserve('third', third.binding, confirmDelivery(third, now), now));
});

test('owner isolation, quote replacement and detached copies cannot alter existing state', () => {
  const { ledger, q, consent } = setup();
  assert.throws(() => ledger.reserve('stranger', q.binding, consent, now));
  const operation = ledger.reserve('owner', q.binding, consent, now);
  assert.throws(() => ledger.read('stranger', 'one'));
  assert.throws(() => ledger.markUnknown('stranger', 'one'));
  assert.throws(() => ledger.registerQuote(q));
  q.maximumMicroPln = 1; consent.maximumMicroPln = 1;
  operation.quote.binding.inputDigest = 'b'.repeat(64); operation.accountedMicroPln = 0;
  assert.equal(ledger.read('owner', 'one').accountedMicroPln, 3700000);
  assert.equal(ledger.read('owner', 'one').quote.binding.inputDigest, 'a'.repeat(64));
});

test('wrong request results are rejected and stale results never count as current', () => {
  const { ledger, q, consent } = setup();
  ledger.reserve('owner', q.binding, consent, now); ledger.claimSubmission('owner', 'one', now);
  assert.throws(() => ledger.recordOutcome('owner', 'one', 'different', 'completed', 1));
  ledger.recordOutcome('owner', 'one', 'review:one', 'completed', 1216070);
  ledger.recordOutcome('owner', 'one', 'review:one', 'completed', 1216070);
  assert.throws(() => ledger.recordOutcome('owner', 'one', 'review:one', 'completed', 1));
  assert.equal(deliveryResultIsCurrent(ledger.read('owner', 'one'), q.binding.inputDigest), true);
  assert.equal(deliveryResultIsCurrent(ledger.read('owner', 'one'), 'b'.repeat(64)), false);
});
