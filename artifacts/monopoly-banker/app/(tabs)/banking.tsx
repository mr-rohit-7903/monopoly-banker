import React, { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useGameStore } from '@/store/gameStore';
import { PlayerSelector } from '@/components/PlayerSelector';
import { AmountInput } from '@/components/AmountInput';
import { formatMoney } from '@/utils/format';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BankingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const players = useGameStore(s => s.players);
  const settings = useGameStore(s => s.settings);
  const freeParkingBalance = useGameStore(s => s.freeParkingBalance);
  const {
    transfer, collectSalary, payIncomeTax, payLuxuryTax,
    addToFreeParking, collectFreeParking,
  } = useGameStore();

  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [fpAmount, setFpAmount] = useState('');
  const [selectedQuick, setSelectedQuick] = useState<string | null>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  function handleTransfer() {
    const amt = parseInt(amount);
    if (!amt || amt <= 0) return;
    if (fromId === toId) {
      Alert.alert('Invalid', 'From and To must be different');
      return;
    }
    const fromName = fromId ? players.find(p => p.id === fromId)?.name : 'Bank';
    const toName = toId ? players.find(p => p.id === toId)?.name : 'Bank';
    const ok = transfer(fromId, toId, amt, 'transfer', `${fromName} → ${toName}`);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAmount('');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Insufficient funds', 'The sender does not have enough money.');
    }
  }

  function handleQuickAction(action: 'salary' | 'income' | 'luxury') {
    if (!selectedQuick) {
      Alert.alert('Select player', 'Tap a player below first');
      return;
    }
    if (action === 'salary') collectSalary(selectedQuick);
    else if (action === 'income') {
      const ok = transfer(selectedQuick, null, settings.incomeTaxAmount, 'income_tax', 'Income Tax');
      if (!ok) { Alert.alert('Insufficient funds'); return; }
    } else {
      const ok = transfer(selectedQuick, null, settings.luxuryTaxAmount, 'luxury_tax', 'Luxury Tax');
      if (!ok) { Alert.alert('Insufficient funds'); return; }
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleFPAdd() {
    if (!selectedQuick) { Alert.alert('Select player', 'Tap a player first'); return; }
    const amt = parseInt(fpAmount);
    if (!amt || amt <= 0) return;
    addToFreeParking(selectedQuick, amt);
    setFpAmount('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleFPCollect() {
    if (!selectedQuick) { Alert.alert('Select player', 'Tap a player first'); return; }
    if (freeParkingBalance === 0) { Alert.alert('Empty', 'No money in Free Parking'); return; }
    collectFreeParking(selectedQuick);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Banking</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Transfer card */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Transfer Money</Text>
          <PlayerSelector
            players={players}
            selectedId={fromId}
            onSelect={setFromId}
            includeBank
            label="From"
          />
          <View style={styles.arrowRow}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={[styles.arrowBox, { backgroundColor: colors.muted }]}>
              <MaterialCommunityIcons name="arrow-down" size={18} color={colors.primary} />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>
          <PlayerSelector
            players={players}
            selectedId={toId}
            onSelect={setToId}
            includeBank
            label="To"
          />
          <AmountInput value={amount} onChange={setAmount} label="Amount" />
          <Pressable
            onPress={handleTransfer}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <MaterialCommunityIcons name="swap-horizontal" size={20} color={colors.primaryForeground} />
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Transfer</Text>
          </Pressable>
        </View>

        {/* Quick actions */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
          <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
            Select a player, then tap an action
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playerRow}>
            {players.map(p => {
              const sel = selectedQuick === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setSelectedQuick(sel ? null : p.id)}
                  style={({ pressed }) => [
                    styles.quickPlayerBtn,
                    {
                      backgroundColor: sel ? p.color + '22' : colors.muted,
                      borderColor: sel ? p.color : colors.border,
                      opacity: pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: p.color }]} />
                  <Text style={[styles.quickPlayerName, { color: sel ? p.color : colors.foreground }]} numberOfLines={1}>
                    {p.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.quickGrid}>
            {[
              { label: 'Collect Salary', sub: `+${formatMoney(settings.salaryAmount, settings.currency)}`, icon: 'cash-plus' as const, color: colors.success, action: () => handleQuickAction('salary') },
              { label: 'Income Tax', sub: `-${formatMoney(settings.incomeTaxAmount, settings.currency)}`, icon: 'file-document' as const, color: colors.warning, action: () => handleQuickAction('income') },
              { label: 'Luxury Tax', sub: `-${formatMoney(settings.luxuryTaxAmount, settings.currency)}`, icon: 'diamond' as const, color: colors.destructive, action: () => handleQuickAction('luxury') },
            ].map(item => (
              <Pressable
                key={item.label}
                onPress={item.action}
                style={({ pressed }) => [
                  styles.quickActionCard,
                  { backgroundColor: item.color + '18', borderColor: item.color + '44', opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
                <Text style={[styles.quickActionLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.quickActionSub, { color: item.color }]}>{item.sub}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Free Parking */}
        {settings.freeParking && (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.fpHeader}>
              <MaterialCommunityIcons name="car-clock" size={22} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Free Parking</Text>
              <View style={[styles.fpBadge, { backgroundColor: colors.accent + '22' }]}>
                <Text style={[styles.fpBadgeText, { color: colors.accent }]}>
                  {formatMoney(freeParkingBalance, settings.currency)}
                </Text>
              </View>
            </View>
            <AmountInput value={fpAmount} onChange={setFpAmount} placeholder="0" />
            <View style={styles.fpBtns}>
              <Pressable
                onPress={handleFPAdd}
                style={({ pressed }) => [
                  styles.fpBtn,
                  { backgroundColor: colors.warning + '22', borderColor: colors.warning + '44', opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <MaterialCommunityIcons name="cash-plus" size={18} color={colors.warning} />
                <Text style={[styles.fpBtnText, { color: colors.warning }]}>Add to Pot</Text>
              </Pressable>
              <Pressable
                onPress={handleFPCollect}
                style={({ pressed }) => [
                  styles.fpBtn,
                  { backgroundColor: colors.success + '22', borderColor: colors.success + '44', opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <MaterialCommunityIcons name="cash-check" size={18} color={colors.success} />
                <Text style={[styles.fpBtnText, { color: colors.success }]}>Collect All</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 28 },
  scroll: { padding: 16, gap: 16 },
  section: {
    borderRadius: 18, borderWidth: 1, padding: 18, gap: 14,
  },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  sectionHint: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: -8 },
  arrowRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: -4 },
  divider: { flex: 1, height: 1 },
  arrowBox: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: 12, gap: 8,
  },
  primaryBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  playerRow: { flexDirection: 'row', gap: 8 },
  quickPlayerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  quickPlayerName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, maxWidth: 80 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickActionCard: {
    flex: 1, minWidth: 100, padding: 14, borderRadius: 12,
    borderWidth: 1, alignItems: 'flex-start', gap: 6,
  },
  quickActionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  quickActionSub: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  fpHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fpBadge: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  fpBadgeText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  fpBtns: { flexDirection: 'row', gap: 10 },
  fpBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1,
  },
  fpBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
});
