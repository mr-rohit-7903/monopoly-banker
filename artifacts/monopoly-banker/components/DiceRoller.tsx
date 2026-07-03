import React, { useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const DICE_ICONS: Record<number, keyof typeof MaterialCommunityIcons.glyphMap> = {
  1: 'dice-1', 2: 'dice-2', 3: 'dice-3', 4: 'dice-4', 5: 'dice-5', 6: 'dice-6',
};

export function DiceRoller({ visible, onClose }: Props) {
  const colors = useColors();
  const [d1, setD1] = useState(1);
  const [d2, setD2] = useState(1);
  const [rolled, setRolled] = useState(false);

  function rollDice() {
    const n1 = Math.floor(Math.random() * 6) + 1;
    const n2 = Math.floor(Math.random() * 6) + 1;
    setD1(n1);
    setD2(n2);
    setRolled(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  const isDoubles = rolled && d1 === d2;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Dice Roller</Text>
          <View style={styles.diceRow}>
            <MaterialCommunityIcons name={DICE_ICONS[d1]} size={80} color={colors.primary} />
            <MaterialCommunityIcons name={DICE_ICONS[d2]} size={80} color={colors.primary} />
          </View>
          {rolled && (
            <View style={styles.result}>
              <Text style={[styles.total, { color: colors.foreground }]}>Total: {d1 + d2}</Text>
              {isDoubles && (
                <Text style={[styles.doubles, { color: colors.accent }]}>Doubles!</Text>
              )}
            </View>
          )}
          <Pressable
            onPress={rollDice}
            style={({ pressed }) => [
              styles.rollBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[styles.rollText, { color: colors.primaryForeground }]}>Roll Dice</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    width: 300,
    padding: 28,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    gap: 20,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
  },
  diceRow: {
    flexDirection: 'row',
    gap: 16,
  },
  result: {
    alignItems: 'center',
    gap: 4,
  },
  total: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 18,
  },
  doubles: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
  rollBtn: {
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  rollText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
  },
});
