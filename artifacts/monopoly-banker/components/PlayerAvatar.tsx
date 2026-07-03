import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getInitials } from '@/utils/format';

interface Props {
  name: string;
  color: string;
  size?: number;
}

export function PlayerAvatar({ name, color, size = 44 }: Props) {
  const fontSize = size * 0.38;
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
  },
});
