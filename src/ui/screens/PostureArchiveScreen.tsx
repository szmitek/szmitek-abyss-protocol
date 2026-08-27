import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { deletePosturePhotos, persistPosturePhotos, type PosturePhotoDraft, type PosturePhotoDraftMap } from '../../data/posturePhotos.ts';
import { createPostureScan, latestPostureComparison } from '../../domain/postureArchive.ts';
import { POSTURE_VIEWS, type PosturePhotoSource, type PostureScan, type PostureView, type UserProfile } from '../../domain/types.ts';
import { GlowButton } from '../components/GlowButton.tsx';
import { Screen } from '../components/Screen.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { colors, radius, spacing } from '../theme.ts';

const PENDING_VIEW_KEY = '@abyss-protocol/pending-posture-view';
const VIEW_LABELS: Record<PostureView, string> = { front: 'FRONT', side: 'SIDE', back: 'BACK' };
type Draft = Partial<PosturePhotoDraftMap>;

interface PostureArchiveScreenProps {
  profile: UserProfile;
  mode?: 'archive' | 'reassessment';
  onBack: () => void;
  onSave: (scan: PostureScan) => void;
  onDelete: (scanId: string) => void;
  onCaptureComplete?: () => void;
}

function completeDraft(draft: Draft): draft is PosturePhotoDraftMap {
  return POSTURE_VIEWS.every((view) => Boolean(draft[view]));
}

function isPostureView(value: string): value is PostureView {
  return POSTURE_VIEWS.some((view) => view === value);
}

function scanDate(scan: PostureScan): string {
  return new Date(scan.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

export function PostureArchiveScreen({ profile, mode = 'archive', onBack, onSave, onDelete, onCaptureComplete }: PostureArchiveScreenProps) {
  const [creating, setCreating] = useState(mode === 'reassessment');
  const [draft, setDraft] = useState<Draft>({});
  const [busy, setBusy] = useState(false);
  const comparison = useMemo(() => latestPostureComparison(profile.postureScans), [profile.postureScans]);
  const latest = profile.postureScans[0] ?? null;

  const applyAsset = useCallback((view: PostureView, asset: ImagePicker.ImagePickerAsset, source: PosturePhotoSource) => {
    setDraft((current) => ({
      ...current,
      [view]: { uri: asset.uri, width: asset.width, height: asset.height, source },
    }));
  }, []);

  useEffect(() => {
    let mounted = true;
    void Promise.all([AsyncStorage.getItem(PENDING_VIEW_KEY), ImagePicker.getPendingResultAsync()]).then(([pendingView, result]) => {
      if (!mounted) return;
      if (pendingView && isPostureView(pendingView) && result && 'canceled' in result && !result.canceled && result.assets?.[0]) {
        setCreating(true);
        applyAsset(pendingView, result.assets[0], 'camera');
      }
      void AsyncStorage.removeItem(PENDING_VIEW_KEY);
    }).catch(() => {
      void AsyncStorage.removeItem(PENDING_VIEW_KEY);
    });
    return () => { mounted = false; };
  }, [applyAsset]);

  const capture = async (view: PostureView) => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Camera access required', 'Allow camera access to record this local posture view. You can still choose an existing photo.');
        return;
      }
      await AsyncStorage.setItem(PENDING_VIEW_KEY, view);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        cameraType: ImagePicker.CameraType.back,
        allowsEditing: false,
        quality: 0.82,
      });
      if (!result.canceled && result.assets[0]) applyAsset(view, result.assets[0], 'camera');
    } catch {
      Alert.alert('Camera unavailable', 'The camera could not be opened. You can choose a photo from the library instead.');
    } finally {
      await AsyncStorage.removeItem(PENDING_VIEW_KEY);
    }
  };

  const chooseFromLibrary = async (view: PostureView) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo access required', 'Allow photo access to choose this posture view.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        allowsMultipleSelection: false,
        quality: 0.82,
      });
      if (!result.canceled && result.assets[0]) applyAsset(view, result.assets[0], 'library');
    } catch {
      Alert.alert('Library unavailable', 'The photo library could not be opened.');
    }
  };

  const save = async () => {
    if (!completeDraft(draft) || busy) return;
    setBusy(true);
    const now = new Date();
    const scanId = `posture-${now.getTime()}`;
    try {
      const photos = await persistPosturePhotos(scanId, draft, now.toISOString());
      onSave(createPostureScan(profile, photos, now, scanId));
      setDraft({});
      setCreating(false);
      onCaptureComplete?.();
    } catch {
      Alert.alert('Visual record failed', 'The photos could not be stored. Your existing archive was not changed.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = (scan: PostureScan) => {
    Alert.alert(
      'Delete visual record?',
      'All three photos in this scan will be permanently removed from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deletePosturePhotos(scan.id).then(() => onDelete(scan.id)).catch(() => {
              Alert.alert('Delete failed', 'The visual record could not be removed.');
            });
          },
        },
      ],
    );
  };

  const close = () => {
    if (creating) {
      setDraft({});
      setCreating(false);
    } else onBack();
  };

  return (
    <Screen
      eyebrow="SYSTEM // VISUAL RECORD"
      title={creating ? mode === 'reassessment' ? 'Final visual checkpoint' : 'Record baseline' : 'Posture Archive'}
      subtitle={creating ? mode === 'reassessment' ? 'Lock the end-of-cycle views before repeating Movement Analysis.' : 'Capture the same three views every cycle. Consistency matters more than posing.' : 'Private visual checkpoints for comparing Training Arc results.'}
      action={<Pressable accessibilityRole="button" onPress={close} style={styles.back}><Text style={styles.backLabel}>{creating ? 'CANCEL' : 'BACK'}</Text></Pressable>}
    >
      <SystemPanel eyebrow="LOCAL VAULT" title="Device-only record" accent="purple">
        <Text style={styles.copy}>The app does not upload or analyze these photos. Records stay inside this installation and are removed when the app is uninstalled.</Text>
        <View style={styles.verified}><Text style={styles.verifiedDot}>●</Text><Text style={styles.verifiedLabel}>CLOUD SYNC DISABLED</Text></View>
      </SystemPanel>

      {creating ? (
        <>
          <SystemPanel eyebrow="CAPTURE STANDARD" title="Repeatable setup">
            <Text style={styles.copy}>Full body visible · neutral stance · camera near waist height · same distance, lighting and fitted clothing. Do not force a “better” posture.</Text>
          </SystemPanel>
          {POSTURE_VIEWS.map((view) => (
            <CaptureSlot
              key={view}
              view={view}
              draft={draft[view]}
              onCamera={() => { void capture(view); }}
              onLibrary={() => { void chooseFromLibrary(view); }}
            />
          ))}
          <GlowButton label={busy ? 'SEALING RECORD...' : mode === 'reassessment' ? 'LOCK & CONTINUE TO MOVEMENT' : 'SEAL VISUAL RECORD'} disabled={!completeDraft(draft) || busy} onPress={() => { void save(); }} />
          <Text style={styles.footerNote}>All three views are required so later comparisons use the same evidence.</Text>
        </>
      ) : (
        <>
          <SystemPanel
            eyebrow="ARCHIVE STATUS"
            title={latest ? `${profile.postureScans.length} visual record${profile.postureScans.length === 1 ? '' : 's'}` : 'No baseline recorded'}
            trailing={<Text style={styles.count}>{String(profile.postureScans.length).padStart(2, '0')}</Text>}
          >
            <Text style={styles.copy}>{latest ? `Latest checkpoint: ${scanDate(latest)}${latest.trainingArcCycle ? ` · Training Arc ${latest.trainingArcCycle}` : ''}.` : 'Create a front, side and back baseline before judging physical changes.'}</Text>
            <GlowButton label="NEW VISUAL SCAN" onPress={() => setCreating(true)} style={styles.primaryAction} />
          </SystemPanel>

          {comparison ? (
            <SystemPanel eyebrow="ARC COMPARISON" title={`${comparison.previous.trainingArcCycle ? `Cycle ${comparison.previous.trainingArcCycle}` : 'Earlier'} → ${comparison.current.trainingArcCycle ? `Cycle ${comparison.current.trainingArcCycle}` : 'Current'}`} accent="purple">
              <Text style={styles.comparisonMeta}>{comparison.elapsedDays} DAYS BETWEEN RECORDS</Text>
              <ScanStrip scan={comparison.previous} label="BEFORE" />
              <View style={styles.divider} />
              <ScanStrip scan={comparison.current} label="CURRENT" />
            </SystemPanel>
          ) : latest ? (
            <SystemPanel eyebrow="BASELINE LOCKED" title={scanDate(latest)} accent="purple">
              <ScanStrip scan={latest} label={latest.trainingArcCycle ? `CYCLE ${latest.trainingArcCycle}` : 'BASELINE'} />
              <Text style={styles.copy}>Add another scan after a consistent training block to unlock side-by-side comparison.</Text>
            </SystemPanel>
          ) : null}

          {latest ? <GlowButton label="DELETE LATEST RECORD" variant="danger" onPress={() => confirmDelete(latest)} /> : null}
        </>
      )}
    </Screen>
  );
}

function CaptureSlot({ view, draft, onCamera, onLibrary }: { view: PostureView; draft: PosturePhotoDraft | undefined; onCamera: () => void; onLibrary: () => void }) {
  return (
    <SystemPanel eyebrow={`VIEW // ${VIEW_LABELS[view]}`} title={draft ? 'Image acquired' : 'Awaiting image'}>
      <View style={styles.captureFrame}>
        {draft ? <Image source={{ uri: draft.uri }} resizeMode="contain" style={styles.captureImage} /> : <View style={styles.placeholder}><Text style={styles.placeholderGlyph}>◇</Text><Text style={styles.placeholderText}>FULL BODY · {VIEW_LABELS[view]}</Text></View>}
      </View>
      <View style={styles.actionRow}>
        <GlowButton label={draft?.source === 'camera' ? 'RETAKE' : 'CAMERA'} variant="secondary" onPress={onCamera} style={styles.slotButton} />
        <GlowButton label={draft?.source === 'library' ? 'RESELECT' : 'LIBRARY'} variant="secondary" onPress={onLibrary} style={styles.slotButton} />
      </View>
    </SystemPanel>
  );
}

function ScanStrip({ scan, label }: { scan: PostureScan; label: string }) {
  return (
    <View style={styles.scanBlock}>
      <View style={styles.scanHeader}><Text style={styles.scanLabel}>{label}</Text><Text style={styles.scanDate}>{scanDate(scan)}</Text></View>
      <View style={styles.photoRow}>
        {POSTURE_VIEWS.map((view) => (
          <View key={view} style={styles.thumbnailFrame}>
            <Image source={{ uri: scan.photos[view].uri }} resizeMode="contain" style={styles.thumbnail} />
            <Text style={styles.thumbnailLabel}>{VIEW_LABELS[view]}</Text>
          </View>
        ))}
      </View>
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
  photoRow: { flexDirection: 'row', gap: spacing.sm },
  thumbnailFrame: { flex: 1, aspectRatio: 0.72, overflow: 'hidden', borderRadius: radius.sm, borderWidth: 1, borderColor: 'rgba(41,182,255,0.2)', backgroundColor: '#050812' },
  thumbnail: { width: '100%', height: '100%' },
  thumbnailLabel: { position: 'absolute', left: 5, bottom: 5, color: colors.text, backgroundColor: 'rgba(7,9,15,0.78)', paddingHorizontal: 5, paddingVertical: 3, fontSize: 6, fontWeight: '900', letterSpacing: 0.8 },
});
