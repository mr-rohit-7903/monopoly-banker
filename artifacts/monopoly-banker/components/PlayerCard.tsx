import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Player } from '@/store/gameStore';
import { formatMoney } from '@/utils/format';
import { PlayerAvatar } from './PlayerAvatar';
import { useGameStore } from '@/store/gameStore';

interface Props {
  player: Player;
  onPress?: () => void;
  isSelected?: boolean;
  compact?: boolean;
}

export function PlayerCard({ player, onPress, isSelected, compact = false }: Props) {
  const colors = useColors();
  const currency = useGameStore(s => s.settings.currency);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: isSelected ? colors.primary + '22' : colors.card,
          borderColor: isSelected ? colors.primary : colors.border,
          borderWidth: isSelected ? 2 : 1,
          opacity: pressed ? 0.85 : 1,
        },
        compact && styles.compact,
      ]}
    >
      <View style={[styles.colorBar, { backgroundColor: player.color }]} />
      <View style={styles.content}>
        <PlayerAvatar name={player.name} color={player.color} size={compact ? 36 : 44} />
        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
            {player.name}
          </Text>
          <Text style={[styles.balance, { color: colors.primary }]}>
            {formatMoney(player.balance, currency)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: 10,
  },
  compact: {
    marginBottom: 6,
  },
  colorBar: {
    width: 5,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    marginBottom: 2,
  },
  balance: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
});
