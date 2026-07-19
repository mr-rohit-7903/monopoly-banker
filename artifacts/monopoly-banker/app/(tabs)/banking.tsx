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
import { useProperties } from '@/hooks/useProperties';
import { formatMoney } from '@/utils/format';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getINTCard(deck: 'chance' | 'community', roll: number): MonopolyCard {
  if (deck === 'chance') {
    switch (roll) {
      case 2:
        return {
          id: 'int_ch_2',
          deck: 'chance',
          emoji: '📉',
          title: 'Loss in Share Market',
          description: 'Loss in Share market — pay $2000 to the bank.',
          action: 'player_pay',
          amount: 2000,
        };
      case 3:
        return {
          id: 'int_ch_3',
          deck: 'chance',
          emoji: '🎟️',
          title: 'Lottery Prize',
          description: 'Lottery Prize — receive $2500 from the bank.',
          action: 'bank_give',
          amount: 2500,
        };
      case 4:
        return {
          id: 'int_ch_4',
          deck: 'chance',
          emoji: '🚗',
          title: 'Wrong Driving Fine',
          description: 'Fine for Accident due to Wrong Driving — pay $1000 to the bank.',
          action: 'player_pay',
          amount: 1000,
        };
      case 5:
        return {
          id: 'int_ch_5',
          deck: 'chance',
          emoji: '✏️',
          title: 'Crossword Prize',
          description: 'You have won crossword prize — receive $1000 from the bank.',
          action: 'bank_give',
          amount: 1000,
        };
      case 6:
        return {
          id: 'int_ch_6',
          deck: 'chance',
          emoji: '🔧',
          title: 'House Repair',
          description: 'House repair — pay $1500 to the bank.',
          action: 'player_pay',
          amount: 1500,
        };
      case 7:
        return {
          id: 'int_ch_7',
          deck: 'chance',
          emoji: '🏠',
          title: 'Collect Rent',
          description: 'Collect rent from each player for all your sites — collect $100 from each player.',
          action: 'birthday',
          amount: 100,
        };
      case 8:
        return {
          id: 'int_ch_8',
          deck: 'chance',
          emoji: '🔥',
          title: 'Fire in Godown',
          description: 'Loss due to fire in godown — pay $3000 to the bank.',
          action: 'player_pay',
          amount: 3000,
        };
      case 9:
        return {
          id: 'int_ch_9',
          deck: 'chance',
          emoji: '💰',
          title: 'Jackpot!',
          description: 'You have won jackpot of $2000 — collect from the bank.',
          action: 'bank_give',
          amount: 2000,
        };
      case 10:
        return {
          id: 'int_ch_10',
          deck: 'chance',
          emoji: '👮',
          title: 'Go to Jail',
          description: 'Go to jail. Do not pass GO, do not collect salary.',
          action: 'display',
        };
      case 11:
        return {
          id: 'int_ch_11',
          deck: 'chance',
          emoji: '🚢',
          title: 'Export Prize',
          description: 'Prize for best performance in Export — receive $1500 from the bank.',
          action: 'bank_give',
          amount: 1500,
        };
      case 12:
        return {
          id: 'int_ch_12',
          deck: 'chance',
          emoji: '🚗',
          title: 'Car Repairs',
          description: 'Repair of your car — pay $200 to the bank.',
          action: 'player_pay',
          amount: 200,
        };
      default:
        throw new Error('Invalid dice roll');
    }
  } else {
    // UNO (community deck)
    switch (roll) {
      case 2:
        return {
          id: 'int_cc_2',
          deck: 'community',
          emoji: '🎂',
          title: 'Anniversary',
          description: 'It is your Anniversary — collect $500 from each player.',
          action: 'birthday',
          amount: 500,
        };
      case 3:
        return {
          id: 'int_cc_3',
          deck: 'community',
          emoji: '👮',
          title: 'Go to Jail',
          description: 'Go to jail. Do not pass GO, do not collect salary.',
          action: 'display',
        };
      case 4:
        return {
          id: 'int_cc_4',
          deck: 'community',
          emoji: '👑',
          title: 'Beauty Contest',
          description: '1st prize in Beauty Contest — collect $2500 from the bank.',
          action: 'bank_give',
          amount: 2500,
        };
      case 5:
        return {
          id: 'int_cc_5',
          deck: 'community',
          emoji: '🏥',
          title: 'School & Medical Fees',
          description: 'School and Medical Fees — pay $2500 to the bank.',
          action: 'player_pay',
          amount: 2500,
        };
      case 6:
        return {
          id: 'int_cc_6',
          deck: 'community',
          emoji: '💸',
          title: 'Income Tax Refund',
          description: 'Income Tax refund — collect $2000 from the bank.',
          action: 'bank_give',
          amount: 2000,
        };
      case 7:
        return {
          id: 'int_cc_7',
          deck: 'community',
          emoji: '🛂',
          title: 'Submit your Passport',
          description: 'Submit your Passport.',
          action: 'display',
        };
      case 8:
        return {
          id: 'int_cc_8',
          deck: 'community',
          emoji: '🎉',
          title: 'Party House',
          description: 'Go to party House & collect $200 from each player.',
          action: 'birthday',
          amount: 200,
        };
      case 9:
        return {
          id: 'int_cc_9',
          deck: 'community',
          emoji: '🔧',
          title: 'General Repairs',
          description: 'Make General Repair on all your properties: pay $50 for each house and $100 for each hotel.',
          action: 'repairs',
          houseAmount: 50,
          hotelAmount: 100,
        };
      case 10:
        return {
          id: 'int_cc_10',
          deck: 'community',
          emoji: '📈',
          title: 'Interest on Shares',
          description: 'Receive interest on shares — collect $1500 from the bank.',
          action: 'bank_give',
          amount: 1500,
        };
      case 11:
        return {
          id: 'int_cc_11',
          deck: 'community',
          emoji: '🛡️',
          title: 'Insurance Premium',
          description: 'Pay Insurance premium — pay $1500 to the bank.',
          action: 'player_pay',
          amount: 1500,
        };
      case 12:
        return {
          id: 'int_cc_12',
          deck: 'community',
          emoji: '📊',
          title: 'Sale of Stocks',
          description: 'Sale of stocks — collect $3000 from the bank.',
          action: 'bank_give',
          amount: 3000,
        };
      default:
        throw new Error('Invalid dice roll');
    }
  }
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
  const propertyOwnerships = useGameStore(s => s.propertyOwnerships);
  const properties = useProperties();

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
  const [diceRollDeck, setDiceRollDeck] = useState<'chance' | 'community' | null>(null);

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
  function handleQuick(action: 'salary' | 'income' | 'luxury' | 'freeparking' | 'party_house' | 'resort') {
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
    } else if (action === 'party_house' || action === 'resort') {
      const label = action === 'party_house' ? 'Party House' : 'Resort';
      const payerList = players.filter(p => p.id !== quickPlayerId && !p.isBankrupt);
      let successCount = 0;
      payerList.forEach(p => {
        if (p.balance >= 200) {
          const ok = transfer(p.id, quickPlayerId, 200, 'transfer', `${label} — from ${p.name}`);
          if (ok) successCount++;
        }
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showConfirm('🎉', `${label} Visited`, `${playerName} collected ${formatMoney(200, settings.currency)} from ${successCount} players`);
    } else {
      let amt = action === 'income' ? settings.incomeTaxAmount : settings.luxuryTaxAmount;
      let label = action === 'income' ? 'Income Tax' : 'Luxury Tax';
      if (settings.version === 'INT') {
        const ownedPropsCount = Object.keys(propertyOwnerships).filter(propId => {
          const own = propertyOwnerships[propId];
          if (own.ownerId !== quickPlayerId) return false;
          const prop = properties.find(p => p.id === propId);
          return prop && prop.type === 'property';
        }).length;
        if (action === 'income') {
          label = 'Custom Duty';
          amt = ownedPropsCount * 100;
        } else {
          label = 'Travelling Duty';
          amt = ownedPropsCount * 50;
        }
      }
      const type = action === 'income' ? 'income_tax' : ('luxury_tax' as const);
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
    if (settings.version === 'INT') {
      setDiceRollDeck(deck);
    } else {
      const card = pickRandom(deck === 'chance' ? chanceCards : communityChestCards);
      setDrawnCard(card);
    }
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

      {/* ── Dice Roll Selection Modal for INT mode ── */}
      <Modal visible={!!diceRollDeck} transparent animationType="fade" onRequestClose={() => setDiceRollDeck(null)}>
        <Pressable style={confirmStyles.overlay} onPress={() => setDiceRollDeck(null)}>
          <Pressable style={[confirmStyles.card, { backgroundColor: colors.card, borderColor: colors.border, maxWidth: 440 }]}>
            <Text style={confirmStyles.emoji}>🎲</Text>
            <Text style={[confirmStyles.title, { color: colors.foreground }]}>Dice Roll</Text>
            <Text style={[confirmStyles.sub, { color: colors.mutedForeground, marginBottom: 12 }]}>
              Select the dice roll value for {players.find(p => p.id === cardDrawerId)?.name} to draw a {diceRollDeck === 'chance' ? 'Chance' : 'Uno'} card.
            </Text>

            <View style={diceStyles.grid}>
              {Array.from({ length: 11 }, (_, i) => i + 2).map(roll => {
                const isEven = roll % 2 === 0;
                const isPositive = diceRollDeck === 'chance' ? !isEven : isEven;
                const rollColor = isPositive ? colors.success : colors.destructive;

                return (
                  <Pressable
                    key={roll}
                    onPress={() => {
                      if (diceRollDeck) {
                        const card = getINTCard(diceRollDeck, roll);
                        setDrawnCard(card);
                        setDiceRollDeck(null);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      }
                    }}
                    style={({ pressed }) => [
                      diceStyles.rollBtn,
                      {
                        backgroundColor: rollColor + '12',
                        borderColor: rollColor + '40',
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={[diceStyles.rollText, { color: rollColor }]}>{roll}</Text>
                    <Text style={[diceStyles.rollSub, { color: colors.mutedForeground }]}>
                      {isPositive ? 'Gain' : 'Pay'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setDiceRollDeck(null)}
              style={({ pressed }) => [confirmStyles.okBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.85 : 1, width: '100%', marginTop: 12 }]}
            >
              <Text style={[confirmStyles.okText, { color: colors.foreground, textAlign: 'center' }]}>Cancel</Text>
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
                      const fineAmt = settings.version === 'INT' ? 500 : 50;
                      const ok = payJailFine(jailPlayer.id);
                      if (ok) {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        setJailVisible(false);
                        showConfirm('🔓', 'Released from Jail', `${jailPlayer.name} paid ${formatMoney(fineAmt, settings.currency)} fine`);
                      } else {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                        setAlertModal({ title: 'Insufficient Funds', message: `${jailPlayer.name} cannot afford the ${formatMoney(fineAmt, settings.currency)} fine.` });
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
                      <Text style={[jailStyles.optionSub, { color: colors.destructive }]}>-{formatMoney(settings.version === 'INT' ? 500 : 50, settings.currency)}</Text>
                    </View>
                  </Pressable>

                  {/* Use jail card */}
                  {settings.version !== 'INT' && (
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
                  )}

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
            {(() => {
              const ownedPropsCount = quickPlayerId ? Object.keys(propertyOwnerships).filter(propId => {
                const own = propertyOwnerships[propId];
                if (own.ownerId !== quickPlayerId) return false;
                const prop = properties.find(p => p.id === propId);
                return prop && prop.type === 'property';
              }).length : 0;

              const customDutyAmt = ownedPropsCount * 100;
              const travellingDutyAmt = ownedPropsCount * 50;

              const baseActions = settings.version === 'INT' ? [
                { label: 'Collect Salary', sub: `+${formatMoney(settings.salaryAmount, settings.currency)}`, icon: 'cash-plus' as any, color: colors.success, action: () => handleQuick('salary') },
                { 
                  label: 'Custom Duty', 
                  sub: quickPlayerId 
                    ? `-${formatMoney(customDutyAmt, settings.currency)} (${ownedPropsCount} site${ownedPropsCount !== 1 ? 's' : ''})` 
                    : `-${formatMoney(100, settings.currency)} per site`, 
                  icon: 'file-document' as any, 
                  color: colors.warning, 
                  action: () => handleQuick('income') 
                },
                { 
                  label: 'Travelling Duty', 
                  sub: quickPlayerId 
                    ? `-${formatMoney(travellingDutyAmt, settings.currency)} (${ownedPropsCount} site${ownedPropsCount !== 1 ? 's' : ''})` 
                    : `-${formatMoney(50, settings.currency)} per site`, 
                  icon: 'diamond' as any, 
                  color: colors.destructive, 
                  action: () => handleQuick('luxury') 
                },
                { label: 'Party House', sub: `+${formatMoney(200, settings.currency)} from each`, icon: 'gift-outline' as any, color: '#E91E63', action: () => handleQuick('party_house') },
                { label: 'Resorts', sub: `+${formatMoney(200, settings.currency)} from each`, icon: 'beach' as any, color: '#00BCD4', action: () => handleQuick('resort') },
              ] : [
                { label: 'Collect Salary', sub: `+${formatMoney(settings.salaryAmount, settings.currency)}`, icon: 'cash-plus' as any, color: colors.success, action: () => handleQuick('salary') },
                { label: 'Income Tax',     sub: `-${formatMoney(settings.incomeTaxAmount, settings.currency)}`, icon: 'file-document' as any, color: colors.warning, action: () => handleQuick('income') },
                { label: 'Luxury Tax',     sub: `-${formatMoney(settings.luxuryTaxAmount, settings.currency)}`, icon: 'diamond' as any, color: colors.destructive, action: () => handleQuick('luxury') },
                { label: 'Free Parking',   sub: `Claim ${formatMoney(pot, settings.currency)}`, icon: 'parking' as any, color: '#9C27B0', action: () => handleQuick('freeparking') },
              ];

              return baseActions;
            })().map(item => (
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
              <Text style={[styles.quickCardSub, { color: '#8B6550' }]}>Pay</Text>
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
              <Text style={styles.deckBtnTitle}>{settings.version === 'INT' ? 'Uno' : 'Community Chest'}</Text>
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

const diceStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
  },
  rollBtn: {
    width: '28%',
    aspectRatio: 1.15,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  rollText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
  },
  rollSub: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    textTransform: 'uppercase',
    marginTop: 1,
  },
});
