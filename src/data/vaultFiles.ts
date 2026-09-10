import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { createBackup, MAX_BACKUP_BYTES, MAX_PHOTO_BYTES, parseBackup, prepareBackupRestore, type BackupFile } from '../domain/backup.ts';
import type { AppSnapshot } from '../domain/types.ts';

const privatePhotos = () => new Directory(Paths.document, 'posture-archive');
const exportsDirectory = () => new Directory(Paths.cache, 'data-vault');

export async function exportVault(snapshot: AppSnapshot, includePhotos: boolean): Promise<void> {
  if (!await Sharing.isAvailableAsync()) throw new Error('File sharing is not available on this device.');
  const backup = await createBackup(snapshot, includePhotos, async (photo) => {
    const uri = decodeURIComponent(photo.uri);
    if (!uri.startsWith(decodeURIComponent(privatePhotos().uri).replace(/\/+$/, '') + '/') || uri.split('/').some((part) => part === '..')) throw new Error('A photo is outside the private archive. Export data only instead.');
    const file = new File(photo.uri);
    if (!file.exists) throw new Error('An archived photo is missing. Export data only instead.');
    if (file.size > MAX_PHOTO_BYTES) throw new Error('An archived photo exceeds 6 MB. Export data only instead.');
    return file.base64();
  });
  const directory = exportsDirectory();
  directory.create({ intermediates: true, idempotent: true });
  // Keep the most recent export available to the receiving app until the next export.
  for (const previous of directory.list()) if (previous instanceof File) previous.delete();
  const file = new File(directory, `Abyss-Protocol-${Date.now()}.json`);
  file.write(JSON.stringify(backup));
  if (file.size > MAX_BACKUP_BYTES) { file.delete(); throw new Error('The backup exceeds 24 MB. Export data only instead.'); }
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Save your Player backup' });
}

export async function pickVaultBackup(): Promise<BackupFile | null> {
  const selected = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', 'application/octet-stream'], multiple: false, copyToCacheDirectory: true });
  if (selected.canceled) return null;
  const asset = selected.assets[0]!;
  const file = new File(asset.uri);
  try {
    if ((asset.size ?? file.size) > MAX_BACKUP_BYTES || file.size > MAX_BACKUP_BYTES) throw new Error('Select a backup smaller than 24 MB.');
    return parseBackup(await file.text());
  } finally {
    if (file.uri.startsWith(Paths.cache.uri) && file.exists) file.delete();
  }
}

export async function stageVaultRestore(backup: BackupFile) {
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const directories: Directory[] = [];
  const rollback = () => {
    for (const directory of directories) {
      try { if (directory.exists) directory.delete(); } catch { /* A failed cleanup must not hide the original restore failure. */ }
    }
  };
  try {
    const snapshot = await prepareBackupRestore(backup, token, async (scanId, view, photo) => {
      const directory = new Directory(privatePhotos(), scanId);
      if (!directories.some((item) => item.uri === directory.uri)) {
        // Fresh names keep the pre-import snapshot's files available for recovery.
        directory.create({ intermediates: true }); directories.push(directory);
      }
      const file = new File(directory, `${view}.${photo.extension}`);
      file.write(photo.base64, { encoding: 'base64' });
      if (!file.exists || !file.size) throw new Error('A restored photo could not be written.');
      return file.uri;
    });
    return { snapshot, rollback };
  } catch (error) { rollback(); throw error; }
}
