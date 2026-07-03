import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useGameStore } from '@/store/gameStore';

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  label?: string;
}

const QUICK_AMOUNTS = [50, 100, 200, 500];

export function AmountInput({ value, onChange, placeholder = '0', label }: Props) {
  const colors = useColors();
  const currency = useGameStore(s => s.settings.currency);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: colors.card,
            borderColor: focused ? colors.primary : colors.border,
            borderWidth: focused ? 2 : 1,
          },
        ]}
      >
        <Text style={[styles.currency, { color: colors.primary }]}>{currency}</Text>
        <TextInput
          style={[styles.input, { color: colors.foreground }]}
          keyboardType="numeric"
          value={value}
          onChangeText={t => onChange(t.replace(/[^0-9]/g, ''))}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          selectionColor={colors.primary}
        />
      </View>
      <View style={styles.quickRow}>
        {QUICK_AMOUNTS.map(amt => (
          <Pressable
            key={amt}
            onPress={() => onChange((parseInt(value || '0') + amt).toString())}
            style={({ pressed }) => [
              styles.quickBtn,
              { backgroundColor: colors.muted, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.quickText, { color: colors.primary }]}>+{currency}{amt}</Text>
          </Pressable>
        ))}
      </View>
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
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    gap: 6,
  },
  currency: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_700Bold',
    fontSize: 28,
    padding: 0,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
});
