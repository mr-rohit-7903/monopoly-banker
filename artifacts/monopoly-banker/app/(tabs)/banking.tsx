import React, { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Modal, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';
import { useGameStore, calculateFreeParkingPot } from '@/store/gameStore';
import { PlayerSelector } from '@/components/PlayerSelector';
import { AmountInput } from '@/components/AmountInput';
import { CardDrawModal, CHANCE_COLOR, COMMUNITY_COLOR } from '@/components/CardDrawModal';
import { MonopolyCard } from '@/constants/cards';
import { useCards } from '@/hooks/useCards';
import { formatMoney } from '@/utils/format';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function BankingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const players = useGameStore(s => s.players).filter(p => !p.isBankrupt);
  const { chanceCards, communityChestCards } = useCards();
  const settings = useGameStore(s => s.settings);
  const { transfer, collectSalary, payJailFine, useJailCard, claimFreeParking } = useGameStore();
  const transactions = useGameStore(s => s.transactions);
  const pot = calculateFreeParkingPot(transactions);

  // Transfer state
  const [fromId, setFromId] = useState<string | null>(null);
  const [toId, setToId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');

  // Quick actions player
  const [quickPlayerId, setQuickPlayerId] = useState<string | null>(null);

  // Jail modal state
  const [jailVisible, setJailVisible] = useState(false);

  // Transaction success confirmation
  const [txConfirm, setTxConfirm] = useState<{ emoji: string; title: string; sub: string } | null>(null);

  // Error / Alert Modal
  const [alertModal, setAlertModal] = useState<{ title: string; message: string } | null>(null);

  function showConfirm(emoji: string, title: string, sub: string) {
    setTxConfirm({ emoji, title, sub });
  }

  // Card draw state
  const [cardDrawerId, setCardDrawerId] = useState<string | null>(null);
  const [drawnCard, setDrawnCard] = useState<MonopolyCard | null>(null);

  const topPad = Platform.OS === 'web' ? 16 : insets.top;

  // ── Transfer ─────────────────────────────────────────────────────────────
  function handleTransfer() {
    const amt = parseInt(amount);
    if (!amt || amt <= 0) return;
    if (fromId === toId) { setAlertModal({ title: 'Invalid', message: 'From and To must be different' }); return; }
    const fromName = fromId ? players.find(p => p.id === fromId)?.name : 'Bank';
    const toName   = toId   ? players.find(p => p.id === toId)?.name   : 'Bank';
    const ok = transfer(fromId, toId, amt, 'transfer', `${fromName} → ${toName}`);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAmount('');
      showConfirm('✅', 'Transfer Complete', `${formatMoney(amt, settings.currency)} from ${fromName} to ${toName}`);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setAlertModal({ title: 'Insufficient Funds', message: 'The sender does not have enough money.' });
    }
  }

  // ── Quick actions ─────────────────────────────────────────────────────────
  function handleQuick(action: 'salary' | 'income' | 'luxury') {
    if (!quickPlayerId) { setAlertModal({ title: 'Select a Player', message: 'Please select a player first.' }); return; }
    const playerName = players.find(p => p.id === quickPlayerId)?.name ?? 'Player';
    if (action === 'salary') {
      collectSalary(quickPlayerId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showConfirm('🏁', 'Salary Collected', `${playerName} received ${formatMoney(settings.salaryAmount, settings.currency)} from the bank`);
    } else if (action === 'freeparking') {
      if (pot <= 0) { setAlertModal({ title: 'Empty Pot', message: 'The Free Parking pot is currently empty.' }); return; }
      const claimedAmount = pot;
      const ok = claimFreeParking(quickPlayerId);
      if (ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showConfirm('🎉', 'Free Parking Claimed', `${playerName} won the pot of ${formatMoney(claimedAmount, settings.currency)}!`);
      }
    } else {
      const amt  = action === 'income' ? settings.incomeTaxAmount : settings.luxuryTaxAmount;
      const type = action === 'income' ? 'income_tax' : ('luxury_tax' as const);
      const label = action === 'income' ? 'Income Tax' : 'Luxury Tax';
      const ok = transfer(quickPlayerId, null, amt, type, label);
      if (ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showConfirm('💸', `${label} Paid`, `${playerName} paid ${formatMoney(amt, settings.currency)} to the bank`);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setAlertModal({ title: 'Low Balance', message: `${playerName} does not have enough money to pay the ${label}.` });
      }
    }
  }

  function handleJail() {
    if (!quickPlayerId) { setAlertModal({ title: 'Select a Player', message: 'Please select a player first.' }); return; }
    setJailVisible(true);
  }

  // ── Card draw ─────────────────────────────────────────────────────────────
  function handleDraw(deck: 'chance' | 'community') {
    if (!cardDrawerId) { setAlertModal({ title: 'Select a Player', message: 'Tap a player above then draw a card.' }); return; }
    const card = pickRandom(deck === 'chance' ? chanceCards : communityChestCards);
    setDrawnCard(card);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* ── Error / Alert Modal ── */}
      <Modal visible={!!alertModal} transparent animationType="fade" onRequestClose={() => setAlertModal(null)}>
        <Pressable style={confirmStyles.overlay} onPress={() => setAlertModal(null)}>
          <Pressable style={[confirmStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={confirmStyles.emoji}>⚠️</Text>
            <Text style={[confirmStyles.title, { color: colors.foreground }]}>{alertModal?.title}</Text>
            <Text style={[confirmStyles.sub, { color: colors.mutedForeground }]}>{alertModal?.message}</Text>
            <Pressable
              onPress={() => setAlertModal(null)}
              style={({ pressed }) => [confirmStyles.okBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[confirmStyles.okText, { color: colors.primaryForeground }]}>Okay</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <CardDrawModal
        card={drawnCard}
        drawerId={cardDrawerId}
        onClose={() => setDrawnCard(null)}
      />

      {/* ── Transaction success popup ── */}
      <Modal visible={!!txConfirm} transparent animationType="fade" onRequestClose={() => setTxConfirm(null)}>
        <Pressable style={confirmStyles.overlay} onPress={() => setTxConfirm(null)}>
          <Pressable style={[confirmStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={confirmStyles.emoji}>{txConfirm?.emoji}</Text>
            <Text style={[confirmStyles.title, { color: colors.foreground }]}>{txConfirm?.title}</Text>
            <Text style={[confirmStyles.sub, { color: colors.mutedForeground }]}>{txConfirm?.sub}</Text>
            <Pressable
              onPress={() => setTxConfirm(null)}
              style={({ pressed }) => [confirmStyles.okBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[confirmStyles.okText, { color: colors.primaryForeground }]}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Jail modal ── */}
      {(() => {
        const jailPlayer = players.find(p => p.id === quickPlayerId);
        if (!jailPlayer) return null;
        return (
          <Modal visible={jailVisible} transparent animationType="slide" onRequestClose={() => setJailVisible(false)}>
            <Pressable style={jailStyles.overlay} onPress={() => setJailVisible(false)}>
              <Pressable style={[jailStyles.sheet, { backgroundColor: colors.card }]}>
                <View style={[jailStyles.banner, { backgroundColor: '#5C4033' }]}>
                  <Text style={jailStyles.bannerEmoji}>🔒</Text>
                  <View>
                    <Text style={jailStyles.bannerLabel}>In Jail</Text>
                    <Text style={jailStyles.bannerPlayer}>{jailPlayer.name}</Text>
                  </View>
                </View>

                <View style={jailStyles.body}>
                  <Text style={[jailStyles.hint, { color: colors.mutedForeground }]}>
                    Choose how {jailPlayer.name} gets out of jail:
                  </Text>

                  {/* Pay fine */}
                  <Pressable
                    onPress={() => {
                      const ok = payJailFine(jailPlayer.id);
                      if (ok) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setJailVisible(false);
                        showConfirm('🔓', 'Released from Jail', `${jailPlayer.name} paid ${formatMoney(50, settings.currency)} fine`);
                      } else {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                        setAlertModal({ title: 'Insufficient Funds', message: `${jailPlayer.name} cannot afford the $50 fine.` });
                      }
                    }}
                    style={({ pressed }) => [
                      jailStyles.optionBtn,
                      { backgroundColor: colors.destructive + '18', borderColor: colors.destructive + '55', opacity: pressed ? 0.8 : 1 },
                    ]}
                  >
                    <MaterialCommunityIcons name="cash-minus" size={24} color={colors.destructive} />
                    <View style={jailStyles.optionText}>
                      <Text style={[jailStyles.optionLabel, { color: colors.foreground }]}>Pay Fine</Text>
                      <Text style={[jailStyles.optionSub, { color: colors.destructive }]}>-{formatMoney(50, settings.currency)}</Text>
                    </View>
                  </Pressable>

                  {/* Use jail card */}
                  <Pressable
                    disabled={jailPlayer.jailCards === 0}
                    onPress={() => {
                      const ok = useJailCard(jailPlayer.id);
                      if (ok) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setJailVisible(false);
                        showConfirm('🆓', 'Released from Jail', `${jailPlayer.name} used their Get Out of Jail Free card`);
                      }
                    }}
                    style={({ pressed }) => [
                      jailStyles.optionBtn,
                      {
                        backgroundColor: jailPlayer.jailCards > 0 ? colors.success + '18' : colors.muted,
                        borderColor: jailPlayer.jailCards > 0 ? colors.success + '55' : colors.border,
                        opacity: pressed ? 0.8 : jailPlayer.jailCards === 0 ? 0.45 : 1,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 24 }}>🆓</Text>
                    <View style={jailStyles.optionText}>
                      <Text style={[jailStyles.optionLabel, { color: colors.foreground }]}>Use Jail Card</Text>
                      <Text style={[jailStyles.optionSub, { color: jailPlayer.jailCards > 0 ? colors.success : colors.mutedForeground }]}>
                        {jailPlayer.jailCards} card{jailPlayer.jailCards !== 1 ? 's' : ''} held
                      </Text>
                    </View>
                  </Pressable>

                  <Pressable
                    onPress={() => setJailVisible(false)}
                    style={({ pressed }) => [jailStyles.cancelBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={[jailStyles.cancelText, { color: colors.foreground }]}>Cancel</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        );
      })()}

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
          <PlayerSelector 
            players={players.filter(p => p.id !== fromId)} 
            selectedId={toId} 
            onSelect={setToId} 
            includeBank={fromId !== null} 
            label="To" 
          />
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

          <View style={styles.playerRow}>
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
                  <Text style={[styles.playerChipText, { color: sel ? p.color : colors.foreground }]}>{p.name}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.quickGrid}>
            {([
              { label: 'Collect Salary', sub: `+${formatMoney(settings.salaryAmount, settings.currency)}`, icon: 'cash-plus' as const, color: colors.success, action: () => handleQuick('salary') },
              { label: 'Income Tax',     sub: `-${formatMoney(settings.incomeTaxAmount, settings.currency)}`, icon: 'file-document' as const, color: colors.warning, action: () => handleQuick('income') },
              { label: 'Luxury Tax',     sub: `-${formatMoney(settings.luxuryTaxAmount, settings.currency)}`, icon: 'diamond' as const, color: colors.destructive, action: () => handleQuick('luxury') },
              { label: 'Free Parking',   sub: `Claim ${formatMoney(pot, settings.currency)}`, icon: 'parking' as const, color: '#9C27B0', action: () => handleQuick('freeparking') },
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
            {/* Jail */}
            <Pressable
              onPress={handleJail}
              style={({ pressed }) => [
                styles.quickCard,
                { backgroundColor: '#5C4033' + '22', borderColor: '#5C4033' + '55', opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <MaterialCommunityIcons name="lock" size={22} color="#8B6550" />
              <Text style={[styles.quickCardLabel, { color: colors.foreground }]}>Jail</Text>
              <Text style={[styles.quickCardSub, { color: '#8B6550' }]}>Pay or card</Text>
            </Pressable>
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
          <View style={styles.playerRow}>
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
                  <Text style={[styles.playerChipText, { color: sel ? p.color : colors.foreground }]}>{p.name}</Text>
                </Pressable>
              );
            })}
          </View>

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
              <Image source={require('../../assets/images/chance.png')} style={styles.deckBtnImage} contentFit="contain" />
              <Text style={styles.deckBtnTitle}>Chance</Text>
            </Pressable>

            {/* Community Chest */}
            <Pressable
              onPress={() => handleDraw('community')}
              style={({ pressed }) => [
                styles.deckBtn,
                { backgroundColor: COMMUNITY_COLOR, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Image source={require('../../assets/images/chest.png')} style={styles.deckBtnImage} contentFit="contain" />
              <Text style={styles.deckBtnTitle}>Community Chest</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const confirmStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  card: {
    width: '100%', borderRadius: 20, borderWidth: 1,
    padding: 28, alignItems: 'center', gap: 10,
  },
  emoji: { fontSize: 48 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 20, textAlign: 'center' },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  okBtn: { marginTop: 8, paddingHorizontal: 40, paddingVertical: 13, borderRadius: 14 },
  okText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
});

const jailStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 24, paddingVertical: 20 },
  bannerEmoji: { fontSize: 36 },
  bannerLabel: { fontFamily: 'Inter_700Bold', fontSize: 12, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 1 },
  bannerPlayer: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#fff', marginTop: 2 },
  body: { padding: 20, gap: 12 },
  hint: { fontFamily: 'Inter_400Regular', fontSize: 14, marginBottom: 4 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, borderRadius: 14, borderWidth: 1.5 },
  optionText: { flex: 1 },
  optionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  optionSub: { fontFamily: 'Inter_700Bold', fontSize: 15, marginTop: 2 },
  cancelBtn: { paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', marginTop: 4 },
  cancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
});

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

  playerRow: { flexDirection: 'column', gap: 8 },
  playerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  playerChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, flex: 1 },
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
    boxShadow: '0px 3px 6px rgba(0,0,0,0.18)',
    elevation: 4,
  },
  deckBtnImage: { width: 50, height: 50, marginBottom: 2 },
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
