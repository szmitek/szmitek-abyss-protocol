import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, Text, View } from 'react-native';

import { snapshotRepository } from '../../data/storage.ts';
import { exportVault, pickVaultBackup } from '../../data/vaultFiles.ts';
import { backupSummary, type BackupFile } from '../../domain/backup.ts';
import type { AppSnapshot } from '../../domain/types.ts';
import { GlowButton } from '../components/GlowButton.tsx';
import { Screen } from '../components/Screen.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { colors, spacing } from '../theme.ts';

interface Props {
  snapshot: AppSnapshot;
  loadError: string | null;
  onBack: () => void;
  onRetryLoad: () => Promise<void>;
  onRestore: (backup: BackupFile) => Promise<void>;
  onRestoreLocal: () => Promise<void>;
}
type Pending = { kind: 'file'; file: BackupFile } | { kind: 'local'; snapshot: AppSnapshot };

export function DataVaultScreen({ snapshot, loadError, onBack, onRetryLoad, onRestore, onRestoreLocal }: Props) {
  const [includePhotos, setIncludePhotos] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const operationRef = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async (operation: () => Promise<void>) => {
    if (operationRef.current) return;
    operationRef.current = true; setBusy(true); setMessage(null); setError(null);
    try { await operation(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'The operation could not be completed. Your current Player remains available.'); }
    finally { operationRef.current = false; setBusy(false); }
  };
  const preview = pending?.kind === 'file' ? backupSummary(pending.file) : pending ? {
    createdAt: null, level: pending.snapshot.profile?.level ?? 0, rank: pending.snapshot.profile?.rank ?? 'E',
    workouts: pending.snapshot.history.length, arcs: pending.snapshot.profile?.trainingArcs.length ?? 0, photos: (pending.snapshot.profile?.postureScans.length ?? 0) * 3,
  } : null;

  return (
    <Screen eyebrow="SYSTEM // DATA VAULT" title="Protect your Player" subtitle="Keep a portable copy of your progress and restore it when needed.">
      {loadError ? <SystemPanel eyebrow="STORAGE HOLD" title="Saved data could not be loaded" accent="danger"><Text style={styles.copy}>{loadError}</Text><GlowButton label="RETRY LOADING" variant="secondary" disabled={busy} onPress={() => { void run(onRetryLoad); }} /></SystemPanel> : null}
      <SystemPanel eyebrow="PORTABLE BACKUP" title="Export Player data" accent="purple">
        <Text style={styles.copy}>Includes profile, health signals, training history, arc reports and confirmed priorities. Finish or exit an active workout first. Today's quest is rebuilt after import.</Text>
        <View style={styles.option}><View style={styles.optionCopy}><Text style={styles.label}>Include private posture photos</Text><Text style={styles.copy}>{snapshot.profile?.postureScans.length ?? 0} visual records · optional</Text></View><Switch accessibilityLabel="Include private posture photos in backup" value={includePhotos} onValueChange={setIncludePhotos} disabled={busy} trackColor={{ true: colors.purple, false: colors.textDim }} /></View>
        <Text style={styles.privacy}>The file is not encrypted. It contains health details{includePhotos ? ' and private photos' : ''}. Choose a trusted destination in the device's share menu. No automatic cloud upload is performed.</Text>
        <Text style={styles.copy}>24 MB per backup · 6 MB per photo. Data-only backups omit photo records; existing files remain available in the local pre-import recovery save.</Text>
        <GlowButton label="EXPORT BACKUP" disabled={busy || Boolean(loadError) || !snapshot.profile || Boolean(snapshot.activeWorkout)} onPress={() => { void run(async () => { setPending(null); await exportVault(snapshot, includePhotos); setMessage('Share menu closed. Verify that the backup file was saved in your chosen destination.'); }); }} />
      </SystemPanel>
      <SystemPanel eyebrow="RESTORE POINT" title="Import a backup">
        <Text style={styles.copy}>Select an Abyss Protocol Data Vault file. The System checks its format, contents and photo references before offering to replace this Player.</Text>
        <GlowButton label="SELECT BACKUP FILE" variant="secondary" disabled={busy || Boolean(snapshot.activeWorkout)} onPress={() => { void run(async () => { const file = await pickVaultBackup(); if (file) setPending({ kind: 'file', file }); }); }} />
      </SystemPanel>
      {pending && preview ? <SystemPanel eyebrow="REVIEW RESTORE" title={pending.kind === 'file' ? 'Validated backup' : 'Local pre-import save'} accent="purple">
        {preview.createdAt ? <Text style={styles.copy}>Created {new Date(preview.createdAt).toLocaleString()}</Text> : null}
        <Text style={styles.summary}>LEVEL {preview.level} · RANK {preview.rank}</Text>
        <Text style={styles.copy}>{preview.workouts} workout records · {preview.arcs} arcs · {preview.photos} photos</Text>
        <Text style={styles.privacy}>This replaces the current Player{snapshot.profile ? ` (Level ${snapshot.profile.level}, ${snapshot.history.length} workout records)` : ''}. Records are not merged. {pending.kind === 'file' ? 'The current local save is retained in one pre-import recovery slot before replacement.' : 'This returns to the save from before the last import. Newer progress will be replaced.'}</Text>
        <GlowButton label="REPLACE PLAYER DATA" variant="danger" disabled={busy} onPress={() => { void run(async () => { if (pending.kind === 'file') await onRestore(pending.file); else await onRestoreLocal(); setPending(null); setMessage('Player restored. The current training gate and quest have been rebuilt.'); }); }} />
        <GlowButton label="CANCEL RESTORE" variant="secondary" disabled={busy} onPress={() => setPending(null)} />
      </SystemPanel> : null}
      <SystemPanel eyebrow="LOCAL RECOVERY" title="Before the last import">
        <Text style={styles.copy}>One pre-import save stays on this device with its original photo files. It can undo an import, but it does not survive uninstalling the app. Use an exported backup for device replacement.</Text>
        <GlowButton label="REVIEW LOCAL RECOVERY" variant="secondary" disabled={busy || Boolean(snapshot.activeWorkout)} onPress={() => { void run(async () => { setPending({ kind: 'local', snapshot: await snapshotRepository.loadRecovery() }); }); }} />
      </SystemPanel>
      {busy ? <View style={styles.activity}><ActivityIndicator color={colors.primary} /><Text style={styles.copy}>PROCESSING VAULT · KEEP APP OPEN</Text></View> : null}
      {error ? <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text> : null}
      {message ? <Text accessibilityLiveRegion="polite" style={styles.message}>{message}</Text> : null}
      {!loadError ? <GlowButton label="RETURN TO SYSTEM" variant="secondary" disabled={busy} onPress={onBack} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: { color: colors.textMuted, fontSize: 13, lineHeight: 20, marginBottom: spacing.md },
  privacy: { color: colors.warning, fontSize: 13, lineHeight: 20, marginBottom: spacing.md },
  label: { color: colors.text, fontWeight: '700', fontSize: 14 },
  summary: { color: colors.primary, fontWeight: '900', fontSize: 18, marginBottom: spacing.md },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginVertical: spacing.md },
  optionCopy: { flex: 1 },
  activity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  error: { color: colors.danger, fontSize: 14, lineHeight: 21 },
  message: { color: colors.success, fontSize: 14, lineHeight: 21 },
});
