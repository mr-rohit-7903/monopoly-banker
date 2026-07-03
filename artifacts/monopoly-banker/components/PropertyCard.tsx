import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { MonopolyProperty } from '@/constants/monopoly';
import { useGameStore } from '@/store/gameStore';
import { formatMoney } from '@/utils/format';
import { PlayerAvatar } from './PlayerAvatar';

interface Props {
  property: MonopolyProperty;
  onPress?: () => void;
}

export function PropertyCard({ property, onPress }: Props) {
  const colors = useColors();
  const players = useGameStore(s => s.players);
  const ownership = useGameStore(s => s.propertyOwnerships[property.id]);
  const currency = useGameStore(s => s.settings.currency);

  const owner = ownership?.ownerId ? players.find(p => p.id === ownership.ownerId) : null;
  const isMortgaged = ownership?.isMortgaged ?? false;
  const houses = ownership?.houses ?? 0;
  const hotel = ownership?.hotel ?? false;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
        isMortgaged && { opacity: 0.65 },
      ]}
    >
      <View style={[styles.colorStrip, { backgroundColor: property.groupColor }]} />
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={2}>
            {property.name}
          </Text>
          {owner && <PlayerAvatar name={owner.name} color={owner.color} size={26} />}
        </View>
        <View style={styles.footer}>
          <Text style={[styles.price, { color: colors.mutedForeground }]}>
            {formatMoney(property.price, currency)}
          </Text>
          {isMortgaged && (
            <View style={[styles.badge, { backgroundColor: colors.destructive + '22' }]}>
              <Text style={[styles.badgeText, { color: colors.destructive }]}>Mortgaged</Text>
            </View>
          )}
          {hotel && (
            <MaterialCommunityIcons name="home" size={14} color={colors.destructive} />
          )}
          {!hotel && houses > 0 && (
            <View style={styles.houses}>
              {Array.from({ length: houses }).map((_, i) => (
                <View key={i} style={[styles.house, { backgroundColor: '#4CAF50' }]} />
              ))}
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    flex: 1,
    minWidth: 140,
    maxWidth: '48%',
  },
  colorStrip: {
    height: 8,
  },
  body: {
    padding: 10,
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  name: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    lineHeight: 17,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  price: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
  houses: {
    flexDirection: 'row',
    gap: 2,
  },
  house: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
});
