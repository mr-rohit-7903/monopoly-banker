import React, { useState } from 'react';
import {
  Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useGameStore, Player } from '@/store/gameStore';
import { PlayerCard } from '@/components/PlayerCard';
import { DiceRoller } from '@/components/DiceRoller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MAX_PLAYERS = 5;

export default function PlayersScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const players = useGameStore(s => s.players);
  const transactions = useGameStore(s => s.transactions);
  const removePlayer = useGameStore(s => s.removePlayer);
  const [diceVisible, setDiceVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Player | null>(null);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const canAddPlayer = players.length < MAX_PLAYERS && transactions.length === 0;

  function confirmDelete() {
    if (!deleteTarget) return;
    removePlayer(deleteTarget.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setDeleteTarget(null);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DiceRoller visible={diceVisible} onClose={() => setDiceVisible(false)} />

      {/* ── Delete confirmation modal ── */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setDeleteTarget(null)}>
          <Pressable style={[styles.deleteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Colour strip */}
            {deleteTarget && (
              <View style={[styles.deleteStrip, { backgroundColor: deleteTarget.color }]} />
            )}
            <View style={styles.deleteBody}>
              <MaterialCommunityIcons name="account-remove" size={32} color={colors.destructive} />
              <Text style={[styles.deleteTitle, { color: colors.foreground }]}>
                Remove {deleteTarget?.name}?
              </Text>
              <Text style={[styles.deleteSub, { color: colors.mutedForeground }]}>
                This will remove the player and release all their properties back to the bank.
              </Text>
              <View style={styles.deleteBtns}>
                <Pressable
                  onPress={() => setDeleteTarget(null)}
                  style={({ pressed }) => [
                    styles.deleteCancel,
                    { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[styles.deleteCancelText, { color: colors.foreground }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={confirmDelete}
                  style={({ pressed }) => [
                    styles.deleteConfirm,
                    { backgroundColor: colors.destructive, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Text style={styles.deleteConfirmText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Players</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {players.length} / {MAX_PLAYERS} players
          </Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => setDiceVisible(true)}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }]}
          >
            <MaterialCommunityIcons name="dice-5" size={22} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 }]}
          >
            <MaterialCommunityIcons name="cog" size={22} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {players.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="account-group" size={56} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No players yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Add up to {MAX_PLAYERS} players to start
            </Text>
          </View>
        ) : (
          <View>
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>Tap a player to remove them</Text>
            {players.map(player => (
              <PlayerCard
                key={player.id}
                player={player}
                onPress={() => setDeleteTarget(player)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {canAddPlayer && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push('/player/new');
          }}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: colors.primary,
              bottom: insets.bottom + (Platform.OS === 'web' ? 84 : 80),
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <MaterialCommunityIcons name="account-plus" size={24} color={colors.primaryForeground} />
          <Text style={[styles.fabText, { color: colors.primaryForeground }]}>Add Player</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 28 },
  headerSub: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 4 },
  hint: { fontFamily: 'Inter_400Regular', fontSize: 12, marginBottom: 8 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 15, textAlign: 'center' },
  // Delete modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  deleteStrip: { height: 6 },
  deleteBody: { padding: 24, alignItems: 'center', gap: 12 },
  deleteTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, textAlign: 'center' },
  deleteSub: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  deleteBtns: { flexDirection: 'row', gap: 12, marginTop: 8, width: '100%' },
  deleteCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, alignItems: 'center',
  },
  deleteCancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  deleteConfirm: {
    flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center',
  },
  deleteConfirmText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
});
