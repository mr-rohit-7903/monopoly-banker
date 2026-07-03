import React from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useGameStore } from '@/store/gameStore';
import { StatCard } from '@/components/StatCard';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { formatMoney, formatDuration } from '@/utils/format';
import { MONOPOLY_PROPERTIES } from '@/constants/monopoly';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StatsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const players = useGameStore(s => s.players);
  const bankBalance = useGameStore(s => s.bankBalance);
  const transactions = useGameStore(s => s.transactions);
  const propertyOwnerships = useGameStore(s => s.propertyOwnerships);
  const currency = useGameStore(s => s.settings.currency);
  const gameStartTime = useGameStore(s => s.gameStartTime);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const totalInCirculation = players.reduce((sum, p) => sum + p.balance, 0);
  const richest = players.length > 0
    ? players.reduce((a, b) => a.balance > b.balance ? a : b)
    : null;
  const poorest = players.length > 0
    ? players.reduce((a, b) => a.balance < b.balance ? a : b)
    : null;

  const gameDuration = Date.now() - gameStartTime;

  // Property ownership per player
  const playerPropertyCounts = players.map(p => ({
    player: p,
    count: Object.values(propertyOwnerships).filter(o => o.ownerId === p.id).length,
    netWorth: p.balance + Object.entries(propertyOwnerships)
      .filter(([, o]) => o.ownerId === p.id)
      .reduce((sum, [id]) => {
        const prop = MONOPOLY_PROPERTIES.find(pp => pp.id === id);
        return sum + (prop?.price ?? 0);
      }, 0),
  })).sort((a, b) => b.netWorth - a.netWorth);

  const totalTransactions = transactions.length;
  const ownedProperties = Object.values(propertyOwnerships).filter(o => o.ownerId !== null).length;
  const mortgagedProperties = Object.values(propertyOwnerships).filter(o => o.isMortgaged).length;
  const ticketsBought = transactions.filter(t => t.type === 'ticket_buy').length;
  const ticketWinnings = transactions
    .filter(t => t.type === 'ticket_win')
    .reduce((sum, t) => sum + t.amount, 0);

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
            {/* Richest / Poorest */}
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

            {/* Quick stats grid */}
            <View style={styles.grid}>
              <StatCard
                label="In Circulation"
                value={formatMoney(totalInCirculation, currency)}
                icon="cash-multiple"
              />
              <StatCard
                label="Bank Balance"
                value={formatMoney(bankBalance, currency)}
                icon="bank"
                accent
              />
            </View>
            <View style={styles.grid}>
              <StatCard
                label="Tickets Bought"
                value={ticketsBought.toString()}
                icon="ticket-outline"
                accent
              />
              <StatCard
                label="Game Duration"
                value={formatDuration(gameDuration)}
                icon="timer"
              />
            </View>
            {ticketWinnings > 0 && (
              <StatCard
                label="Total Ticket Winnings"
                value={formatMoney(ticketWinnings, currency)}
                icon="ticket-percent"
                fullWidth
              />
            )}
            <View style={styles.grid}>
              <StatCard
                label="Transactions"
                value={totalTransactions.toString()}
                icon="swap-horizontal"
              />
              <StatCard
                label="Properties Sold"
                value={`${ownedProperties} / ${MONOPOLY_PROPERTIES.length}`}
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
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Net Worth</Text>
            <View style={[styles.leaderboard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {playerPropertyCounts.map((item, i) => (
                <View
                  key={item.player.id}
                  style={[
                    styles.leaderRow,
                    i < playerPropertyCounts.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                  ]}
                >
                  <Text style={[styles.rank, { color: colors.mutedForeground }]}>#{i + 1}</Text>
                  <PlayerAvatar name={item.player.name} color={item.player.color} size={36} />
                  <View style={styles.leaderInfo}>
                    <Text style={[styles.leaderName, { color: colors.foreground }]}>{item.player.name}</Text>
                    <Text style={[styles.leaderSub, { color: colors.mutedForeground }]}>
                      {formatMoney(item.player.balance, currency)} cash · {item.count} properties
                    </Text>
                  </View>
                  <Text style={[styles.leaderNet, { color: colors.primary }]}>
                    {formatMoney(item.netWorth, currency)}
                  </Text>
                </View>
              ))}
            </View>

            {/* Cash breakdown bar */}
            {players.length > 1 && totalInCirculation > 0 && (
              <>
                <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Cash Share</Text>
                <View style={[styles.barCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.bar}>
                    {players.map(p => (
                      <View
                        key={p.id}
                        style={[
                          styles.barSegment,
                          {
                            backgroundColor: p.color,
                            flex: p.balance / totalInCirculation,
                          },
                        ]}
                      />
                    ))}
                  </View>
                  <View style={styles.legend}>
                    {players.map(p => (
                      <View key={p.id} style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: p.color }]} />
                        <Text style={[styles.legendText, { color: colors.foreground }]}>{p.name}</Text>
                        <Text style={[styles.legendPct, { color: colors.mutedForeground }]}>
                          {Math.round((p.balance / totalInCirculation) * 100)}%
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
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
  heroCard: { borderRadius: 18, borderWidth: 1, padding: 20 },
  heroContent: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroText: { flex: 1, gap: 2 },
  heroLabel: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  heroName: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  heroValue: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  grid: { flexDirection: 'row', gap: 12 },
  sectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  leaderboard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  leaderRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rank: { fontFamily: 'Inter_700Bold', fontSize: 16, width: 28, textAlign: 'center' },
  leaderInfo: { flex: 1 },
  leaderName: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  leaderSub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 1 },
  leaderNet: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  barCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  bar: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden' },
  barSegment: { height: '100%' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  legendPct: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 12 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 15, textAlign: 'center' },
});
