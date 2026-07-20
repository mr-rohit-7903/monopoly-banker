import React, { useState, useEffect } from 'react';
import {
  Alert, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { PlayerCard } from '@/components/PlayerCard';
import { DiceRoller } from '@/components/DiceRoller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnboardingScreen } from '@/components/OnboardingScreen';

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
  const [hasSeenCode, setHasSeenCode] = useState(false);

  const appMode = useGameStore(s => s.appMode);

  // Multiplayer state
  const mpStatus = useMultiplayerStore(s => s.status);
  const roomCode = useMultiplayerStore(s => s.roomCode);
  const isHost = useMultiplayerStore(s => s.isHost);
  const myName = useMultiplayerStore(s => s.myName);
  const firebaseConfigured = useMultiplayerStore(s => s.firebaseConfigured);
  const mpError = useMultiplayerStore(s => s.error);

  const { leaveGame, checkFirebaseConfig } = useMultiplayerStore();

  // Check firebase config on mount
  useEffect(() => {
    checkFirebaseConfig();
  }, []);

  // Reset code modal when leaving room
  useEffect(() => {
    if (!roomCode) {
      setHasSeenCode(false);
    }
  }, [roomCode]);

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

  if (!appMode) {
    return <OnboardingScreen />;
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

      {/* Room Code Modal */}
      <Modal visible={isHost && !!roomCode && !hasSeenCode} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={[styles.winnerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <MaterialCommunityIcons name="party-popper" size={48} color={colors.primary} />
            <Text style={[styles.winnerTitle, { color: colors.foreground }]}>Room Created!</Text>
            <Text style={[styles.winnerSub, { color: colors.mutedForeground }]}>
              Share this code with other players so they can join your game.
            </Text>
            
            <View style={{ backgroundColor: colors.background, padding: 16, borderRadius: 12, marginBottom: 20, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 36, letterSpacing: 8, color: colors.foreground }}>
                {roomCode}
              </Text>
            </View>

            <Pressable
              onPress={() => setHasSeenCode(true)}
              style={({ pressed }) => [{ width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={styles.winnerConfirmText}>Got it</Text>
            </Pressable>
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
        {/* Player List */}
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

      {canAddPlayer && appMode === 'offline' && (
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
  scroll: { padding: 16, gap: 12 },
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
  // Multiplayer Card
  mpCard: {
    borderRadius: 16, borderWidth: 1, padding: 16, gap: 10,
  },
  mpCardHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  mpCardTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  mpCardSub: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18 },
  mpLiveDot: { width: 8, height: 8, borderRadius: 4 },
  mpLiveText: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  mpRoleBadge: {
    fontFamily: 'Inter_700Bold', fontSize: 10, paddingHorizontal: 8,
    paddingVertical: 3, borderRadius: 6, letterSpacing: 1,
  },
  mpCodeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mpCodeLabel: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  mpCode: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: 6 },
  mpMyName: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  mpLeaveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, marginTop: 4,
  },
  mpLeaveBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
});
