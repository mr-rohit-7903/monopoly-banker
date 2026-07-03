import React, { useState } from 'react';
import {
  Alert, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useGameStore } from '@/store/gameStore';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { TransactionItem } from '@/components/TransactionItem';
import { formatMoney } from '@/utils/format';
import colors from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PLAYER_COLORS = colors.playerColors;

export default function PlayerDetailScreen() {
  const palette = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const player = useGameStore(s => s.players.find(p => p.id === id));
  const allPlayers = useGameStore(s => s.players);
  const transactions = useGameStore(s => s.transactions);
  const currency = useGameStore(s => s.settings.currency);
  const { updatePlayer, removePlayer, transfer } = useGameStore();

  const [name, setName] = useState(player?.name ?? '');
  const [selectedColor, setSelectedColor] = useState(player?.color ?? PLAYER_COLORS[0]);
  const [editMode, setEditMode] = useState(false);
  const [adjustAmt, setAdjustAmt] = useState('');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  if (!player) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: palette.foreground }}>Player not found</Text>
      </View>
    );
  }

  // Safe non-null reference after guard above
  const safePlayer = player;

  const playerTransactions = [...transactions]
    .reverse()
    .filter(t => t.fromId === player.id || t.toId === player.id);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (allPlayers.some(p => p.id !== safePlayer.id && p.name.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Duplicate name'); return;
    }
    updatePlayer(safePlayer.id, { name: trimmed, color: selectedColor });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditMode(false);
  }

  function handleDelete() {
    Alert.alert('Remove Player', `Remove ${safePlayer.name} from the game?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => { removePlayer(safePlayer.id); router.back(); },
      },
    ]);
  }

  function handleAdjust(positive: boolean) {
    const amt = parseInt(adjustAmt);
    if (!amt || amt <= 0) return;
    if (positive) {
      transfer(null, safePlayer.id, amt, 'bank_give', `Bank gave ${safePlayer.name} ${currency}${amt}`);
    } else {
      const ok = transfer(safePlayer.id, null, amt, 'bank_receive', `${safePlayer.name} paid bank ${currency}${amt}`);
      if (!ok) { Alert.alert('Insufficient funds'); return; }
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAdjustAmt('');
  }

  const usedColors = allPlayers.filter(p => p.id !== safePlayer.id).map(p => p.color);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: palette.background, borderBottomColor: palette.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={palette.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.foreground }]}>Player</Text>
        <Pressable
          onPress={() => editMode ? handleSave() : setEditMode(true)}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={[styles.editBtn, { color: palette.primary }]}>{editMode ? 'Save' : 'Edit'}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile */}
        <View style={[styles.profile, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <PlayerAvatar name={editMode ? (name || safePlayer.name) : safePlayer.name} color={selectedColor} size={72} />
          <View style={styles.profileInfo}>
            {editMode ? (
              <TextInput
                style={[styles.nameInput, { color: palette.foreground, borderColor: palette.primary }]}
                value={name}
                onChangeText={setName}
                autoFocus
                maxLength={20}
                selectionColor={palette.primary}
              />
            ) : (
              <Text style={[styles.profileName, { color: palette.foreground }]}>{safePlayer.name}</Text>
            )}
            <Text style={[styles.profileBalance, { color: palette.primary }]}>
              {formatMoney(safePlayer.balance, currency)}
            </Text>
          </View>
        </View>

        {/* Color picker in edit mode */}
        {editMode && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: palette.mutedForeground }]}>Color</Text>
            <View style={styles.colorGrid}>
              {PLAYER_COLORS.map(c => {
                const used = usedColors.includes(c);
                const selected = selectedColor === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => { if (!used) { setSelectedColor(c); Haptics.selectionAsync(); } }}
                    style={[
                      styles.colorBtn,
                      {
                        backgroundColor: c,
                        opacity: used && !selected ? 0.3 : 1,
                        borderWidth: selected ? 3 : 0,
                        borderColor: '#FFF',
                        transform: [{ scale: selected ? 1.15 : 1 }],
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* Quick adjustment */}
        {!editMode && (
          <View style={[styles.adjustCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={[styles.sectionLabel, { color: palette.mutedForeground }]}>Adjust Balance</Text>
            <View style={[styles.adjustInput, { borderColor: palette.border, backgroundColor: palette.muted }]}>
              <Text style={[styles.adjCurrency, { color: palette.primary }]}>{currency}</Text>
              <TextInput
                style={[styles.adjTextInput, { color: palette.foreground }]}
                keyboardType="numeric"
                value={adjustAmt}
                onChangeText={t => setAdjustAmt(t.replace(/[^0-9]/g, ''))}
                placeholder="Amount"
                placeholderTextColor={palette.mutedForeground}
                selectionColor={palette.primary}
              />
            </View>
            <View style={styles.adjBtns}>
              <Pressable
                onPress={() => handleAdjust(false)}
                style={({ pressed }) => [styles.adjBtn, { backgroundColor: palette.destructive + '22', borderColor: palette.destructive + '55', opacity: pressed ? 0.8 : 1 }]}
              >
                <MaterialCommunityIcons name="minus" size={18} color={palette.destructive} />
                <Text style={[styles.adjBtnText, { color: palette.destructive }]}>Pay Bank</Text>
              </Pressable>
              <Pressable
                onPress={() => handleAdjust(true)}
                style={({ pressed }) => [styles.adjBtn, { backgroundColor: palette.success + '22', borderColor: palette.success + '55', opacity: pressed ? 0.8 : 1 }]}
              >
                <MaterialCommunityIcons name="plus" size={18} color={palette.success} />
                <Text style={[styles.adjBtnText, { color: palette.success }]}>Receive</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Transaction history */}
        {!editMode && playerTransactions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.foreground }]}>Recent Transactions</Text>
            {playerTransactions.slice(0, 10).map(t => (
              <TransactionItem key={t.id} transaction={t} />
            ))}
          </View>
        )}

        {/* Delete button */}
        {editMode && (
          <Pressable
            onPress={handleDelete}
            style={({ pressed }) => [styles.deleteBtn, { borderColor: palette.destructive, opacity: pressed ? 0.8 : 1 }]}
          >
            <MaterialCommunityIcons name="account-remove" size={18} color={palette.destructive} />
            <Text style={[styles.deleteBtnText, { color: palette.destructive }]}>Remove Player</Text>
          </Pressable>
        )}
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
  editBtn: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  scroll: { padding: 20, gap: 20 },
  profile: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    padding: 20, borderRadius: 18, borderWidth: 1,
  },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  profileBalance: { fontFamily: 'Inter_700Bold', fontSize: 26 },
  nameInput: {
    fontFamily: 'Inter_700Bold', fontSize: 22, borderBottomWidth: 2,
    paddingBottom: 2, color: 'inherit',
  },
  section: { gap: 12 },
  sectionLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorBtn: { width: 44, height: 44, borderRadius: 22 },
  adjustCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  adjustInput: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, paddingHorizontal: 12, height: 48, borderWidth: 1,
  },
  adjCurrency: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  adjTextInput: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 22, padding: 0 },
  adjBtns: { flexDirection: 'row', gap: 10 },
  adjBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1,
  },
  adjBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5,
  },
  deleteBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
});
