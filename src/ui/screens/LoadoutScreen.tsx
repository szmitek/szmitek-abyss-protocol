import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { EXERCISES } from '../../data/exercises.ts';
import { EQUIPMENT_OPTIONS } from '../../data/equipmentOptions.ts';
import { draftLoadouts, validateLoadouts } from '../../domain/loadouts.ts';
import { EQUIPMENT, type Equipment, type MachineSetup, type TrainingLoadouts, type TrainingLocation, type UserProfile } from '../../domain/types.ts';
import { GlowButton } from '../components/GlowButton.tsx';
import { Screen } from '../components/Screen.tsx';
import { SystemPanel } from '../components/SystemPanel.tsx';
import { colors, radius, spacing } from '../theme.ts';

const MACHINES = EXERCISES.filter((exercise) => exercise.loading === 'stack');

export function LoadoutScreen({ profile, onSave, onBack }: { profile: UserProfile; onSave: (loadouts: TrainingLoadouts, setups: MachineSetup[]) => void; onBack: () => void }) {
  const [loadouts, setLoadouts] = useState(() => draftLoadouts(profile));
  const [location, setLocation] = useState<TrainingLocation>(profile.loadouts?.active ?? 'home');
  const [setups, setSetups] = useState(() => profile.machineSetups ?? []);
  const [machineExercise, setMachineExercise] = useState(MACHINES[0]!.id);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const toggle = (item: Equipment) => setLoadouts((current) => {
    const gear = current[location];
    return { ...current, [location]: item === EQUIPMENT.NONE ? [EQUIPMENT.NONE]
      : gear.includes(item) ? gear.filter((value) => value !== item) : [...gear, item] };
  });
  const addMachine = () => {
    const setup: MachineSetup = { id: `machine-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, exerciseId: machineExercise, location, label: name.trim() };
    try { validateLoadouts(loadouts, [...setups, setup]); }
    catch (e) { setError(e instanceof Error ? e.message : 'Check the machine setup.'); return; }
    setSetups((current) => current.some((s) => s.location === setup.location && s.exerciseId === setup.exerciseId && s.label.toLowerCase() === setup.label.toLowerCase()) ? current : [...current, setup]); setName(''); setError(null);
  };
  const save = () => {
    try { onSave({ ...loadouts, active: location }, setups); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to save loadout.'); }
  };
  return <Screen eyebrow="PLAYER ARMORY" title="Loadout" subtitle="Save separate equipment for home and gym. Activate the location you will train at next.">
    <GlowButton label="BACK" variant="secondary" onPress={onBack} />
    {!profile.loadouts ? <Text style={styles.copy}>Your existing equipment is shown under HOME for review. GYM starts with no equipment. Save to confirm both lists and activate the selected location.</Text> : null}
    <View style={styles.row}>{(['home', 'gym'] as const).map((value) => <Choice key={value} label={value.toUpperCase()} selected={location === value} onPress={() => { setLocation(value); setName(''); setError(null); }} />)}</View>
    <SystemPanel eyebrow="REGISTERED EQUIPMENT" title={`${location.toUpperCase()} LOADOUT`}>
      <Text style={styles.copy}>Only checked equipment is available here. Changing locations rebuilds upcoming sessions; completed work stays recorded.</Text>
      <View style={styles.list}>{EQUIPMENT_OPTIONS.map((option) => <Choice key={option.value} label={option.label} checkbox selected={option.value === EQUIPMENT.NONE ? loadouts[location].length === 1 : loadouts[location].includes(option.value)} onPress={() => toggle(option.value)} />)}</View>
    </SystemPanel>
    <SystemPanel eyebrow="MACHINE REGISTRY" title="Identify your setup">
      <Text style={styles.copy}>Create a separate entry for each machine and configuration. Include the gym, seat setting or attachments in its name. A new machine or changed setup needs a new entry. Registration does not add equipment to your loadout.</Text>
      <View style={styles.list}>{setups.filter((s) => s.location === location).map((s) => <View key={s.id} style={styles.saved}>
        <Text style={styles.label}>{s.label}</Text><Text style={styles.copy}>{EXERCISES.find((e) => e.id === s.exerciseId)?.name}</Text>
        <GlowButton label={`REMOVE ${s.label}`} variant="secondary" onPress={() => Alert.alert('Remove machine setup?', 'Previous set records will keep this name and identity. A replacement gets a new identity.', [{ text: 'CANCEL', style: 'cancel' }, { text: 'REMOVE', style: 'destructive', onPress: () => setSetups((current) => current.filter((item) => item.id !== s.id)) }])} />
      </View>)}</View>
      <View style={styles.list}>{MACHINES.map((e) => <Choice key={e.id} label={e.name} selected={machineExercise === e.id} onPress={() => setMachineExercise(e.id)} />)}</View>
      <TextInput accessibilityLabel="Machine and configuration name" value={name} onChangeText={setName} maxLength={60} placeholder="e.g. Gym A chest press / seat 3" placeholderTextColor={colors.textDim} style={styles.input} />
      <GlowButton label="ADD MACHINE SETUP" variant="secondary" disabled={!name.trim() || setups.length >= 50} onPress={addMachine} />
    </SystemPanel>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <Text style={styles.copy}>The selected location applies to upcoming plans until you switch it again. Finish or exit an active workout first.</Text>
    <GlowButton label={`SAVE & ACTIVATE ${location.toUpperCase()}`} onPress={save} />
  </Screen>;
}

function Choice({ label, selected, checkbox = false, onPress }: { label: string; selected: boolean; checkbox?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole={checkbox ? 'checkbox' : 'radio'} accessibilityState={{ checked: selected }} onPress={onPress} style={[styles.choice, selected && styles.selected]}><Text style={styles.label}>{selected ? '◆ ' : '◇ '}{label}</Text></Pressable>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, list: { gap: spacing.sm, marginVertical: spacing.md },
  copy: { color: colors.textMuted, fontSize: 12, lineHeight: 18 }, label: { color: colors.text, fontSize: 12, fontWeight: '800' },
  choice: { minHeight: 48, padding: spacing.md, justifyContent: 'center', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line },
  selected: { borderColor: colors.primary, backgroundColor: 'rgba(41,182,255,0.1)' }, saved: { gap: spacing.sm, paddingVertical: spacing.sm },
  input: { minHeight: 48, color: colors.text, borderColor: colors.line, borderWidth: 1, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.md },
  error: { color: colors.danger, fontSize: 12 },
});
