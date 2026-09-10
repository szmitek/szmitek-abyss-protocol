import { INITIAL_SNAPSHOT } from './profile.ts';
import { assertValidSnapshot } from './snapshotValidation.ts';
import { POSTURE_VIEWS, type AppSnapshot, type PosturePhoto } from './types.ts';

export const MAX_BACKUP_BYTES = 24 * 1024 * 1024;
export const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
export interface BackupPhoto { key: string; extension: 'jpg' | 'png' | 'webp' | 'heic'; base64: string }
export interface BackupPayload { createdAt: string; includesPhotos: boolean; snapshot: AppSnapshot; photos: BackupPhoto[] }
export interface BackupFile { format: 'abyss-protocol-vault'; version: 1; checksum: string; payload: BackupPayload }

// Detect accidental file corruption. This is not encryption or an authenticity signature.
export function backupChecksum(text: string): string {
  let value = 2166136261;
  for (let i = 0; i < text.length; i += 1) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return (value >>> 0).toString(16).padStart(8, '0');
}

export function photoExtension(base64: string): BackupPhoto['extension'] {
  if (base64.startsWith('/9j/')) return 'jpg';
  if (base64.startsWith('iVBORw0KGgo')) return 'png';
  // RIFF....WEBP and ISO BMFF ftyp containers. No SVG or remote image references.
  const prefix = decodePrefix(base64);
  if (prefix.startsWith('RIFF') && prefix.slice(8, 12) === 'WEBP') return 'webp';
  if (prefix.slice(4, 8) === 'ftyp' && ['heic', 'heix', 'hevc', 'hevx', 'mif1', 'msf1'].includes(prefix.slice(8, 12))) return 'heic';
  throw new Error('A photo is not a supported JPEG, PNG, WebP or HEIC file. Try a data-only backup.');
}

function decodePrefix(base64: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let buffer = 0, bits = 0, result = '';
  for (const char of base64.slice(0, 24)) {
    const digit = alphabet.indexOf(char);
    if (digit < 0) break;
    buffer = (buffer << 6) | digit; bits += 6;
    if (bits >= 8) { bits -= 8; result += String.fromCharCode((buffer >> bits) & 255); }
  }
  return result;
}

function validatePhoto(photo: BackupPhoto): void {
  if (!photo || typeof photo.key !== 'string' || !/^vault-photo-\d+$/.test(photo.key) || typeof photo.base64 !== 'string'
    || photo.base64.length < 16 || photo.base64.length > MAX_PHOTO_BYTES * 4 / 3 || photo.base64.length % 4 !== 0
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(photo.base64) || photo.extension !== photoExtension(photo.base64)) throw new Error('The backup contains an invalid or oversized photo.');
}

export async function createBackup(snapshot: AppSnapshot, includesPhotos: boolean, readPhoto: (photo: PosturePhoto) => Promise<string>, now = new Date()): Promise<BackupFile> {
  assertValidSnapshot(snapshot);
  if (snapshot.activeWorkout) throw new Error('Finish or exit the active workout before creating a backup.');
  if (!snapshot.profile) throw new Error('Create a Player profile before exporting a backup.');
  const copy: AppSnapshot = JSON.parse(JSON.stringify({ ...snapshot, weeklyProtocol: null, dailyQuest: null, activeWorkout: null, lastCompletion: null }));
  const photos: BackupPhoto[] = [];
  let photoCharacters = 0;
  if (includesPhotos) {
    for (const scan of copy.profile!.postureScans) for (const view of POSTURE_VIEWS) {
      const base64 = await readPhoto(scan.photos[view]);
      photoCharacters += base64.length;
      if (photoCharacters > MAX_BACKUP_BYTES) throw new Error('Photos exceed the 24 MB backup limit. Export data only instead.');
      const photo = { key: `vault-photo-${photos.length}`, extension: photoExtension(base64), base64 };
      validatePhoto(photo); photos.push(photo); scan.photos[view].uri = photo.key;
    }
  } else {
    copy.profile!.postureScans = [];
    copy.profile!.trainingArcReviews = copy.profile!.trainingArcReviews.map((review) => ({ ...review, baselinePostureScanId: null, completionPostureScanId: null }));
  }
  const payload = { createdAt: now.toISOString(), includesPhotos, snapshot: copy, photos };
  const backup: BackupFile = { format: 'abyss-protocol-vault', version: 1, checksum: backupChecksum(JSON.stringify(payload)), payload };
  parseBackup(JSON.stringify(backup));
  return backup;
}

export function parseBackup(text: string): BackupFile {
  if (!text.length || text.length > MAX_BACKUP_BYTES) throw new Error('Select a backup smaller than 24 MB.');
  let file: BackupFile;
  try {
    file = JSON.parse(text, (key, value: unknown) => {
      if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Unsafe key');
      return value;
    }) as BackupFile;
  } catch { throw new Error('This file is not a readable Data Vault backup.'); }
  if (!file || file.format !== 'abyss-protocol-vault' || file.version !== 1) throw new Error('Unsupported backup format or version.');
  const p = file.payload;
  if (!p || file.checksum !== backupChecksum(JSON.stringify(p))) throw new Error('The backup integrity check failed. Select an intact copy.');
  if (typeof p.createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(p.createdAt) || !Number.isFinite(Date.parse(p.createdAt))
    || typeof p.includesPhotos !== 'boolean' || !Array.isArray(p.photos) || p.photos.length > 3000) throw new Error('Invalid backup metadata.');
  assertValidSnapshot(p.snapshot);
  if (!p.snapshot.profile || !p.snapshot.onboardingComplete || p.snapshot.activeWorkout || p.snapshot.dailyQuest || p.snapshot.weeklyProtocol || p.snapshot.lastCompletion) throw new Error('The backup contains unsupported session state.');
  p.photos.forEach(validatePhoto);
  const keys = new Set(p.photos.map((photo) => photo.key));
  const references = p.snapshot.profile.postureScans.flatMap((scan) => POSTURE_VIEWS.map((view) => scan.photos[view].uri));
  if (keys.size !== p.photos.length || references.length !== keys.size || new Set(references).size !== references.length || references.some((uri) => !keys.has(uri))
    || (!p.includesPhotos && (p.photos.length || references.length))) throw new Error('The photo archive is incomplete or contains external paths.');
  return file;
}

export function backupSummary(backup: BackupFile) {
  const { snapshot, createdAt, photos } = backup.payload;
  return { createdAt, level: snapshot.profile!.level, rank: snapshot.profile!.rank, workouts: snapshot.history.length, arcs: snapshot.profile!.trainingArcs.length, photos: photos.length };
}

export async function prepareBackupRestore(backup: BackupFile, token: string, writePhoto: (scanId: string, view: string, photo: BackupPhoto) => Promise<string>): Promise<AppSnapshot> {
  if (!/^[a-zA-Z0-9_-]+$/.test(token)) throw new Error('Invalid restore identifier.');
  // Revalidate at the mutation boundary, even when the UI already previewed this file.
  const parsed = parseBackup(JSON.stringify(backup));
  const copy = parsed.payload.snapshot;
  const photos = new Map(parsed.payload.photos.map((photo) => [photo.key, photo]));
  const ids = new Map<string, string>();
  for (const [index, scan] of copy.profile!.postureScans.entries()) {
    const nextId = `restore-${token}-${index}`;
    ids.set(scan.id, nextId); scan.id = nextId;
    for (const view of POSTURE_VIEWS) scan.photos[view].uri = await writePhoto(nextId, view, photos.get(scan.photos[view].uri)!);
  }
  copy.profile!.trainingArcReviews = copy.profile!.trainingArcReviews.map((review) => ({ ...review,
    baselinePostureScanId: ids.get(review.baselinePostureScanId ?? '') ?? null,
    completionPostureScanId: ids.get(review.completionPostureScanId ?? '') ?? null,
  }));
  return { ...INITIAL_SNAPSHOT, ...copy, weeklyProtocol: null, dailyQuest: null, activeWorkout: null, lastCompletion: null };
}
