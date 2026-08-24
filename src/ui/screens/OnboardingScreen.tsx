import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { EQUIPMENT, GOALS, type Equipment, type ExperienceLevel, type Goal, type OnboardingAnswers, type UserProfile } from '../../domain/types.ts';
import { GlowButton } from '../components/GlowButton.tsx';
import { ProgressBar } from '../components/ProgressBar.tsx';
import { colors, radius, spacing } from '../theme.ts';

interface OnboardingScreenProps {
  onComplete: (answers: OnboardingAnswers) => void;
}

const GOAL_OPTIONS: { value: Goal; label: string; detail: string }[] = [
  { value: GOALS.GENERAL, label: 'GENERAL FITNESS', detail: 'Balanced real-world capability' },
  { value: GOALS.STRENGTH, label: 'BUILD STRENGTH', detail: 'Develop controlled power' },
  { value: GOALS.MUSCLE, label: 'BUILD MUSCLE', detail: 'Progressive bodyweight volume' },
  { value: GOALS.FAT_LOSS, label: 'FAT LOSS', detail: 'Conditioning and consistency' },
  { value: GOALS.CONDITIONING, label: 'CONDITIONING', detail: 'Improve work capacity' },
  { value: GOALS.MOBILITY, label: 'MOBILITY', detail: 'Move better and recover' },
];

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string; detail: string }[] = [
  { value: 'beginner', label: 'INITIATE', detail: 'Starting or returning after a break' },
  { value: 'intermediate', label: 'HUNTER', detail: 'Training consistently for 6+ months' },
  { value: 'advanced', label: 'VANGUARD', detail: 'Strong technique and work capacity' },
];

const DURATION_OPTIONS: UserProfile['workoutDuration'][] = [10, 15, 20, 30, 45, 60];
const FREQUENCY_OPTIONS: UserProfile['workoutsPerWeek'][] = [2, 3, 4, 5, 6, 7];
const EQUIPMENT_OPTIONS: { value: Equipment; label: string }[] = [
  { value: EQUIPMENT.NONE, label: 'NO EQUIPMENT' },
  { value: EQUIPMENT.MAT, label: 'MAT' },
  { value: EQUIPMENT.DUMBBELLS, label: 'DUMBBELLS' },
  { value: EQUIPMENT.BANDS, label: 'BANDS' },
  { value: EQUIPMENT.PULL_UP_BAR, label: 'PULL-UP BAR' },
  { value: EQUIPMENT.BENCH, label: 'BENCH' },
  { value: EQUIPMENT.KETTLEBELL, label: 'KETTLEBELL' },
];

const STEP_META = [
  { code: 'DIRECTIVE 01', title: 'Choose your objective', subtitle: 'The System will tune load, exercise mix, and progression.' },
  { code: 'DIRECTIVE 02', title: 'Declare current level', subtitle: 'Choose honestly. Difficulty will evolve from completed sessions.' },
  { code: 'DIRECTIVE 03', title: 'Set mission duration', subtitle: 'A shorter protocol completed consistently beats an abandoned one.' },
  { code: 'DIRECTIVE 04', title: 'Set weekly rhythm', subtitle: 'Scheduled recovery days protect your streak.' },
  { code: 'FINAL DIRECTIVE', title: 'Register equipment', subtitle: 'This is a hard safety constraint. The System cannot use unregistered gear.' },
] as const;

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal>(GOALS.GENERAL);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner');
  const [workoutDuration, setWorkoutDuration] = useState<UserProfile['workoutDuration']>(20);
  const [workoutsPerWeek, setWorkoutsPerWeek] = useState<UserProfile['workoutsPerWeek']>(4);
  const [equipment, setEquipment] = useState<Equipment[]>([EQUIPMENT.NONE]);

  const toggleEquipment = (value: Equipment) => {
    if (value === EQUIPMENT.NONE) {
      setEquipment([EQUIPMENT.NONE]);
      return;
    }
    setEquipment((current) => {
      const withoutNone = current.filter((item) => item !== EQUIPMENT.NONE);
      return withoutNone.includes(value) ? withoutNone.filter((item) => item !== value) : [...withoutNone, value];
    });
  };

  const advance = () => {
    if (step < 4) setStep((current) => current + 1);
    else onComplete({ goal, experienceLevel, workoutDuration, workoutsPerWeek, availableEquipment: equipment.length ? equipment : [EQUIPMENT.NONE] });
  };

  return (
    <View style={styles.root}>
      <View style={styles.aura} />
      <View style={styles.top}>
        <Text style={styles.system}>ABYSS PROTOCOL</Text>
        <Text style={styles.step}>{step + 1} / 5</Text>
      </View>
      <ProgressBar progress={(step + 1) / 5} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.sigil}><Text style={styles.sigilText}>◇</Text></View>
        <Text style={styles.code}>{STEP_META[step]?.code}</Text>
        <Text style={styles.title}>{STEP_META[step]?.title}</Text>
        <Text style={styles.subtitle}>{STEP_META[step]?.subtitle}</Text>

        <View style={styles.options}>
          {step === 0 && GOAL_OPTIONS.map((option) => <Choice key={option.value} label={option.label} detail={option.detail} selected={goal === option.value} onPress={() => setGoal(option.value)} />)}
          {step === 1 && EXPERIENCE_OPTIONS.map((option) => <Choice key={option.value} label={option.label} detail={option.detail} selected={experienceLevel === option.value} onPress={() => setExperienceLevel(option.value)} />)}
          {step === 2 && <View style={styles.grid}>{DURATION_OPTIONS.map((value) => <CompactChoice key={value} label={`${value} MIN`} selected={workoutDuration === value} onPress={() => setWorkoutDuration(value)} />)}</View>}
          {step === 3 && <View style={styles.grid}>{FREQUENCY_OPTIONS.map((value) => <CompactChoice key={value} label={value === 7 ? 'DAILY' : `${value} DAYS`} selected={workoutsPerWeek === value} onPress={() => setWorkoutsPerWeek(value)} />)}</View>}
          {step === 4 && EQUIPMENT_OPTIONS.map((option) => <Choice key={option.value} label={option.label} detail={option.value === EQUIPMENT.NONE ? 'Pure bodyweight protocol' : 'Add to available loadout'} selected={equipment.includes(option.value)} onPress={() => toggleEquipment(option.value)} />)}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        {step > 0 ? <GlowButton label="BACK" variant="secondary" onPress={() => setStep((current) => current - 1)} style={styles.back} /> : null}
        <GlowButton label={step === 4 ? 'AWAKEN SYSTEM' : 'CONTINUE'} onPress={advance} style={styles.next} />
      </View>
    </View>
  );
}

function Choice({ label, detail, selected, onPress }: { label: string; detail: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={({ pressed }) => [styles.choice, selected && styles.choiceSelected, pressed && styles.pressed]}>
      <View style={[styles.diamond, selected && styles.diamondSelected]} />
      <View style={styles.choiceCopy}>
        <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>{label}</Text>
        <Text style={styles.choiceDetail}>{detail}</Text>
      </View>
      <Text style={[styles.mark, selected && styles.markSelected]}>{selected ? 'ACTIVE' : '○'}</Text>
    </Pressable>
  );
}

function CompactChoice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={onPress} style={({ pressed }) => [styles.compact, selected && styles.choiceSelected, pressed && styles.pressed]}><Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingTop: 56 },
  aura: { position: 'absolute', width: 420, height: 420, borderRadius: 210, top: -260, alignSelf: 'center', backgroundColor: colors.blue, opacity: 0.13 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  system: { color: colors.primary, fontSize: 11, fontWeight: '900', letterSpacing: 2.5 },
  step: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  scroll: { paddingTop: spacing.xxl, paddingBottom: 130 },
  sigil: { width: 66, height: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.lineStrong, backgroundColor: 'rgba(41, 182, 255, 0.06)', marginBottom: spacing.xl },
  sigilText: { color: colors.primary, fontSize: 36, textShadowColor: colors.primary, textShadowRadius: 12 },
  code: { color: colors.purple, fontSize: 10, fontWeight: '900', letterSpacing: 2.5, marginBottom: spacing.sm },
  title: { color: colors.text, fontSize: 31, lineHeight: 36, fontWeight: '900', letterSpacing: -0.8 },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: spacing.md, maxWidth: 360 },
  options: { marginTop: spacing.xxl, gap: spacing.md },
  choice: { minHeight: 74, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(147, 164, 195, 0.18)', backgroundColor: colors.panel, padding: spacing.md, flexDirection: 'row', alignItems: 'center' },
  choiceSelected: { borderColor: colors.lineStrong, backgroundColor: 'rgba(18, 125, 255, 0.12)', shadowColor: colors.primary, shadowOpacity: 0.15, shadowRadius: 12 },
  pressed: { opacity: 0.76 },
  diamond: { width: 10, height: 10, borderWidth: 1, borderColor: colors.textDim, transform: [{ rotate: '45deg' }], marginHorizontal: spacing.sm },
  diamondSelected: { borderColor: colors.primary, backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.8, shadowRadius: 7 },
  choiceCopy: { flex: 1, marginLeft: spacing.sm },
  choiceLabel: { color: colors.text, fontSize: 13, fontWeight: '800', letterSpacing: 0.7 },
  choiceLabelSelected: { color: colors.primary },
  choiceDetail: { color: colors.textMuted, fontSize: 12, marginTop: 5 },
  mark: { color: colors.textDim, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  markSelected: { color: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  compact: { width: '47%', minHeight: 72, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(147, 164, 195, 0.18)', backgroundColor: colors.panel },
  footer: { position: 'absolute', bottom: 28, left: spacing.lg, right: spacing.lg, flexDirection: 'row', gap: spacing.md },
  back: { flex: 0.38 },
  next: { flex: 1 },
});
