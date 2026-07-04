import React, { useState } from 'react';
import {
  Platform, Pressable, ScrollView,
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

const MAX_PLAYERS = 5;

export default function PlayersScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const players = useGameStore(s => s.players);
  const transactions = useGameStore(s => s.transactions);
  const [diceVisible, setDiceVisible] = useState(false);

  const topPad = Platform.OS === 'web' ? 16 : insets.top;
  const canAddPlayer = players.length < MAX_PLAYERS && transactions.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DiceRoller visible={diceVisible} onClose={() => setDiceVisible(false)} />

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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
});
