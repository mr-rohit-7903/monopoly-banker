import React, { useState } from 'react';
import {
  Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useGameStore } from '@/store/gameStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DarkMode = 'light' | 'dark' | 'system';

function SettingRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  const colors = useColors();
  return (
    <View style={[
      styles.settingRow,
      !last && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
    ]}>
      <Text style={[styles.settingLabel, { color: colors.foreground }]}>{label}</Text>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const palette = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const settings = useGameStore(s => s.settings);
  const transactions = useGameStore(s => s.transactions);
  const gameStarted = transactions.length > 0;
  const { updateSettings, resetGame } = useGameStore();
  const topPad = Platform.OS === 'web' ? 16 : insets.top;

  const [startingMoneyStr, setStartingMoneyStr] = useState(settings.startingMoney.toString());
  const [salaryStr, setSalaryStr] = useState(settings.salaryAmount.toString());
  const [incomeTaxStr, setIncomeTaxStr] = useState(settings.incomeTaxAmount.toString());
  const [luxuryTaxStr, setLuxuryTaxStr] = useState(settings.luxuryTaxAmount.toString());
  const [showResetModal, setShowResetModal] = useState(false);

  function handleReset() {
    resetGame();
    setShowResetModal(false);
    router.back();
  }

  const DARK_MODES: { value: DarkMode; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  const VERSIONS = [
    { value: 'US', label: 'US ($)' },
    { value: 'IN', label: 'India (₹)' },
  ];

  function NumInput({ value, onChange, onBlur }: { value: string; onChange: (v: string) => void; onBlur?: () => void }) {
    return (
      <TextInput
        style={[styles.numInput, { color: palette.foreground, borderColor: palette.border, backgroundColor: palette.muted }]}
        value={value}
        onChangeText={t => onChange(t.replace(/[^0-9]/g, ''))}
        onBlur={onBlur}
        keyboardType="numeric"
        selectionColor={palette.primary}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      {/* ── Reset Game confirmation modal ── */}
      <Modal
        visible={showResetModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResetModal(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowResetModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.modalBody}>
              <MaterialCommunityIcons name="restart" size={32} color={palette.destructive} />
              <Text style={[styles.modalTitle, { color: palette.foreground }]}>
                Reset Game?
              </Text>
              <Text style={[styles.modalSub, { color: palette.mutedForeground }]}>
                This will remove all players, transactions, and property ownerships. This cannot be undone.
              </Text>
              <View style={styles.modalBtns}>
                <Pressable
                  onPress={() => setShowResetModal(false)}
                  style={({ pressed }) => [
                    styles.modalCancel,
                    { borderColor: palette.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[styles.modalCancelText, { color: palette.foreground }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleReset}
                  style={({ pressed }) => [
                    styles.modalConfirm,
                    { backgroundColor: palette.destructive, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Text style={styles.modalConfirmText}>Reset</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: palette.background, borderBottomColor: palette.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={palette.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.foreground }]}>Settings</Text>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text style={[styles.doneText, { color: palette.primary }]}>Done</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 30 }]}>
        {/* Appearance */}
        <Text style={[styles.groupLabel, { color: palette.mutedForeground }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <SettingRow label="Theme">
            <View style={styles.segmented}>
              {DARK_MODES.map(m => (
                <Pressable
                  key={m.value}
                  onPress={() => updateSettings({ darkMode: m.value })}
                  style={[
                    styles.segment,
                    { backgroundColor: settings.darkMode === m.value ? palette.primary : palette.muted },
                  ]}
                >
                  <Text style={[styles.segmentText, { color: settings.darkMode === m.value ? palette.primaryForeground : palette.foreground }]}>
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </SettingRow>
          <SettingRow label="Version" last>
            <View style={styles.chipRow}>
              {VERSIONS.map(v => (
                <Pressable
                  key={v.value}
                  disabled={gameStarted}
                  onPress={() => updateSettings({ version: v.value as 'US' | 'IN' })}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: settings.version === v.value ? palette.primary + '22' : palette.muted,
                      borderColor: settings.version === v.value ? palette.primary : palette.border,
                      opacity: gameStarted && settings.version !== v.value ? 0.3 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: settings.version === v.value ? palette.primary : palette.foreground }]}>
                    {v.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </SettingRow>
        </View>

        {/* Game rules */}
        <Text style={[styles.groupLabel, { color: palette.mutedForeground }]}>Game Rules</Text>
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <SettingRow label="Starting Money">
            <NumInput value={startingMoneyStr} onChange={setStartingMoneyStr} onBlur={() => {
              const v = parseInt(startingMoneyStr);
              if (!isNaN(v)) updateSettings({ startingMoney: v });
            }} />
          </SettingRow>
          <SettingRow label="Salary (Pass Go)">
            <NumInput value={salaryStr} onChange={setSalaryStr} onBlur={() => {
              const v = parseInt(salaryStr);
              if (!isNaN(v)) updateSettings({ salaryAmount: v });
            }} />
          </SettingRow>
          <SettingRow label="Income Tax">
            <NumInput value={incomeTaxStr} onChange={setIncomeTaxStr} onBlur={() => {
              const v = parseInt(incomeTaxStr);
              if (!isNaN(v)) updateSettings({ incomeTaxAmount: v });
            }} />
          </SettingRow>
          <SettingRow label="Luxury Tax" last>
            <NumInput value={luxuryTaxStr} onChange={setLuxuryTaxStr} onBlur={() => {
              const v = parseInt(luxuryTaxStr);
              if (!isNaN(v)) updateSettings({ luxuryTaxAmount: v });
            }} />
          </SettingRow>
        </View>

        {/* Danger zone */}
        <Text style={[styles.groupLabel, { color: palette.mutedForeground }]}>Danger Zone</Text>
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Pressable
            onPress={() => setShowResetModal(true)}
            style={({ pressed }) => [styles.dangerRow, { opacity: pressed ? 0.7 : 1 }]}
          >
            <MaterialCommunityIcons name="restart" size={20} color={palette.destructive} />
            <Text style={[styles.dangerText, { color: palette.destructive }]}>Reset Game</Text>
          </Pressable>
        </View>

        <Text style={[styles.version, { color: palette.mutedForeground }]}>
          Monopoly Banker · Unofficial companion app
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  doneText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  scroll: { padding: 20, gap: 10 },
  groupLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 10, marginBottom: 2 },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13, gap: 12,
  },
  settingLabel: { fontFamily: 'Inter_500Medium', fontSize: 16, flex: 1 },
  numInput: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    fontFamily: 'Inter_600SemiBold', fontSize: 15, textAlign: 'right', minWidth: 80,
  },
  segmented: { flexDirection: 'row', gap: 4 },
  segment: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  segmentText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1, justifyContent: 'flex-end' },
  chip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  dangerText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  version: { fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center', marginTop: 10 },
  // Reset modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: { width: '100%', borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  modalBody: { padding: 24, alignItems: 'center', gap: 12 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, textAlign: 'center' },
  modalSub: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8, width: '100%' },
  modalCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, alignItems: 'center',
  },
  modalCancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  modalConfirm: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalConfirmText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' },
});
