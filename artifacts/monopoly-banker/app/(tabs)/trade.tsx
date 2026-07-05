import React, { useState, useMemo } from 'react';
import {
  Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useGameStore, Player } from '@/store/gameStore';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { GROUP_NAMES, type PropertyGroup } from '@/constants/monopoly';
import { useProperties } from '@/hooks/useProperties';
import { formatMoney } from '@/utils/format';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TradeScreen() {
  const palette = useColors();
  const properties = useProperties();
  const insets = useSafeAreaInsets();
  const players = useGameStore(s => s.players).filter(p => !p.isBankrupt);
  const propertyOwnerships = useGameStore(s => s.propertyOwnerships);
  const currency = useGameStore(s => s.settings.currency);
  const executeTrade = useGameStore(s => s.executeTrade);

  const topPad = Platform.OS === 'web' ? 16 : insets.top;

  // Trade state
  const [playerAId, setPlayerAId] = useState<string | null>(null);
  const [playerBId, setPlayerBId] = useState<string | null>(null);
  const [moneyAtoB, setMoneyAtoB] = useState('');
  const [moneyBtoA, setMoneyBtoA] = useState('');
  const [propsAtoB, setPropsAtoB] = useState<string[]>([]);
  const [propsBtoA, setPropsBtoA] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showError, setShowError] = useState<string | null>(null);

  // Selecting players
  const [selectingFor, setSelectingFor] = useState<'A' | 'B' | null>(null);

  const playerA = players.find(p => p.id === playerAId) ?? null;
  const playerB = players.find(p => p.id === playerBId) ?? null;

  // Properties owned by each player
  const propsOwnedByA = useMemo(() =>
    playerA ? properties.filter(p => propertyOwnerships[p.id]?.ownerId === playerA.id) : [],
    [playerA, propertyOwnerships]
  );
  const propsOwnedByB = useMemo(() =>
    playerB ? properties.filter(p => propertyOwnerships[p.id]?.ownerId === playerB.id) : [],
    [playerB, propertyOwnerships]
  );

  function toggleProp(propId: string, side: 'A' | 'B') {
    if (side === 'A') {
      setPropsAtoB(prev => prev.includes(propId) ? prev.filter(p => p !== propId) : [...prev, propId]);
    } else {
      setPropsBtoA(prev => prev.includes(propId) ? prev.filter(p => p !== propId) : [...prev, propId]);
    }
  }

  function handleSelectPlayer(playerId: string) {
    if (selectingFor === 'A') {
      setPlayerAId(playerId);
      // If B was the same player, clear B
      if (playerBId === playerId) setPlayerBId(null);
      // Reset A's offers
      setMoneyAtoB('');
      setPropsAtoB([]);
    } else if (selectingFor === 'B') {
      setPlayerBId(playerId);
      if (playerAId === playerId) setPlayerAId(null);
      setMoneyBtoA('');
      setPropsBtoA([]);
    }
    setSelectingFor(null);
  }

  function resetTrade() {
    setPlayerAId(null);
    setPlayerBId(null);
    setMoneyAtoB('');
    setMoneyBtoA('');
    setPropsAtoB([]);
    setPropsBtoA([]);
  }

  function handleExecuteTrade() {
    if (!playerAId || !playerBId) return;

    const mAtoB = parseInt(moneyAtoB) || 0;
    const mBtoA = parseInt(moneyBtoA) || 0;

    // Must offer something
    if (mAtoB === 0 && mBtoA === 0 && propsAtoB.length === 0 && propsBtoA.length === 0) {
      setShowError('Add at least one item to trade');
      return;
    }

    const ok = executeTrade({
      playerAId,
      playerBId,
      moneyAtoB: mAtoB,
      moneyBtoA: mBtoA,
      propsAtoB,
      propsBtoA,
    });

    if (!ok) {
      setShowError('Trade failed — check player balances and property ownership');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      resetTrade();
    }, 1500);
  }

  const hasAnything = (parseInt(moneyAtoB) || 0) > 0 || (parseInt(moneyBtoA) || 0) > 0 || propsAtoB.length > 0 || propsBtoA.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      {/* Success toast */}
      <Modal visible={showSuccess} transparent animationType="fade">
        <View style={styles.toastOverlay}>
          <View style={[styles.toastCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <MaterialCommunityIcons name="check-circle" size={48} color={palette.success} />
            <Text style={[styles.toastText, { color: palette.foreground }]}>Trade Complete!</Text>
          </View>
        </View>
      </Modal>

      {/* Error modal */}
      <Modal visible={!!showError} transparent animationType="fade" onRequestClose={() => setShowError(null)}>
        <Pressable style={styles.toastOverlay} onPress={() => setShowError(null)}>
          <Pressable style={[styles.errorCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <MaterialCommunityIcons name="alert-circle" size={32} color={palette.destructive} />
            <Text style={[styles.errorTitle, { color: palette.foreground }]}>Trade Error</Text>
            <Text style={[styles.errorSub, { color: palette.mutedForeground }]}>{showError}</Text>
            <Pressable
              onPress={() => setShowError(null)}
              style={({ pressed }) => [styles.errorBtn, { backgroundColor: palette.primary, opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={styles.errorBtnText}>OK</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Player selector modal */}
      <Modal visible={!!selectingFor} transparent animationType="fade" onRequestClose={() => setSelectingFor(null)}>
        <Pressable style={styles.selectorOverlay} onPress={() => setSelectingFor(null)}>
          <Pressable style={[styles.selectorCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.selectorTitle, { color: palette.foreground }]}>
              Select Player {selectingFor}
            </Text>
            {players
              .filter(p => selectingFor === 'A' ? p.id !== playerBId : p.id !== playerAId)
              .map(p => (
                <Pressable
                  key={p.id}
                  onPress={() => handleSelectPlayer(p.id)}
                  style={({ pressed }) => [styles.selectorItem, { backgroundColor: pressed ? palette.muted : 'transparent', borderColor: palette.border }]}
                >
                  <PlayerAvatar name={p.name} color={p.color} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.selectorName, { color: palette.foreground }]}>{p.name}</Text>
                    <Text style={[styles.selectorBalance, { color: palette.mutedForeground }]}>
                      {formatMoney(p.balance, currency)}
                    </Text>
                  </View>
                </Pressable>
              ))
            }
            <Pressable
              onPress={() => setSelectingFor(null)}
              style={({ pressed }) => [styles.selectorCancel, { borderColor: palette.border, opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={[styles.selectorCancelText, { color: palette.foreground }]}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: palette.background, borderBottomColor: palette.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: palette.foreground }]}>Trade</Text>
          <Text style={[styles.headerSub, { color: palette.mutedForeground }]}>
            Exchange properties & money
          </Text>
        </View>
        {(playerAId || playerBId) && (
          <Pressable
            onPress={resetTrade}
            style={({ pressed }) => [styles.resetBtn, { backgroundColor: palette.muted, opacity: pressed ? 0.7 : 1 }]}
          >
            <MaterialCommunityIcons name="restart" size={18} color={palette.foreground} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {players.length < 2 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="swap-horizontal" size={56} color={palette.border} />
            <Text style={[styles.emptyTitle, { color: palette.foreground }]}>Need 2+ Players</Text>
            <Text style={[styles.emptyText, { color: palette.mutedForeground }]}>
              Add at least 2 players to make trades
            </Text>
          </View>
        ) : (
          <>
            {/* Player Selection Row */}
            <View style={styles.playersRow}>
              <PlayerSlot
                label="Player A"
                player={playerA}
                palette={palette}
                onPress={() => setSelectingFor('A')}
              />
              <View style={[styles.swapIcon, { backgroundColor: palette.muted }]}>
                <MaterialCommunityIcons name="swap-horizontal" size={22} color={palette.primary} />
              </View>
              <PlayerSlot
                label="Player B"
                player={playerB}
                palette={palette}
                onPress={() => setSelectingFor('B')}
              />
            </View>

            {/* Trade offers — only show once both players are selected */}
            {playerA && playerB && (
              <>
                {/* Player A's offer */}
                <TradeSide
                  player={playerA}
                  otherPlayer={playerB}
                  money={moneyAtoB}
                  onMoneyChange={setMoneyAtoB}
                  selectedProps={propsAtoB}
                  ownedProps={propsOwnedByA}
                  onToggleProp={(id) => toggleProp(id, 'A')}
                  palette={palette}
                  currency={currency}
                  propertyOwnerships={propertyOwnerships}
                />

                {/* Player B's offer */}
                <TradeSide
                  player={playerB}
                  otherPlayer={playerA}
                  money={moneyBtoA}
                  onMoneyChange={setMoneyBtoA}
                  selectedProps={propsBtoA}
                  ownedProps={propsOwnedByB}
                  onToggleProp={(id) => toggleProp(id, 'B')}
                  palette={palette}
                  currency={currency}
                  propertyOwnerships={propertyOwnerships}
                />

                {/* Execute Trade Button */}
                <Pressable
                  onPress={handleExecuteTrade}
                  disabled={!hasAnything}
                  style={({ pressed }) => [
                    styles.tradeBtn,
                    {
                      backgroundColor: hasAnything ? palette.primary : palette.muted,
                      opacity: pressed && hasAnything ? 0.85 : 1,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="handshake"
                    size={22}
                    color={hasAnything ? palette.primaryForeground : palette.mutedForeground}
                  />
                  <Text style={[styles.tradeBtnText, { color: hasAnything ? palette.primaryForeground : palette.mutedForeground }]}>
                    Execute Trade
                  </Text>
                </Pressable>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/* ──────────────── Sub-components ──────────────── */

function PlayerSlot({ label, player, palette, onPress }: {
  label: string;
  player: Player | null;
  palette: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.playerSlot,
        {
          backgroundColor: player ? palette.card : palette.muted,
          borderColor: player ? player.color : palette.border,
          borderWidth: player ? 2 : 1,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      {player ? (
        <>
          <PlayerAvatar name={player.name} color={player.color} size={40} />
          <Text style={[styles.slotName, { color: palette.foreground }]} numberOfLines={1}>{player.name}</Text>
        </>
      ) : (
        <>
          <MaterialCommunityIcons name="account-plus" size={28} color={palette.mutedForeground} />
          <Text style={[styles.slotPlaceholder, { color: palette.mutedForeground }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

function TradeSide({ player, otherPlayer, money, onMoneyChange, selectedProps, ownedProps, onToggleProp, palette, currency, propertyOwnerships }: {
  player: Player;
  otherPlayer: Player;
  money: string;
  onMoneyChange: (v: string) => void;
  selectedProps: string[];
  ownedProps: ReturnType<typeof useProperties>;
  onToggleProp: (id: string) => void;
  palette: ReturnType<typeof useColors>;
  currency: string;
  propertyOwnerships: Record<string, { ownerId: string | null; isMortgaged: boolean }>;
}) {
  return (
    <View style={[styles.offerCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
      {/* Color strip */}
      <View style={[styles.offerStrip, { backgroundColor: player.color }]} />

      <View style={styles.offerContent}>
        <View style={styles.offerHeader}>
          <PlayerAvatar name={player.name} color={player.color} size={28} />
          <Text style={[styles.offerTitle, { color: palette.foreground }]}>
            {player.name} offers to {otherPlayer.name}
          </Text>
        </View>

        {/* Money input */}
        <View style={styles.offerSection}>
          <Text style={[styles.offerLabel, { color: palette.mutedForeground }]}>Money</Text>
          <View style={[styles.moneyInput, { borderColor: palette.border, backgroundColor: palette.muted }]}>
            <Text style={[styles.moneyCurrency, { color: palette.primary }]}>{currency}</Text>
            <TextInput
              style={[styles.moneyTextInput, { color: palette.foreground }]}
              keyboardType="numeric"
              value={money}
              onChangeText={t => onMoneyChange(t.replace(/[^0-9]/g, ''))}
              placeholder="0"
              placeholderTextColor={palette.mutedForeground}
              selectionColor={palette.primary}
            />
            <Text style={[styles.moneyBalance, { color: palette.mutedForeground }]}>
              / {formatMoney(player.balance, currency)}
            </Text>
          </View>
        </View>

        {/* Properties */}
        <View style={styles.offerSection}>
          <Text style={[styles.offerLabel, { color: palette.mutedForeground }]}>
            Properties ({selectedProps.length}/{ownedProps.length})
          </Text>
          {ownedProps.length === 0 ? (
            <Text style={[styles.noProps, { color: palette.mutedForeground }]}>
              No properties to offer
            </Text>
          ) : (
            <View style={styles.propsGrid}>
              {ownedProps.map(prop => {
                const selected = selectedProps.includes(prop.id);
                const mortgaged = propertyOwnerships[prop.id]?.isMortgaged;
                return (
                  <Pressable
                    key={prop.id}
                    onPress={() => { onToggleProp(prop.id); Haptics.selectionAsync(); }}
                    style={[
                      styles.propChip,
                      {
                        backgroundColor: selected ? prop.groupColor + '33' : palette.muted,
                        borderColor: selected ? prop.groupColor : palette.border,
                        borderWidth: selected ? 2 : 1,
                      },
                    ]}
                  >
                    <View style={[styles.propChipDot, { backgroundColor: prop.groupColor }]} />
                    <Text
                      style={[styles.propChipName, { color: selected ? palette.foreground : palette.mutedForeground }]}
                      numberOfLines={1}
                    >
                      {prop.name}
                    </Text>
                    {mortgaged && (
                      <MaterialCommunityIcons name="alert-circle-outline" size={12} color={palette.destructive} />
                    )}
                    {selected && (
                      <MaterialCommunityIcons name="check-circle" size={14} color={prop.groupColor} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

/* ──────────────── Styles ──────────────── */

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 28 },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 2 },
  resetBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 16 },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 15, textAlign: 'center' },

  // Player selection row
  playersRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  playerSlot: {
    flex: 1, borderRadius: 16, padding: 16,
    alignItems: 'center', gap: 8,
  },
  slotName: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  slotPlaceholder: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  swapIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  // Offer card
  offerCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  offerStrip: { height: 4 },
  offerContent: { padding: 16, gap: 14 },
  offerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  offerTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15, flex: 1 },
  offerSection: { gap: 8 },
  offerLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Money input
  moneyInput: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, paddingHorizontal: 12, height: 44, borderWidth: 1,
  },
  moneyCurrency: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  moneyTextInput: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 18, padding: 0 },
  moneyBalance: { fontFamily: 'Inter_400Regular', fontSize: 12 },

  // Properties
  noProps: { fontFamily: 'Inter_400Regular', fontSize: 13, fontStyle: 'italic' },
  propsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  propChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
  },
  propChipDot: { width: 8, height: 8, borderRadius: 4 },
  propChipName: { fontFamily: 'Inter_500Medium', fontSize: 12, maxWidth: 120 },

  // Trade button
  tradeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 16, borderRadius: 16, marginTop: 4,
  },
  tradeBtnText: { fontFamily: 'Inter_700Bold', fontSize: 17 },

  // Success toast
  toastOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  toastCard: {
    padding: 32, borderRadius: 20, borderWidth: 1,
    alignItems: 'center', gap: 12,
  },
  toastText: { fontFamily: 'Inter_700Bold', fontSize: 20 },

  // Error modal
  errorCard: {
    width: '100%', borderRadius: 20, borderWidth: 1,
    padding: 24, alignItems: 'center', gap: 12,
  },
  errorTitle: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  errorSub: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  errorBtn: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  errorBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff' },

  // Player selector modal
  selectorOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  selectorCard: {
    width: '100%', borderRadius: 20, borderWidth: 1,
    padding: 20, gap: 12,
  },
  selectorTitle: { fontFamily: 'Inter_700Bold', fontSize: 18, textAlign: 'center' },
  selectorItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1,
  },
  selectorName: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  selectorBalance: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  selectorCancel: {
    paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, alignItems: 'center', marginTop: 4,
  },
  selectorCancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
});
