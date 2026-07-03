import React, { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform, Pressable,
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

// ── Ticket definitions ────────────────────────────────────────────────────────
interface TicketPrize {
  multiplier: number;
  label: string;
  probability: number;
}
interface TicketDef {
  id: string;
  label: string;
  subtitle: string;
  price: number;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  accentColor: string;
  prizes: TicketPrize[];
}

const TICKETS: TicketDef[] = [
  {
    id: 'chance',
    label: 'Chance Card',
    subtitle: 'Quick draw, modest stakes',
    price: 50,
    icon: 'cards-playing-outline',
    accentColor: '#1E88E5',
    prizes: [
      { multiplier: 0,  label: 'No luck this time',  probability: 0.45 },
      { multiplier: 1,  label: 'Break even!',         probability: 0.30 },
      { multiplier: 2,  label: 'Double up!',           probability: 0.20 },
      { multiplier: 5,  label: '🎯 Jackpot!',          probability: 0.05 },
    ],
  },
  {
    id: 'chest',
    label: 'Community Chest',
    subtitle: 'Community picks a winner',
    price: 100,
    icon: 'gift-outline',
    accentColor: '#FB8C00',
    prizes: [
      { multiplier: 0,  label: 'No luck this time',   probability: 0.40 },
      { multiplier: 1,  label: 'Break even!',          probability: 0.25 },
      { multiplier: 2,  label: 'Double up!',            probability: 0.25 },
      { multiplier: 5,  label: '🎯 Jackpot!',           probability: 0.10 },
    ],
  },
  {
    id: 'lottery',
    label: 'Grand Lottery',
    subtitle: 'High risk, massive reward',
    price: 200,
    icon: 'ticket-outline',
    accentColor: '#8E24AA',
    prizes: [
      { multiplier: 0,  label: 'No luck this time',   probability: 0.35 },
      { multiplier: 1,  label: 'Break even!',          probability: 0.25 },
      { multiplier: 2,  label: 'Double up!',            probability: 0.25 },
      { multiplier: 10, label: '🏆 MEGA Jackpot!',     probability: 0.15 },
    ],
  },
];

function pickPrize(prizes: TicketPrize[]): TicketPrize {
  const roll = Math.random();
  let cumulative = 0;
  for (const prize of prizes) {
    cumulative += prize.probability;
    if (roll < cumulative) return prize;
  }
  return prizes[prizes.length - 1];
}

// ── Ticket result modal ───────────────────────────────────────────────────────
interface TicketResult {
  ticket: TicketDef;
  prize: TicketPrize;
  winAmount: number;
  currency: string;
}

function TicketResultModal({
  result, onClose,
}: { result: TicketResult | null; onClose: () => void }) {
  const colors = useColors();
  if (!result) return null;

  const won = result.prize.multiplier > 0;
  const isJackpot = result.prize.multiplier >= 5;

  return (
    <Modal visible={!!result} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.resultModal, { backgroundColor: colors.card, borderColor: result.ticket.accentColor }]}>
          {/* Ticket header strip */}
          <View style={[styles.resultStrip, { backgroundColor: result.ticket.accentColor }]}>
            <MaterialCommunityIcons name={result.ticket.icon} size={28} color="#fff" />
            <Text style={styles.resultStripLabel}>{result.ticket.label}</Text>
          </View>

          <View style={styles.resultBody}>
            {/* Outcome */}
            <View style={[
              styles.outcomeBox,
              { backgroundColor: won ? colors.success + '18' : colors.muted },
            ]}>
              <Text style={[styles.outcomeLabel, { color: won ? colors.success : colors.mutedForeground }]}>
                {result.prize.label}
              </Text>
            </View>

            {/* Amount */}
            {won ? (
              <View style={styles.winSection}>
                <Text style={[styles.winSub, { color: colors.mutedForeground }]}>Prize payout</Text>
                <Text style={[styles.winAmount, { color: colors.success }]}>
                  {formatMoney(result.winAmount, result.currency)}
                </Text>
                {result.prize.multiplier > 1 && (
                  <Text style={[styles.multiplierTag, { color: result.ticket.accentColor }]}>
                    {result.prize.multiplier}× your {formatMoney(result.ticket.price, result.currency)}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.winSection}>
                <Text style={[styles.winSub, { color: colors.mutedForeground }]}>You paid</Text>
                <Text style={[styles.winAmount, { color: colors.destructive }]}>
                  −{formatMoney(result.ticket.price, result.currency)}
                </Text>
              </View>
            )}

            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.closeBtn,
                { backgroundColor: result.ticket.accentColor, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.closeBtnText}>{isJackpot ? 'Collect winnings!' : 'Done'}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function BankingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const players = useGameStore(s => s.players);
  const settings = useGameStore(s => s.settings);
  const { transfer, collectSalary, buyTicket } = useGameStore();

  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [quickPlayerId, setQuickPlayerId] = useState<string | null>(null);
  const [ticketBuyerId, setTicketBuyerId] = useState<string | null>(null);
  const [ticketResult, setTicketResult] = useState<TicketResult | null>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  // ── Transfer ──
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

  // ── Quick actions ──
  function handleQuick(action: 'salary' | 'income' | 'luxury') {
    if (!quickPlayerId) { Alert.alert('Select a player first'); return; }
    if (action === 'salary') {
      collectSalary(quickPlayerId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      const amt = action === 'income' ? settings.incomeTaxAmount : settings.luxuryTaxAmount;
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

  // ── Ticket buying ──
  function handleBuyTicket(ticket: TicketDef) {
    if (!ticketBuyerId) { Alert.alert('Select a player first', 'Tap a player in the row above'); return; }
    const buyer = players.find(p => p.id === ticketBuyerId);
    if (!buyer || buyer.balance < ticket.price) {
      Alert.alert('Insufficient funds', `${buyer?.name ?? 'Player'} needs ${formatMoney(ticket.price, settings.currency)}`);
      return;
    }

    const prize = pickPrize(ticket.prizes);
    const winAmount = ticket.price * prize.multiplier;

    buyTicket(ticketBuyerId, ticket.price, ticket.label, prize.multiplier);

    setTicketResult({ ticket, prize, winAmount, currency: settings.currency });

    if (winAmount > ticket.price) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (winAmount > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TicketResultModal result={ticketResult} onClose={() => setTicketResult(null)} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Banking</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Transfer ── */}
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
                    styles.quickPlayerBtn,
                    { backgroundColor: sel ? p.color + '22' : colors.muted, borderColor: sel ? p.color : colors.border, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: p.color }]} />
                  <Text style={[styles.quickPlayerName, { color: sel ? p.color : colors.foreground }]} numberOfLines={1}>{p.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.quickGrid}>
            {[
              { label: 'Collect Salary', sub: `+${formatMoney(settings.salaryAmount, settings.currency)}`, icon: 'cash-plus' as const, color: colors.success, action: () => handleQuick('salary') },
              { label: 'Income Tax',     sub: `-${formatMoney(settings.incomeTaxAmount, settings.currency)}`, icon: 'file-document' as const, color: colors.warning, action: () => handleQuick('income') },
              { label: 'Luxury Tax',     sub: `-${formatMoney(settings.luxuryTaxAmount, settings.currency)}`, icon: 'diamond' as const, color: colors.destructive, action: () => handleQuick('luxury') },
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

        {/* ── Ticket buying ── */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.ticketHeader}>
            <MaterialCommunityIcons name="ticket-percent" size={22} color={colors.accent} />
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Buy a Ticket</Text>
          </View>
          <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
            Try your luck — select a player then buy a ticket
          </Text>

          {/* Player selector for tickets */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.playerRow}>
            {players.map(p => {
              const sel = ticketBuyerId === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setTicketBuyerId(sel ? null : p.id)}
                  style={({ pressed }) => [
                    styles.quickPlayerBtn,
                    { backgroundColor: sel ? p.color + '22' : colors.muted, borderColor: sel ? p.color : colors.border, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: p.color }]} />
                  <Text style={[styles.quickPlayerName, { color: sel ? p.color : colors.foreground }]} numberOfLines={1}>{p.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Ticket cards */}
          <View style={styles.ticketList}>
            {TICKETS.map(ticket => {
              const buyer = ticketBuyerId ? players.find(p => p.id === ticketBuyerId) : null;
              const canAfford = buyer ? buyer.balance >= ticket.price : true;

              return (
                <Pressable
                  key={ticket.id}
                  onPress={() => handleBuyTicket(ticket)}
                  style={({ pressed }) => [
                    styles.ticketCard,
                    {
                      backgroundColor: ticket.accentColor + '12',
                      borderColor: ticket.accentColor + '55',
                      opacity: pressed ? 0.8 : (!ticketBuyerId || canAfford) ? 1 : 0.45,
                    },
                  ]}
                >
                  <View style={[styles.ticketIconBox, { backgroundColor: ticket.accentColor + '25' }]}>
                    <MaterialCommunityIcons name={ticket.icon} size={26} color={ticket.accentColor} />
                  </View>
                  <View style={styles.ticketInfo}>
                    <Text style={[styles.ticketLabel, { color: colors.foreground }]}>{ticket.label}</Text>
                    <Text style={[styles.ticketSub, { color: colors.mutedForeground }]}>{ticket.subtitle}</Text>
                    <View style={styles.oddsRow}>
                      {ticket.prizes.filter(p => p.multiplier > 0).map(p => (
                        <View key={p.multiplier} style={[styles.oddsPill, { backgroundColor: ticket.accentColor + '22' }]}>
                          <Text style={[styles.oddsText, { color: ticket.accentColor }]}>
                            {Math.round(p.probability * 100)}% {p.multiplier}×
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <View style={styles.ticketRight}>
                    <Text style={[styles.ticketPrice, { color: ticket.accentColor }]}>
                      {formatMoney(ticket.price, settings.currency)}
                    </Text>
                    <View style={[styles.buyBtn, { backgroundColor: ticket.accentColor }]}>
                      <Text style={styles.buyBtnText}>Buy</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Odds disclaimer */}
          <Text style={[styles.oddsNote, { color: colors.mutedForeground }]}>
            Odds shown per ticket. Results are instant and random.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 28 },
  scroll: { padding: 16, gap: 16 },

  section: { borderRadius: 18, borderWidth: 1, padding: 18, gap: 14 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  sectionHint: { fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: -8 },

  arrowRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: -4 },
  divider: { flex: 1, height: 1 },
  arrowBox: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  primaryBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16 },

  playerRow: { flexDirection: 'row', gap: 8 },
  quickPlayerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  quickPlayerName: { fontFamily: 'Inter_600SemiBold', fontSize: 14, maxWidth: 80 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickActionCard: { flex: 1, minWidth: 100, padding: 14, borderRadius: 12, borderWidth: 1, alignItems: 'flex-start', gap: 6 },
  quickActionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  quickActionSub: { fontFamily: 'Inter_700Bold', fontSize: 15 },

  // Ticket section
  ticketHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ticketList: { gap: 10 },
  ticketCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, padding: 14, gap: 12 },
  ticketIconBox: { width: 50, height: 50, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ticketInfo: { flex: 1, gap: 4 },
  ticketLabel: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  ticketSub: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  oddsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  oddsPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  oddsText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  ticketRight: { alignItems: 'flex-end', gap: 6 },
  ticketPrice: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  buyBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  buyBtnText: { fontFamily: 'Inter_700Bold', fontSize: 13, color: '#fff' },
  oddsNote: { fontFamily: 'Inter_400Regular', fontSize: 11, textAlign: 'center', marginTop: -4 },

  // Result modal
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  resultModal: { width: 320, borderRadius: 24, borderWidth: 2, overflow: 'hidden' },
  resultStrip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 16 },
  resultStripLabel: { fontFamily: 'Inter_700Bold', fontSize: 17, color: '#fff' },
  resultBody: { padding: 24, gap: 20, alignItems: 'center' },
  outcomeBox: { width: '100%', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
  outcomeLabel: { fontFamily: 'Inter_700Bold', fontSize: 20, textAlign: 'center' },
  winSection: { alignItems: 'center', gap: 4 },
  winSub: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  winAmount: { fontFamily: 'Inter_700Bold', fontSize: 38 },
  multiplierTag: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  closeBtn: { paddingHorizontal: 40, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  closeBtnText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' },
});
