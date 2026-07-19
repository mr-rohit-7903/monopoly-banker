import React, { useState } from 'react';
import {
  Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useGameStore } from '@/store/gameStore';
import { PlayerCard } from '@/components/PlayerCard';
import { DiceRoller } from '@/components/DiceRoller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MAX_PLAYERS = 4;

export default function PlayersScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const players = useGameStore(s => s.players);
  const transactions = useGameStore(s => s.transactions);
  const [diceVisible, setDiceVisible] = useState(false);

  const { restartGame } = useGameStore();
  const [winnerAcknowledged, setWinnerAcknowledged] = useState(false);

  const topPad = Platform.OS === 'web' ? 16 : insets.top;
  const canAddPlayer = players.length < MAX_PLAYERS && transactions.length === 0;

  const activePlayers = players.filter(p => !p.isBankrupt);
  const hasWinner = players.length > 1 && activePlayers.length === 1 && !winnerAcknowledged;
  const winner = activePlayers[0];

  function handleRestart() {
    restartGame();
    setWinnerAcknowledged(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DiceRoller visible={diceVisible} onClose={() => setDiceVisible(false)} />

      {/* Winner Modal */}
      <Modal visible={hasWinner} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.winnerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="trophy" size={64} color="#FFD700" />
            <Text style={[styles.winnerTitle, { color: colors.foreground }]}>{winner?.name} Wins!</Text>
            <Text style={[styles.winnerSub, { color: colors.mutedForeground }]}>All other players have gone bankrupt.</Text>
            
            <View style={styles.winnerBtns}>
              <Pressable
                onPress={() => setWinnerAcknowledged(true)}
                style={({ pressed }) => [styles.winnerCancel, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={[styles.winnerCancelText, { color: colors.foreground }]}>Close</Text>
              </Pressable>
              <Pressable
                onPress={handleRestart}
                style={({ pressed }) => [styles.winnerConfirm, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
              >
                <Text style={styles.winnerConfirmText}>Restart Game</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
            <Text style={[styles.hint, { color: colors.mutedForeground }]}>Tap a player to view details</Text>
            {players.map(player => (
              <PlayerCard
                key={player.id}
                player={player}
                onPress={() => router.push(`/player/${player.id}`)}
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
    boxShadow: '0px 4px 8px rgba(0,0,0,0.2)',
    elevation: 6,
  },
  fabText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  // Winner Modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  winnerCard: {
    width: '100%', borderRadius: 20, borderWidth: 1,
    padding: 32, alignItems: 'center', gap: 12,
  },
  winnerTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, textAlign: 'center', marginTop: 8 },
  winnerSub: { fontFamily: 'Inter_400Regular', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 12 },
  winnerBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  winnerCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, alignItems: 'center',
  },
  winnerCancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  winnerConfirm: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  winnerConfirmText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' },
});
