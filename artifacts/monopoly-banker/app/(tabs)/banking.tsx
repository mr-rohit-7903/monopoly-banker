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
import { CardDrawModal, CHANCE_COLOR, COMMUNITY_COLOR } from '@/components/CardDrawModal';
import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS, MonopolyCard } from '@/constants/cards';
import { formatMoney } from '@/utils/format';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function BankingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const players = useGameStore(s => s.players);
  const settings = useGameStore(s => s.settings);
  const { transfer, collectSalary } = useGameStore();

  // Transfer state
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');

  // Quick actions player
  const [quickPlayerId, setQuickPlayerId] = useState<string | null>(null);

  // Card draw state
  const [cardDrawerId, setCardDrawerId] = useState<string | null>(null);
  const [drawnCard, setDrawnCard] = useState<MonopolyCard | null>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  // ── Transfer ─────────────────────────────────────────────────────────────
  function handleTransfer() {
    const amt = parseInt(amount);
    if (!amt || amt <= 0) return;
    if (fromId === toId) { Alert.alert('Invalid', 'From and To must be different'); return; }
    const fromName = fromId ? players.find(p => p.id === fromId)?.name : 'Bank';
    const toName   = toId   ? players.find(p => p.id === toId)?.name   : 'Bank';
    const ok = transfer(fromId, toId, amt, 'transfer', `${fromName} → ${toName}`);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAmount('');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Insufficient funds', 'The sender does not have enough money.');
    }
  }

  // ── Quick actions ─────────────────────────────────────────────────────────
  function handleQuick(action: 'salary' | 'income' | 'luxury') {
    if (!quickPlayerId) { Alert.alert('Select a player first'); return; }
    if (action === 'salary') {
      collectSalary(quickPlayerId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      const amt  = action === 'income' ? settings.incomeTaxAmount : settings.luxuryTaxAmount;
      const type = action === 'income' ? 'income_tax' : ('luxury_tax' as const);
      const label = action === 'income' ? 'Income Tax' : 'Luxury Tax';
      const ok = transfer(quickPlayerId, null, amt, type, label);
      if (ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('Insufficient funds');
      }
    }
  }

  // ── Card draw ─────────────────────────────────────────────────────────────
  function handleDraw(deck: 'chance' | 'community') {
    if (!cardDrawerId) { Alert.alert('Select a player first', 'Tap a player above then draw a card'); return; }
    const card = pickRandom(deck === 'chance' ? CHANCE_CARDS : COMMUNITY_CHEST_CARDS);
    setDrawnCard(card);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <CardDrawModal
        card={drawnCard}
        drawerId={cardDrawerId}
        onClose={() => setDrawnCard(null)}
      />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Banking</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* ── Transfer money ── */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Transfer Money</Text>
          <PlayerSelector players={players} selectedId={fromId} onSelect={setFromId} includeBank label="From" />
          <View style={styles.arrowRow}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <View style={[styles.arrowBox, { backgroundColor: colors.muted }]}>
              <MaterialCommunityIcons name="arrow-down" size={18} color={colors.primary} />
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
          </View>
          <PlayerSelector players={players} selectedId={toId} onSelect={setToId} includeBank label="To" />
          <AmountInput value={amount} onChange={setAmount} label="Amount" />
          <Pressable
            onPress={handleTransfer}
            style={({ pressed }) => [styles.primaryBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <MaterialCommunityIcons name="swap-horizontal" size={20} color={colors.primaryForeground} />
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground }]}>Transfer</Text>
          </Pressable>
        </View>

        {/* ── Quick actions ── */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
          <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>Select a player then tap an action</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playerRow}>
            {players.map(p => {
              const sel = quickPlayerId === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setQuickPlayerId(sel ? null : p.id)}
                  style={({ pressed }) => [
                    styles.playerChip,
                    { backgroundColor: sel ? p.color + '22' : colors.muted, borderColor: sel ? p.color : colors.border, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: p.color }]} />
                  <Text style={[styles.playerChipText, { color: sel ? p.color : colors.foreground }]} numberOfLines={1}>{p.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.quickGrid}>
            {([
              { label: 'Collect Salary', sub: `+${formatMoney(settings.salaryAmount, settings.currency)}`, icon: 'cash-plus' as const, color: colors.success, action: () => handleQuick('salary') },
              { label: 'Income Tax',     sub: `-${formatMoney(settings.incomeTaxAmount, settings.currency)}`, icon: 'file-document' as const, color: colors.warning, action: () => handleQuick('income') },
              { label: 'Luxury Tax',     sub: `-${formatMoney(settings.luxuryTaxAmount, settings.currency)}`, icon: 'diamond' as const, color: colors.destructive, action: () => handleQuick('luxury') },
            ] as const).map(item => (
              <Pressable
                key={item.label}
                onPress={item.action}
                style={({ pressed }) => [
                  styles.quickCard,
                  { backgroundColor: item.color + '18', borderColor: item.color + '44', opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <MaterialCommunityIcons name={item.icon} size={22} color={item.color} />
                <Text style={[styles.quickCardLabel, { color: colors.foreground }]}>{item.label}</Text>
                <Text style={[styles.quickCardSub, { color: item.color }]}>{item.sub}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Card draw ── */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Section header */}
          <View style={styles.cardSectionHeader}>
            <MaterialCommunityIcons name="cards" size={22} color={colors.foreground} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Draw a Card</Text>
          </View>
          <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
            Select the player who drew, then tap their deck
          </Text>

          {/* Player selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playerRow}>
            {players.length === 0 && (
              <Text style={[styles.noPlayersHint, { color: colors.mutedForeground }]}>No players yet</Text>
            )}
            {players.map(p => {
              const sel = cardDrawerId === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setCardDrawerId(sel ? null : p.id)}
                  style={({ pressed }) => [
                    styles.playerChip,
                    { backgroundColor: sel ? p.color + '22' : colors.muted, borderColor: sel ? p.color : colors.border, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: p.color }]} />
                  <Text style={[styles.playerChipText, { color: sel ? p.color : colors.foreground }]} numberOfLines={1}>{p.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Deck buttons */}
          <View style={styles.deckRow}>
            {/* Chance */}
            <Pressable
              onPress={() => handleDraw('chance')}
              style={({ pressed }) => [
                styles.deckBtn,
                { backgroundColor: CHANCE_COLOR, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.deckBtnEmoji}>🎲</Text>
              <Text style={styles.deckBtnTitle}>Chance</Text>
              <Text style={styles.deckBtnSub}>16 cards</Text>
            </Pressable>

            {/* Community Chest */}
            <Pressable
              onPress={() => handleDraw('community')}
              style={({ pressed }) => [
                styles.deckBtn,
                { backgroundColor: COMMUNITY_COLOR, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.deckBtnEmoji}>🏦</Text>
              <Text style={styles.deckBtnTitle}>Community Chest</Text>
              <Text style={styles.deckBtnSub}>16 cards</Text>
            </Pressable>
          </View>

          {/* Card type legend */}
          <View style={styles.legend}>
            {[
              { emoji: '💰', label: 'Collect from bank' },
              { emoji: '💸', label: 'Pay to bank' },
              { emoji: '🏠', label: 'Repair bill' },
              { emoji: '🎂', label: 'Collect from players' },
              { emoji: '🚗', label: 'Move token' },
            ].map(item => (
              <View key={item.label} style={styles.legendRow}>
                <Text style={styles.legendEmoji}>{item.emoji}</Text>
                <Text style={[styles.legendLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 28 },
  scroll: { padding: 16, gap: 16 },

  section: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 14 },
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
  playerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  playerChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 14, maxWidth: 80 },
  noPlayersHint: { fontFamily: 'Inter_400Regular', fontSize: 14, paddingVertical: 8 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard: {
    flex: 1, minWidth: 100, padding: 14, borderRadius: 12,
    borderWidth: 1, alignItems: 'flex-start', gap: 6,
  },
  quickCardLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  quickCardSub: { fontFamily: 'Inter_700Bold', fontSize: 15 },

  // Card draw
  cardSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  deckRow: { flexDirection: 'row', gap: 12 },
  deckBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 12,
    borderRadius: 18,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  deckBtnEmoji: { fontSize: 36 },
  deckBtnTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    marginTop: 4,
  },
  deckBtnSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
  },

  legend: { gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendEmoji: { fontSize: 15, width: 22 },
  legendLabel: { fontFamily: 'Inter_400Regular', fontSize: 13 },
});
