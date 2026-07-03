import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface Props {
  label: string;
  value: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  accent?: boolean;
  fullWidth?: boolean;
}

export function StatCard({ label, value, icon, accent, fullWidth }: Props) {
  const colors = useColors();
  const iconColor = accent ? colors.accent : colors.primary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          flex: fullWidth ? undefined : 1,
          width: fullWidth ? '100%' : undefined,
        },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: iconColor + '20' }]}>
        <MaterialCommunityIcons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
    gap: 8,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    lineHeight: 26,
  },
  label: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
});
