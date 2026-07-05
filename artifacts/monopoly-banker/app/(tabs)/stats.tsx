import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useGameStore } from '@/store/gameStore';
import { StatCard } from '@/components/StatCard';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { formatMoney, formatDuration } from '@/utils/format';
import { useProperties } from '@/hooks/useProperties';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StatsScreen() {
  const colors = useColors();
  const properties = useProperties();
  const insets = useSafeAreaInsets();
  const players = useGameStore(s => s.players);

  const transactions = useGameStore(s => s.transactions);
  const propertyOwnerships = useGameStore(s => s.propertyOwnerships);
  const currency = useGameStore(s => s.settings.currency);
  const gameStartTime = useGameStore(s => s.gameStartTime);

  const topPad = Platform.OS === 'web' ? 16 : insets.top;

  const totalInCirculation = players.reduce((sum, p) => sum + p.balance, 0);
  const richest = players.length > 0
    ? players.reduce((a, b) => a.balance > b.balance ? a : b)
    : null;
  const poorest = players.length > 0
    ? players.reduce((a, b) => a.balance < b.balance ? a : b)
    : null;

  const gameDuration = Date.now() - gameStartTime;

  // Property stats
  const playerPropertyCounts = players.map(p => ({
    player: p,
    count: Object.values(propertyOwnerships).filter(o => o.ownerId === p.id).length,
    netWorth: p.balance + Object.entries(propertyOwnerships)
      .filter(([, o]) => o.ownerId === p.id)
      .reduce((sum, [id]) => {
        const prop = properties.find(pp => pp.id === id);
        return sum + (prop?.price ?? 0);
      }, 0),
  })).sort((a, b) => b.netWorth - a.netWorth);

  const totalTransactions = transactions.length;
  const ownedProperties = Object.values(propertyOwnerships).filter(o => o.ownerId !== null).length;
  const mortgagedProperties = Object.values(propertyOwnerships).filter(o => o.isMortgaged).length;


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Statistics</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {players.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="chart-bar" size={56} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No stats yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Add players to see statistics
            </Text>
          </View>
        ) : (
          <>
            {/* Richest player hero */}
            {richest && (
              <View style={[styles.heroCard, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '44' }]}>
                <View style={styles.heroContent}>
                  <MaterialCommunityIcons name="crown" size={28} color={colors.accent} />
                  <View style={styles.heroText}>
                    <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>Richest Player</Text>
                    <Text style={[styles.heroName, { color: colors.foreground }]}>{richest.name}</Text>
                    <Text style={[styles.heroValue, { color: colors.primary }]}>
                      {formatMoney(richest.balance, currency)}
                    </Text>
                  </View>
                  <PlayerAvatar name={richest.name} color={richest.color} size={52} />
                </View>
              </View>
            )}

            {/* Quick stats */}
            <View style={styles.grid}>
              <StatCard
                label="In Circulation"
                value={formatMoney(totalInCirculation, currency)}
                icon="cash-multiple"
              />
              <StatCard
                label="Bank"
                value="Unlimited"
                icon="bank"
                accent
              />
            </View>

            <View style={styles.grid}>
              <StatCard
                label="Game Duration"
                value={formatDuration(gameDuration)}
                icon="timer"
              />
              <StatCard
                label="Transactions"
                value={totalTransactions.toString()}
                icon="swap-horizontal"
                accent
              />
            </View>

            <View style={styles.grid}>
              <StatCard
                label="Properties Sold"
                value={`${ownedProperties} / ${properties.length}`}
                icon="home-group"
              />
            </View>

            {mortgagedProperties > 0 && (
              <StatCard
                label="Mortgaged Properties"
                value={mortgagedProperties.toString()}
                icon="bank-minus"
                fullWidth
              />
            )}

            {/* Net Worth Leaderboard */}
            {playerPropertyCounts.length > 0 && (
              <View style={[styles.leaderboard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.leaderboardTitle, { color: colors.foreground }]}>Net Worth Leaderboard</Text>
                {playerPropertyCounts.map((item, index) => (
                  <View key={item.player.id} style={[styles.leaderRow, index < playerPropertyCounts.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                    <Text style={[styles.rankNum, { color: index === 0 ? colors.accent : colors.mutedForeground }]}>
                      {index === 0 ? '👑' : `#${index + 1}`}
                    </Text>
                    <PlayerAvatar name={item.player.name} color={item.player.color} size={32} />
                    <View style={styles.leaderInfo}>
                      <Text style={[styles.leaderName, { color: colors.foreground }]}>{item.player.name}</Text>
                      <Text style={[styles.leaderSub, { color: colors.mutedForeground }]}>
                        {formatMoney(item.player.balance, currency)} cash · {item.count} {item.count === 1 ? 'property' : 'properties'}
                      </Text>
                    </View>
                    <Text style={[styles.leaderNetWorth, { color: index === 0 ? colors.primary : colors.foreground }]}>
                      {formatMoney(item.netWorth, currency)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Cash share bar */}
            {players.length > 1 && totalInCirculation > 0 && (
              <View style={[styles.shareBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.leaderboardTitle, { color: colors.foreground }]}>Cash Share</Text>
                <View style={styles.barContainer}>
                  {players.map(p => (
                    <View
                      key={p.id}
                      style={[
                        styles.barSegment,
                        { backgroundColor: p.color, flex: p.balance / totalInCirculation },
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.barLegend}>
                  {players.map(p => (
                    <View key={p.id} style={styles.barLegendRow}>
                      <View style={[styles.barLegendDot, { backgroundColor: p.color }]} />
                      <Text style={[styles.barLegendName, { color: colors.foreground }]}>{p.name}</Text>
                      <Text style={[styles.barLegendPct, { color: colors.mutedForeground }]}>
                        {Math.round((p.balance / totalInCirculation) * 100)}%
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Poorest warning */}
            {poorest && players.length > 1 && poorest.balance < 100 && (
              <View style={[styles.warningCard, { backgroundColor: colors.warning + '18', borderColor: colors.warning + '55' }]}>
                <MaterialCommunityIcons name="alert" size={20} color={colors.warning} />
                <Text style={[styles.warningText, { color: colors.foreground }]}>
                  {poorest.name} is running low — {formatMoney(poorest.balance, currency)} remaining
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 28 },
  scroll: { padding: 16, gap: 14 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 15, textAlign: 'center' },
  heroCard: { borderRadius: 18, borderWidth: 1, padding: 20 },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroText: { flex: 1 },
  heroLabel: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  heroName: { fontFamily: 'Inter_700Bold', fontSize: 22, marginTop: 2 },
  heroValue: { fontFamily: 'Inter_700Bold', fontSize: 18, marginTop: 4 },
  grid: { flexDirection: 'row', gap: 12 },
  leaderboard: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  leaderboardTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, padding: 16, paddingBottom: 12 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  rankNum: { fontFamily: 'Inter_700Bold', fontSize: 16, width: 28, textAlign: 'center' },
  leaderInfo: { flex: 1 },
  leaderName: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  leaderSub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  leaderNetWorth: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  shareBar: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  barContainer: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 },
  barSegment: { borderRadius: 3 },
  barLegend: { gap: 6 },
  barLegendRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLegendDot: { width: 10, height: 10, borderRadius: 5 },
  barLegendName: { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1 },
  barLegendPct: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  warningCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  warningText: { fontFamily: 'Inter_400Regular', fontSize: 14, flex: 1 },
});
