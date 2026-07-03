import React from 'react';
import { ScrollView, StyleSheet, Text, Pressable, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Player } from '@/store/gameStore';
import { PlayerAvatar } from './PlayerAvatar';

interface Props {
  players: Player[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  includeBank?: boolean;
  label?: string;
}

export function PlayerSelector({ players, selectedId, onSelect, includeBank = true, label }: Props) {
  const colors = useColors();

  const items = [
    ...(includeBank ? [{ id: null as null, name: 'Bank', color: colors.muted }] : []),
    ...players.map(p => ({ id: p.id as string | null, name: p.name, color: p.color })),
  ];

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map(item => {
          const isSelected = item.id === selectedId;
          return (
            <Pressable
              key={item.id ?? 'bank'}
              onPress={() => onSelect(item.id)}
              style={({ pressed }) => [
                styles.item,
                {
                  backgroundColor: isSelected ? colors.primary + '22' : colors.card,
                  borderColor: isSelected ? colors.primary : colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <PlayerAvatar name={item.name} color={item.color} size={36} />
              <Text style={[styles.name, { color: isSelected ? colors.primary : colors.foreground }]} numberOfLines={1}>
                {item.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    paddingHorizontal: 2,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  item: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
    minWidth: 70,
  },
  name: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    textAlign: 'center',
  },
});
