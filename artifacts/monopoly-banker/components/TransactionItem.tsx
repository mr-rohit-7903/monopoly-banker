import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { Transaction } from '@/store/gameStore';
import { formatMoney, timeAgo } from '@/utils/format';
import { useGameStore } from '@/store/gameStore';

interface Props {
  transaction: Transaction;
}

function getIcon(type: Transaction['type']): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (type) {
    case 'salary':        return 'cash-plus';
    case 'income_tax':    return 'file-document';
    case 'luxury_tax':    return 'diamond';
    case 'mortgage':      return 'bank-minus';
    case 'unmortgage':    return 'bank-plus';
    case 'property_buy':  return 'home-plus';
    case 'property_sell': return 'home-minus';
    case 'ticket_buy':    return 'ticket-outline';
    case 'ticket_win':    return 'ticket-percent';
    case 'bank_give':     return 'bank-transfer-out';
    case 'bank_receive':  return 'bank-transfer-in';
    default:              return 'swap-horizontal';
  }
}

function getIconColor(type: Transaction['type'], colors: ReturnType<typeof useColors>): string {
  switch (type) {
    case 'income_tax':
    case 'luxury_tax':
    case 'ticket_buy':    return colors.warning;
    case 'salary':
    case 'bank_give':
    case 'ticket_win':    return colors.success;
    case 'property_buy':  return colors.primary;
    case 'mortgage':      return colors.destructive;
    default:              return colors.primary;
  }
}

export function TransactionItem({ transaction }: Props) {
  const colors = useColors();
  const players = useGameStore(s => s.players);
  const currency = useGameStore(s => s.settings.currency);

  const from = transaction.fromId ? players.find(p => p.id === transaction.fromId) : null;
  const to   = transaction.toId   ? players.find(p => p.id === transaction.toId)   : null;
  const fromName = from?.name ?? 'Bank';
  const toName   = to?.name   ?? 'Bank';

  const iconColor = getIconColor(transaction.type, colors);

  return (
    <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <View style={[styles.iconBox, { backgroundColor: iconColor + '20' }]}>
        <MaterialCommunityIcons name={getIcon(transaction.type)} size={20} color={iconColor} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.description, { color: colors.foreground }]} numberOfLines={1}>
          {transaction.description}
        </Text>
        <Text style={[styles.parties, { color: colors.mutedForeground }]} numberOfLines={1}>
          {fromName} → {toName}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: colors.foreground }]}>
          {formatMoney(transaction.amount, currency)}
        </Text>
        <Text style={[styles.time, { color: colors.mutedForeground }]}>
          {timeAgo(transaction.timestamp)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8, gap: 12,
  },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  description: { fontFamily: 'Inter_500Medium', fontSize: 14, marginBottom: 2 },
  parties: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  right: { alignItems: 'flex-end' },
  amount: { fontFamily: 'Inter_700Bold', fontSize: 15, marginBottom: 2 },
  time: { fontFamily: 'Inter_400Regular', fontSize: 11 },
});
