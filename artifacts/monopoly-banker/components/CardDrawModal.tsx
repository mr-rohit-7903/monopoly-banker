import React, { useState } from 'react';
import {
  Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useGameStore, TransactionType } from '@/store/gameStore';
import { MonopolyCard } from '@/constants/cards';
import { MONOPOLY_PROPERTIES } from '@/constants/monopoly';
import { formatMoney } from '@/utils/format';

export const CHANCE_COLOR = '#D4580A';
export const COMMUNITY_COLOR = '#B07800';

interface Props {
  card: MonopolyCard | null;
  drawerId: string | null;
  onClose: () => void;
}

export function CardDrawModal({ card, drawerId, onClose }: Props) {
  const colors = useColors();
  const players = useGameStore(s => s.players);
  const propertyOwnerships = useGameStore(s => s.propertyOwnerships);
  const currency = useGameStore(s => s.settings.currency);
  const { transfer, addJailCard } = useGameStore();
  const [passedGo, setPassedGo] = useState(false);

  if (!card || !drawerId) return null;

  // Safe non-null aliases after guards above
  const safeCard = card;
  const safeDrawerId = drawerId;

  const drawer = players.find(p => p.id === safeDrawerId);
  if (!drawer) return null;

  const accentColor = safeCard.deck === 'chance' ? CHANCE_COLOR : COMMUNITY_COLOR;
  const deckLabel = safeCard.deck === 'chance' ? 'Chance' : 'Community Chest';
  const txType: TransactionType = safeCard.deck === 'chance' ? 'chance_card' : 'community_card';

  // ── Helpers ──────────────────────────────────────────────────────────────
  function calcRepairs(): { houses: number; hotels: number; total: number } {
    let houses = 0, hotels = 0;
    Object.values(propertyOwnerships).forEach(o => {
      if (o.ownerId === safeDrawerId) {
        if (o.hotel) hotels++;
        else houses += o.houses;
      }
    });
    const total = houses * (safeCard.houseAmount ?? 0) + hotels * (safeCard.hotelAmount ?? 0);
    return { houses, hotels, total };
  }

  function calcBirthday() {
    return players
      .filter(p => p.id !== safeDrawerId)
      .map(p => ({ player: p, canPay: p.balance >= (safeCard.amount ?? 10) }));
  }

  // ── Apply action ─────────────────────────────────────────────────────────
  function handleApply() {
    let success = true;

    switch (safeCard.action) {
      case 'bank_give':
        transfer(null, safeDrawerId, safeCard.amount!, txType, safeCard.title);
        break;
      case 'player_pay':
        success = transfer(safeDrawerId, null, safeCard.amount!, txType, safeCard.title);
        break;
      case 'salary':
        transfer(null, safeDrawerId, 200, 'salary', `${safeCard.title} — Advance to GO`);
        break;
      case 'repairs': {
        const { total } = calcRepairs();
        if (total > 0) success = transfer(safeDrawerId, null, total, txType, safeCard.title);
        break;
      }
      case 'birthday': {
        calcBirthday().forEach(({ player, canPay }) => {
          if (canPay) transfer(player.id, safeDrawerId, safeCard.amount!, txType, `${safeCard.title} — from ${player.name}`);
        });
        break;
      }
    }

    if (!success) { Alert.alert('Insufficient funds'); return; }
    if (passedGo) transfer(null, drawerId, 200, 'salary', 'Passed GO');

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPassedGo(false);
    onClose();
  }

  function handleDone() {
    if (passedGo) {
      transfer(null, drawerId, 200, 'salary', 'Passed GO');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    // GOOJF card: grant the drawing player a jail card
    if (safeCard.isGoojf) {
      addJailCard(safeDrawerId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setPassedGo(false);
    onClose();
  }

  // ── Computed display data ─────────────────────────────────────────────────
  const repairs = card.action === 'repairs' ? calcRepairs() : null;
  const birthdayList = card.action === 'birthday' ? calcBirthday() : null;

  const isActionable =
    card.action !== 'display' &&
    !(card.action === 'repairs' && repairs?.total === 0) &&
    !(card.action === 'birthday' && birthdayList?.every(b => !b.canPay));

  return (
    <Modal visible transparent animationType="slide" onRequestClose={handleDone}>
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          {/* Deck banner */}
          <View style={[styles.banner, { backgroundColor: accentColor }]}>
            <View>
              <Text style={styles.deckLabel}>{deckLabel}</Text>
              <Text style={styles.drawerName}>{drawer.name}'s turn</Text>
            </View>
            <Text style={styles.emoji}>{card.emoji}</Text>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {/* Card title + description */}
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>{card.title}</Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>{card.description}</Text>

            {/* ── Bank gives player money ── */}
            {card.action === 'bank_give' && (
              <View style={[styles.effectBox, { backgroundColor: colors.success + '1A', borderColor: colors.success + '55' }]}>
                <MaterialCommunityIcons name="cash-plus" size={22} color={colors.success} />
                <View style={styles.effectText}>
                  <Text style={[styles.effectAmount, { color: colors.success }]}>
                    +{formatMoney(card.amount!, currency)}
                  </Text>
                  <Text style={[styles.effectSub, { color: colors.mutedForeground }]}>received from bank</Text>
                </View>
              </View>
            )}

            {/* ── Player pays bank ── */}
            {card.action === 'player_pay' && (
              <View style={[styles.effectBox, { backgroundColor: colors.destructive + '1A', borderColor: colors.destructive + '55' }]}>
                <MaterialCommunityIcons name="cash-minus" size={22} color={colors.destructive} />
                <View style={styles.effectText}>
                  <Text style={[styles.effectAmount, { color: colors.destructive }]}>
                    −{formatMoney(card.amount!, currency)}
                  </Text>
                  <Text style={[styles.effectSub, { color: colors.mutedForeground }]}>paid to bank</Text>
                </View>
              </View>
            )}

            {/* ── Advance to GO ── */}
            {card.action === 'salary' && (
              <View style={[styles.effectBox, { backgroundColor: colors.success + '1A', borderColor: colors.success + '55' }]}>
                <MaterialCommunityIcons name="flag-checkered" size={22} color={colors.success} />
                <View style={styles.effectText}>
                  <Text style={[styles.effectAmount, { color: colors.success }]}>
                    +{formatMoney(200, currency)}
                  </Text>
                  <Text style={[styles.effectSub, { color: colors.mutedForeground }]}>collected from bank</Text>
                </View>
              </View>
            )}

            {/* ── Repairs ── */}
            {card.action === 'repairs' && repairs && (
              <View style={[styles.repairsBox, { backgroundColor: accentColor + '15', borderColor: accentColor + '55' }]}>
                <Text style={[styles.repairsTitle, { color: accentColor }]}>Repair Bill for {drawer.name}</Text>

                <View style={styles.repairsRow}>
                  <Text style={[styles.repairLine, { color: colors.foreground }]}>
                    🏠 {repairs.houses} {repairs.houses === 1 ? 'house' : 'houses'} × {formatMoney(card.houseAmount!, currency)}
                  </Text>
                  <Text style={[styles.repairAmt, { color: colors.foreground }]}>
                    {formatMoney(repairs.houses * card.houseAmount!, currency)}
                  </Text>
                </View>

                <View style={styles.repairsRow}>
                  <Text style={[styles.repairLine, { color: colors.foreground }]}>
                    🏨 {repairs.hotels} {repairs.hotels === 1 ? 'hotel' : 'hotels'} × {formatMoney(card.hotelAmount!, currency)}
                  </Text>
                  <Text style={[styles.repairAmt, { color: colors.foreground }]}>
                    {formatMoney(repairs.hotels * card.hotelAmount!, currency)}
                  </Text>
                </View>

                <View style={[styles.repairsDivider, { backgroundColor: accentColor + '44' }]} />

                <View style={styles.repairsRow}>
                  <Text style={[styles.repairTotal, { color: accentColor }]}>Total due</Text>
                  <Text style={[styles.repairTotalAmt, { color: repairs.total === 0 ? colors.success : colors.destructive }]}>
                    {repairs.total === 0 ? 'Nothing owed!' : `−${formatMoney(repairs.total, currency)}`}
                  </Text>
                </View>
              </View>
            )}

            {/* ── Birthday ── */}
            {card.action === 'birthday' && birthdayList && (
              <View style={[styles.repairsBox, { backgroundColor: colors.success + '1A', borderColor: colors.success + '55' }]}>
                <Text style={[styles.repairsTitle, { color: colors.success }]}>Collecting from players</Text>
                {birthdayList.length === 0 && (
                  <Text style={[styles.repairLine, { color: colors.mutedForeground }]}>No other players in the game.</Text>
                )}
                {birthdayList.map(({ player, canPay }) => (
                  <View key={player.id} style={styles.repairsRow}>
                    <Text style={[styles.repairLine, { color: canPay ? colors.foreground : colors.mutedForeground }]}>
                      {player.name}{!canPay ? ' (insufficient)' : ''}
                    </Text>
                    <Text style={[styles.repairAmt, { color: canPay ? colors.success : colors.mutedForeground }]}>
                      +{formatMoney(card.amount!, currency)}
                    </Text>
                  </View>
                ))}
                <View style={[styles.repairsDivider, { backgroundColor: colors.success + '44' }]} />
                <View style={styles.repairsRow}>
                  <Text style={[styles.repairTotal, { color: colors.success }]}>Total received</Text>
                  <Text style={[styles.repairTotalAmt, { color: colors.success }]}>
                    +{formatMoney(birthdayList.filter(b => b.canPay).length * (card.amount ?? 10), currency)}
                  </Text>
                </View>
              </View>
            )}

            {/* ── Movement: optional passed GO toggle ── */}
            {card.action === 'display' && card.hasGoBonus && (
              <Pressable
                onPress={() => setPassedGo(v => !v)}
                style={[
                  styles.goToggle,
                  {
                    backgroundColor: passedGo ? colors.success + '1A' : colors.muted,
                    borderColor: passedGo ? colors.success : colors.border,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={passedGo ? 'checkbox-marked-circle' : 'checkbox-blank-circle-outline'}
                  size={22}
                  color={passedGo ? colors.success : colors.mutedForeground}
                />
                <Text style={[styles.goToggleText, { color: passedGo ? colors.success : colors.foreground }]}>
                  Passed GO — collect {formatMoney(200, currency)}
                </Text>
              </Pressable>
            )}

            {/* ── Buttons ── */}
            <View style={styles.btnRow}>
              {isActionable ? (
                <>
                  <Pressable
                    onPress={handleDone}
                    style={({ pressed }) => [styles.ghostBtn, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={[styles.ghostBtnText, { color: colors.foreground }]}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleApply}
                    style={({ pressed }) => [styles.applyBtn, { backgroundColor: accentColor, opacity: pressed ? 0.85 : 1 }]}
                  >
                    <Text style={styles.applyBtnText}>
                      {card.action === 'repairs' && repairs?.total === 0
                        ? 'Done (nothing owed)'
                        : 'Apply'}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={handleDone}
                  style={({ pressed }) => [styles.applyBtn, { flex: 1, backgroundColor: accentColor, opacity: pressed ? 0.85 : 1 }]}
                >
                  <Text style={styles.applyBtnText}>
                    {passedGo ? `Collect ${formatMoney(200, currency)} & Done` : 'Done'}
                  </Text>
                </Pressable>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  deckLabel: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  drawerName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    color: '#fff',
    marginTop: 2,
  },
  emoji: {
    fontSize: 44,
  },
  body: {
    padding: 24,
    gap: 16,
  },
  cardTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
  },
  description: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
  },
  effectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  effectText: {
    flex: 1,
  },
  effectAmount: {
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
  },
  effectSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  repairsBox: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 10,
  },
  repairsTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  repairsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  repairLine: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    flex: 1,
  },
  repairAmt: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  repairsDivider: {
    height: 1,
    marginVertical: 2,
  },
  repairTotal: {
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
  },
  repairTotalAmt: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  goToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  goToggleText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    flex: 1,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  ghostBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  ghostBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  applyBtnText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#fff',
  },
});
