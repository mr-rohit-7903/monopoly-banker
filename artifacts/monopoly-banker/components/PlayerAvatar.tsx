import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getInitials } from '@/utils/format';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface Props {
  name: string;
  color: string;
  size?: number;
}

export function PlayerAvatar({ name, color, size = 44 }: Props) {
  const fontSize = size * 0.38;
  const isBank = name.trim() === 'Bank';
  
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isBank ? '#607D8B' : color,
        },
      ]}
    >
      {isBank ? (
        <MaterialCommunityIcons name="bank" size={fontSize * 1.5} color="#FFFFFF" />
      ) : (
        <Text style={[styles.initials, { fontSize }]}>
          {getInitials(name)}
        </Text>
      )}
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
