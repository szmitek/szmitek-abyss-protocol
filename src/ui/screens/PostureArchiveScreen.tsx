import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { deletePosturePhotos, persistPosturePhotos, type PosturePhotoDraft, type PosturePhotoDraftMap } from '../../data/posturePhotos.ts';
import { comparisonViews, evidenceNotes, scanPhotos, createPostureScan, latestPostureComparison } from '../../domain/postureArchive.ts';
import { parsePendingPosturePhoto } from '../../domain/pendingPosturePhoto.ts';
import { CAPTURE_VIEWS, type CaptureView, type PosturePhotoSource, type PostureScan, type PostureView, type UserProfile } from '../../domain/types.ts';
import { GlowButton } from '../components/GlowButton.tsx';
import { Screen } from '../components/Screen.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { colors, radius, spacing } from '../theme.ts';

const PENDING_VIEW_KEY = '@abyss-protocol/pending-posture-view';
const VIEW_LABELS: Record<PostureView, string> = { front: 'FRONT', side: 'SIDE — UNSPECIFIED', left: 'LEFT SIDE', right: 'RIGHT SIDE', back: 'BACK' };
type Draft = Partial<PosturePhotoDraftMap>;

interface PostureArchiveScreenProps {
  profile: UserProfile;
  mode?: 'archive' | 'reassessment';
  onBack: () => void;
  onSave: (scan: PostureScan) => Promise<void>;
  onDelete: (scanId: string) => Promise<void>;
  onCaptureComplete?: (scanId: string) => void;
}

function completeDraft(draft: Draft): draft is PosturePhotoDraftMap {
  return CAPTURE_VIEWS.every((view) => Boolean(draft[view]));
}

function scanDate(scan: PostureScan): string {
  return new Date(scan.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

export function PostureArchiveScreen({ profile, mode = 'archive', onBack, onSave, onDelete, onCaptureComplete }: PostureArchiveScreenProps) {
  const [visibleRecords, setVisibleRecords] = useState(3);
  const [creating, setCreating] = useState(mode === 'reassessment');
  const [draft, setDraft] = useState<Draft>({});
  const [setup, setSetup] = useState({ framing: false, stance: false, repeatable: false });
  const setupReady = Object.values(setup).every(Boolean);
  const [busy, setBusy] = useState(true);
  const busyRef = useRef(true);
  const mountedRef = useRef(true);
  const acquire = () => {
    if (busyRef.current) return false;
    busyRef.current = true; setBusy(true); return true;
  };
  const release = useCallback(() => { busyRef.current = false; if (mountedRef.current) setBusy(false); }, []);
  const comparison = useMemo(() => latestPostureComparison(profile.postureScans), [profile.postureScans]);
  const latest = profile.postureScans[0] ?? null;

  const applyAsset = useCallback((view: CaptureView, asset: ImagePicker.ImagePickerAsset, source: PosturePhotoSource, recovered = false) => {
    if (!mountedRef.current) return;
    if (!Number.isInteger(asset.width) || !Number.isInteger(asset.height) || asset.width < 1 || asset.height < 1 || asset.width > 32768 || asset.height > 32768) {
      Alert.alert('Image dimensions unavailable', 'Choose another photo. The existing draft has not changed.');
      return;
    }
    setSetup({ framing: false, stance: false, repeatable: false });
    setDraft((current) => ({
      ...current,
      [view]: { uri: asset.uri, width: asset.width, height: asset.height, source, originalCapturedAt: source === 'camera' && !recovered ? new Date().toISOString() : null },
    }));
  }, []);

  useEffect(() => {
    let mounted = true;
    mountedRef.current = true;
    void Promise.all([AsyncStorage.getItem(PENDING_VIEW_KEY), ImagePicker.getPendingResultAsync()]).then(([pendingView, result]) => {
      if (!mounted) return;
      const pending = parsePendingPosturePhoto(pendingView, profile.id);
      if (pending && pending.view !== 'side' && result && 'canceled' in result && !result.canceled && result.assets?.[0]) {
        setCreating(true);
        applyAsset(pending.view, result.assets[0], pending.source, true);
      }
      if (pending && result && 'code' in result) Alert.alert('Photo recovery failed', 'The interrupted picker did not return a usable photo. Please capture or select this view again.');
    }).catch(() => {
      if (mounted) Alert.alert('Photo recovery unavailable', 'An interrupted photo could not be recovered. Your saved archive remains available.');
    }).finally(async () => {
      if (!mounted) return;
      await AsyncStorage.removeItem(PENDING_VIEW_KEY).catch(() => undefined);
      release();
    });
    return () => { mounted = false; mountedRef.current = false; };
  }, [applyAsset, profile.id, release]);

  const pickPhoto = async (view: CaptureView, source: PosturePhotoSource) => {
    if (!acquire()) return;
    try {
      if (source === 'camera') {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Camera access required', permission.canAskAgain ? 'Allow camera access when asked, or choose an existing photo with Library.' : 'Camera access is blocked. Enable it in app settings, or choose an existing photo with Library.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open settings', onPress: () => { void Linking.openSettings().catch(() => Alert.alert('Settings unavailable', 'Open your device settings and find Abyss Protocol permissions.')); } },
          ]);
          return;
        }
      }
      await AsyncStorage.setItem(PENDING_VIEW_KEY, JSON.stringify({ view, source, profileId: profile.id, requestedAt: new Date().toISOString() }));
      const options = { mediaTypes: ['images'] as ImagePicker.MediaType[], allowsEditing: false, quality: 0.82 };
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ ...options, cameraType: ImagePicker.CameraType.back })
        : await ImagePicker.launchImageLibraryAsync({ ...options, allowsMultipleSelection: false });
      if (!result.canceled && result.assets[0]) applyAsset(view, result.assets[0], source);
    } catch {
      if (mountedRef.current) Alert.alert('Photo unavailable', 'The photo could not be acquired. Try again or choose the other photo source. Your saved archive was not changed.');
    } finally {
      await AsyncStorage.removeItem(PENDING_VIEW_KEY).catch(() => undefined);
      release();
    }
  };

  const save = async (linkMovement = false) => {
    if (!completeDraft(draft) || !setupReady || !acquire()) return;
    const now = new Date();
    const scanId = `posture-${now.getTime()}`;
    try {
      const photos = await persistPosturePhotos(scanId, draft, now.toISOString());
      await onSave({ ...createPostureScan(profile, photos, now, scanId), protocol: 'four-view-v1', setupConfirmedAt: now.toISOString() });
      setDraft({});
      setCreating(false);
      setSetup({ framing: false, stance: false, repeatable: false });
      if (linkMovement) onCaptureComplete?.(scanId);
    } catch {
      await deletePosturePhotos(scanId).catch(() => undefined);
      Alert.alert('Visual record failed', 'The photos could not be stored. Your existing archive was not changed.');
    } finally {
      release();
    }
  };

  const confirmDelete = (scan: PostureScan) => {
    Alert.alert(
      'Delete visual record?',
      'All photos in this scan will be permanently removed from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (!acquire()) return;
            void onDelete(scan.id).then(async () => {
              try { await deletePosturePhotos(scan.id); }
              catch { Alert.alert('Photo cleanup failed', 'The record was removed, but its private files could not be deleted.'); }
            }).catch(() => { Alert.alert('Delete failed', 'The saved record and its photos were left unchanged.'); }).finally(release);
          },
        },
      ],
    );
  };

  const close = useCallback(() => {
    if (busyRef.current) return;
    if (creating) {
      const discard = () => { setDraft({}); setSetup({ framing: false, stance: false, repeatable: false }); setCreating(false); };
      if (Object.keys(draft).length) Alert.alert('Discard photo draft?', 'These unsealed photos will not be added to your archive.', [{ text: 'Keep editing', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: discard }]);
      else discard();
    } else onBack();
  }, [creating, draft, onBack]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { close(); return true; });
    return () => subscription.remove();
  }, [close]);

  return (
    <Screen
      eyebrow="SYSTEM // VISUAL RECORD"
      title={creating ? mode === 'reassessment' ? 'Final visual checkpoint' : 'Record baseline' : 'Posture Archive'}
      subtitle={creating ? mode === 'reassessment' ? 'Lock the end-of-cycle views and optionally continue to Movement Analysis.' : 'Capture the same four views every cycle. Consistency matters more than posing.' : 'Private visual checkpoints for comparing Training Arc results.'}
      action={<Pressable accessibilityRole="button" onPress={close} style={styles.back}><Text style={styles.backLabel}>{creating ? 'CANCEL' : 'BACK'}</Text></Pressable>}
    >
      <SystemPanel eyebrow="LOCAL VAULT" title="Device-only record" accent="purple">
        <Text style={styles.copy}>The app does not automatically upload or analyze these photos. Records stay inside this installation unless you explicitly include them in a Data Vault export. Uninstalling removes the local files.</Text>
        <View style={styles.verified}><Text style={styles.verifiedDot}>●</Text><Text style={styles.verifiedLabel}>CLOUD SYNC DISABLED</Text></View>
      </SystemPanel>

      {creating ? (
        <>
          <SystemPanel eyebrow="CAPTURE STANDARD" title="Repeatable setup">
            <Text style={styles.copy}>Full body visible · neutral stance · camera near waist height · same distance, lighting and fitted clothing. Do not force a “better” posture.</Text>
          </SystemPanel>
          {CAPTURE_VIEWS.map((view) => (
            <CaptureSlot
              key={view}
              view={view}
              draft={draft[view]}
              disabled={busy}
              onCamera={() => { void pickPhoto(view, 'camera'); }}
              onLibrary={() => { void pickPhoto(view, 'library'); }}
            />
          ))}
          <SystemPanel eyebrow="REVIEW BEFORE SAVING" title="Confirm the setup">
            <Text style={styles.copy}>Review all four previews. These confirmations describe your setup; the app does not detect pose, blur or lighting.</Text>
            {([
              ['framing', 'Full body is visible in every image, including head and feet.'],
              ['stance', 'Neutral stance; LEFT and RIGHT refer to my body side facing the camera.'],
              ['repeatable', 'Camera position, distance, lighting and clothing are repeatable across views and future checkpoints.'],
            ] as const).map(([key, label]) => (
              <Pressable key={key} accessibilityRole="checkbox" accessibilityState={{ checked: setup[key], disabled: busy }} disabled={busy} onPress={() => setSetup((value) => ({ ...value, [key]: !value[key] }))} style={styles.setupRow}>
                <Text style={styles.copy}>{setup[key] ? '☑' : '☐'} {label}</Text>
              </Pressable>
            ))}
          </SystemPanel>
          <GlowButton label={busy ? 'SEALING RECORD...' : 'SEAL VISUAL RECORD'} disabled={!completeDraft(draft) || !setupReady || busy} onPress={() => { void save(); }} />
          {onCaptureComplete ? <GlowButton label="SEAL & RUN MOVEMENT CHECK" disabled={!completeDraft(draft) || !setupReady || busy} variant="secondary" onPress={() => { void save(true); }} /> : null}
          <Text style={styles.footerNote}>All four views and setup confirmations are required. Library and recovered images have unknown capture dates. Only completing the next movement check links it to this record.</Text>
        </>
      ) : (
        <>
          <SystemPanel
            eyebrow="ARCHIVE STATUS"
            title={latest ? `${profile.postureScans.length} visual record${profile.postureScans.length === 1 ? '' : 's'}` : 'No baseline recorded'}
            trailing={<Text style={styles.count}>{String(profile.postureScans.length).padStart(2, '0')}</Text>}
          >
            <Text style={styles.copy}>{latest ? `Latest checkpoint: ${scanDate(latest)}${latest.trainingArcCycle ? ` · Training Arc ${latest.trainingArcCycle}` : ''}.` : 'Create a front, left, right and back baseline before judging physical changes.'}</Text>
            <GlowButton label="NEW VISUAL SCAN" disabled={busy} onPress={() => setCreating(true)} style={styles.primaryAction} />
          </SystemPanel>

          {comparison ? (
            <SystemPanel eyebrow="ARC COMPARISON" title={`${comparison.previous.trainingArcCycle ? `Cycle ${comparison.previous.trainingArcCycle}` : 'Earlier'} → ${comparison.current.trainingArcCycle ? `Cycle ${comparison.current.trainingArcCycle}` : 'Current'}`} accent="purple">
              <Text style={styles.comparisonMeta}>{comparison.elapsedDays} DAYS BETWEEN RECORDS</Text>
              <Text style={styles.copy}>Matching views: {comparisonViews(comparison.previous, comparison.current).map((view) => VIEW_LABELS[view]).join(', ')}. Setup and dates may differ; visual differences alone do not establish progress.</Text>
              <ScanStrip scan={comparison.previous} label="BEFORE" views={comparisonViews(comparison.previous, comparison.current)} />
              <View style={styles.divider} />
              <ScanStrip scan={comparison.current} label="CURRENT" views={comparisonViews(comparison.previous, comparison.current)} />
            </SystemPanel>
          ) : latest ? (
            <SystemPanel eyebrow="BASELINE LOCKED" title={scanDate(latest)} accent="purple">
              <ScanStrip scan={latest} label={latest.trainingArcCycle ? `CYCLE ${latest.trainingArcCycle}` : 'BASELINE'} />
              <Text style={styles.copy}>Add another scan after a consistent training block to unlock side-by-side comparison.</Text>
            </SystemPanel>
          ) : null}

          {profile.postureScans.slice(0, visibleRecords).map((scan) => <SystemPanel key={scan.id} eyebrow="SAVED CHECKPOINT" title={scanDate(scan)}>
            <ScanStrip scan={scan} label="ALL SAVED VIEWS" />
          </SystemPanel>)}
          {profile.postureScans.length > visibleRecords ? <GlowButton label="SHOW MORE RECORDS" variant="secondary" onPress={() => setVisibleRecords((count) => count + 3)} /> : null}
          {latest ? <GlowButton label="DELETE LATEST RECORD" disabled={busy} variant="danger" onPress={() => confirmDelete(latest)} /> : null}
        </>
      )}
    </Screen>
  );
}

function CaptureSlot({ view, draft, disabled, onCamera, onLibrary }: { view: CaptureView; draft: PosturePhotoDraft | undefined; disabled: boolean; onCamera: () => void; onLibrary: () => void }) {
  return (
    <SystemPanel eyebrow={`VIEW // ${VIEW_LABELS[view]}`} title={draft ? 'Image acquired' : 'Awaiting image'}>
      <View style={styles.captureFrame}>
        {draft ? <Image accessibilityLabel={`${VIEW_LABELS[view]} draft preview`} source={{ uri: draft.uri }} resizeMode="contain" style={styles.captureImage} /> : <View style={styles.placeholder}><Text style={styles.placeholderGlyph}>◇</Text><Text style={styles.placeholderText}>FULL BODY · {VIEW_LABELS[view]}</Text></View>}
      </View>
      <Text style={styles.copy}>{view === 'left' || view === 'right' ? `Your ${view} body side faces the camera. Avoid mirrored selfies.` : 'Use a neutral stance with your whole body visible.'}</Text>
      {draft ? <Text style={styles.copy}>{draft.width} × {draft.height} px{Math.min(draft.width, draft.height) < 480 ? ' · Small image: review detail before saving.' : ''}. {draft.originalCapturedAt ? 'Camera acquisition time recorded.' : 'Original capture date unknown.'}</Text> : null}
      <View style={styles.actionRow}>
        <GlowButton label={draft?.source === 'camera' ? 'RETAKE' : 'CAMERA'} disabled={disabled} variant="secondary" onPress={onCamera} style={styles.slotButton} />
        <GlowButton label={draft?.source === 'library' ? 'RESELECT' : 'LIBRARY'} disabled={disabled} variant="secondary" onPress={onLibrary} style={styles.slotButton} />
      </View>
    </SystemPanel>
  );
}

function ScanStrip({ scan, label, views }: { scan: PostureScan; label: string; views?: PostureView[] }) {
  return (
    <View style={styles.scanBlock}>
      <View style={styles.scanHeader}><Text style={styles.scanLabel}>{label}</Text><Text style={styles.scanDate}>{scanDate(scan)}</Text></View>
      <View style={styles.photoRow}>
        {scanPhotos(scan).filter((photo) => !views || views.includes(photo.view)).map((photo) => (
          <View key={photo.view} style={styles.thumbnailFrame}>
            <Image accessibilityLabel={`${VIEW_LABELS[photo.view]} saved record`} source={{ uri: photo.uri }} resizeMode="contain" style={styles.thumbnail} />
            <Text style={styles.thumbnailLabel}>{VIEW_LABELS[photo.view]}</Text>
          </View>
        ))}
      </View>
      {evidenceNotes(scan).map((note) => <Text key={note} style={styles.copy}>{note}</Text>)}
    </View>
  );
}

const styles = StyleSheet.create({
  back: { minHeight: 38, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: 'rgba(41,182,255,0.08)' },
  backLabel: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  copy: { color: colors.textMuted, fontSize: 12, lineHeight: 19 },
  verified: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm },
  verifiedDot: { color: colors.success, fontSize: 9 },
  verifiedLabel: { color: colors.success, fontSize: 8, fontWeight: '900', letterSpacing: 1.3 },
  captureFrame: { height: 280, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: '#050812', borderWidth: 1, borderColor: 'rgba(41,182,255,0.18)' },
  captureImage: { width: '100%', height: '100%' },
  placeholder: { alignItems: 'center', gap: spacing.md },
  placeholderGlyph: { color: colors.primary, fontSize: 52, textShadowColor: colors.primary, textShadowRadius: 16 },
  placeholderText: { color: colors.textDim, fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  actionRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  slotButton: { flex: 1, paddingHorizontal: spacing.sm },
  primaryAction: { marginTop: spacing.lg },
  footerNote: { color: colors.textDim, fontSize: 10, lineHeight: 16, textAlign: 'center', paddingHorizontal: spacing.lg },
  count: { color: colors.primary, fontSize: 26, fontWeight: '900' },
  comparisonMeta: { color: colors.purple, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginBottom: spacing.lg },
  divider: { height: 1, backgroundColor: 'rgba(147,164,195,0.14)', marginVertical: spacing.lg },
  scanBlock: { gap: spacing.sm },
  scanHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  scanLabel: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  scanDate: { color: colors.textDim, fontSize: 8, fontWeight: '800', letterSpacing: 0.8 },
  setupRow: { paddingVertical: spacing.md },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumbnailFrame: { width: '47%', aspectRatio: 0.72, overflow: 'hidden', borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(41,182,255,0.2)', backgroundColor: '#050812' },
  thumbnail: { width: '100%', height: '100%' },
  thumbnailLabel: { position: 'absolute', left: 5, bottom: 5, color: colors.text, backgroundColor: 'rgba(7,9,15,0.78)', paddingHorizontal: 5, paddingVertical: 3, fontSize: 6, fontWeight: '900', letterSpacing: 0.8 },
});
