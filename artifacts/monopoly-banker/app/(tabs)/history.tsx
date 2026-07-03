import React, { useState } from 'react';
import {
  Alert, FlatList, Platform, Pressable,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useGameStore } from '@/store/gameStore';
import { TransactionItem } from '@/components/TransactionItem';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const transactions = useGameStore(s => s.transactions);
  const players = useGameStore(s => s.players);
  const undoLastTransaction = useGameStore(s => s.undoLastTransaction);
  const [search, setSearch] = useState('');

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const reversed = [...transactions].reverse();
  const filtered = reversed.filter(t => {
    if (!search) return true;
    const q = search.toLowerCase();
    const from = t.fromId ? players.find(p => p.id === t.fromId)?.name.toLowerCase() : 'bank';
    const to = t.toId ? players.find(p => p.id === t.toId)?.name.toLowerCase() : 'bank';
    return (
      t.description.toLowerCase().includes(q) ||
      (from && from.includes(q)) ||
      (to && to.includes(q))
    );
  });

  function handleUndo() {
    Alert.alert(
      'Undo Last Transaction',
      'This will reverse the most recent transaction. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Undo',
          style: 'destructive',
          onPress: () => {
            undoLastTransaction();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>History</Text>
          {transactions.length > 0 && (
            <Pressable
              onPress={handleUndo}
              style={({ pressed }) => [
                styles.undoBtn,
                { backgroundColor: colors.destructive + '18', borderColor: colors.destructive + '44', opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <MaterialCommunityIcons name="undo" size={18} color={colors.destructive} />
              <Text style={[styles.undoText, { color: colors.destructive }]}>Undo</Text>
            </Pressable>
          )}
        </View>
        <View style={[styles.searchRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <MaterialCommunityIcons name="magnify" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search transactions..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            selectionColor={colors.primary}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="history" size={56} color={colors.border} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {search ? 'No results' : 'No transactions yet'}
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {search ? 'Try a different search' : 'Transactions will appear here'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={t => t.id}
          renderItem={({ item }) => <TransactionItem transaction={item} />}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 90 }]}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={[styles.count, { color: colors.mutedForeground }]}>
              {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 28 },
  undoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1,
  },
  undoText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, borderRadius: 12, height: 42, borderWidth: 1,
  },
  searchInput: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, padding: 0 },
  list: { padding: 14, gap: 0 },
  count: { fontFamily: 'Inter_400Regular', fontSize: 13, marginBottom: 10 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 60 },
  emptyTitle: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 15 },
});
