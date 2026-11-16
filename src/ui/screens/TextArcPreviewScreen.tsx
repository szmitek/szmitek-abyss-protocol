import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { WeeklyReviewInput } from '../../domain/aiContracts.ts';
import { prepareTextArcPreview } from '../../domain/textArcPreview.ts';
import { GlowButton } from '../components/GlowButton.tsx';
import { Screen } from '../components/Screen.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { colors, spacing } from '../theme.ts';

export function TextArcPreviewScreen({ input, onBack }: { input: WeeklyReviewInput; onBack: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const result = useMemo(() => {
    try { return { preview: prepareTextArcPreview(input), error: null }; }
    catch { return { preview: null, error: 'Cannot prepare a safe text-only snapshot for this arc.' }; }
  }, [input]);
  const preview = result.preview;
  const data = preview?.input;

  return <Screen eyebrow="OFFLINE · NO NETWORK REQUEST" title="Text AI Data Preview" subtitle="Review the exact proposed text payload before a future AI service is enabled.">
    <GlowButton label="BACK TO ARC REVIEW" variant="secondary" onPress={onBack} />
    <SystemPanel eyebrow="PREVIEW ONLY" title="Nothing is sent" accent="purple">
      <Text style={styles.copy}>This screen does not ask for consent, reserve money, call an AI provider or modify your training plan. All data remains on your device.</Text>
      <Text style={styles.warning}>AI analysis remains disabled. Provider, maximum price and retention policy have not been configured.</Text>
    </SystemPanel>
    {result.error || !data || !preview ? <Text accessibilityRole="alert" style={styles.warning}>{result.error ?? 'Review unavailable.'} Return to your local Arc Review; training is unaffected.</Text> : <>
      <SystemPanel eyebrow="SELECTED SNAPSHOT" title={'Arc ' + data.arcContext!.cycleNumber}>
        <Info label="TRAINING WINDOW" value={data.period.from + ' – ' + data.period.to} />
        <Info label="TIME ZONE" value={data.period.timeZone} />
        <Info label="ARC STATE" value={data.arcContext!.state.replaceAll('_', ' ')} />
        <Info label="REQUEST ID" value={data.requestId} />
        <Info label="UTF-8 PAYLOAD SIZE" value={preview.byteLength + ' bytes (max 262144)'} />
      </SystemPanel>
      <SystemPanel eyebrow="DATA CATEGORIES" title="Included in this draft">
        <Info label="TRAINING SESSIONS" value={String(data.training.length)} />
        <Info label="EXERCISE EXPOSURES" value={String(data.exerciseExposures.length)} />
        <Info label="CALCULATED FACTS" value={String(data.facts.length)} />
        <Info label="WELLBEING ENTRIES" value={String(data.wellbeing.length)} />
        <Info label="MOVEMENT TESTS" value={String(data.tests.records.length)} />
        <Info label="BODY MEASUREMENTS" value={String(data.body.records.length)} />
        <Text style={styles.copy}>Actual recorded sets, effort, goals, current equipment, movement results and any recorded wellbeing values can be included. Expand the full JSON below to inspect their exact contents, including personal notes.</Text>
      </SystemPanel>
      <SystemPanel eyebrow="PRIVACY SCOPE" title="Excluded from this draft">
        <Text style={styles.copy}>No image pixels, local photo paths or photo identifiers. The photo manifest is empty. No previous AI conclusions, device credentials or API keys are included.</Text>
        <Text style={styles.copy}>This is a text-only preview. Your local posture archive is not accessed.</Text>
      </SystemPanel>
      <SystemPanel eyebrow="EXACT CANDIDATE REQUEST" title="Inspect complete JSON">
        <Text style={styles.copy}>The following string is the canonical candidate request. It is not encrypted, saved or transmitted by this screen. It will be regenerated if the underlying arc data changes.</Text>
        <GlowButton
          label={expanded ? 'HIDE COMPLETE JSON' : 'SHOW COMPLETE JSON'}
          variant="secondary"
          onPress={() => setExpanded((value) => !value)}
        />
        {expanded ? <View style={styles.jsonBox}><Text selectable style={styles.json}>{preview.canonicalJson}</Text></View> : null}
      </SystemPanel>
      <SystemPanel eyebrow="FUTURE ACTIVATION GATE" title="Submission unavailable" accent="purple">
        <Text style={styles.warning}>A real provider, final privacy/retention terms, a verified price quote and explicit consent will all be required before any text is sent. This preview cannot authorize a future paid request.</Text>
      </SystemPanel>
    </>}
  </Screen>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <View style={styles.row}><Text style={styles.key}>{label}</Text><Text selectable style={styles.value}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  row: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: 'rgba(147,164,195,0.12)' },
  key: { color: colors.textDim, fontSize: 10, letterSpacing: 0.7, fontWeight: '900', marginBottom: 3 },
  value: { color: colors.text, fontSize: 13, lineHeight: 20 },
  copy: { color: colors.textMuted, fontSize: 12, lineHeight: 20, marginBottom: spacing.md },
  warning: { color: colors.warning, fontSize: 12, lineHeight: 20 },
  jsonBox: { marginTop: spacing.md, padding: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.backgroundRaised },
  json: { color: colors.textMuted, fontSize: 11, lineHeight: 17, fontFamily: 'monospace' },
});
