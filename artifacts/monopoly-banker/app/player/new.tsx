import React, { useState } from 'react';
import {
  Alert, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useGameStore } from '@/store/gameStore';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import colors from '@/constants/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PLAYER_COLORS = colors.playerColors;

export default function NewPlayerScreen() {
  const palette = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const players = useGameStore(s => s.players);
  const addPlayer = useGameStore(s => s.addPlayer);
  const startingMoney = useGameStore(s => s.settings.startingMoney);
  const currency = useGameStore(s => s.settings.currency);

  const usedColors = players.map(p => p.color);
  const defaultColor = PLAYER_COLORS.find(c => !usedColors.includes(c)) ?? PLAYER_COLORS[0];

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(defaultColor);
  const [focused, setFocused] = useState(false);

  function handleAdd() {
    const trimmed = name.trim();
    if (!trimmed) { Alert.alert('Enter a name'); return; }
    if (players.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
      Alert.alert('Duplicate', 'A player with this name already exists');
      return;
    }
    addPlayer(trimmed, selectedColor);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: palette.background, borderBottomColor: palette.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text style={[styles.cancel, { color: palette.destructive }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.title, { color: palette.foreground }]}>Add Player</Text>
        <Pressable onPress={handleAdd} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text style={[styles.done, { color: palette.primary }]}>Add</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 30 }]}>
        {/* Preview */}
        <View style={[styles.preview, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <PlayerAvatar name={name || 'New'} color={selectedColor} size={72} />
          <View>
            <Text style={[styles.previewName, { color: palette.foreground }]}>
              {name || 'Player Name'}
            </Text>
            <Text style={[styles.previewBalance, { color: palette.primary }]}>
              Starts with {currency}{startingMoney.toLocaleString()}
            </Text>
          </View>
        </View>

        {/* Name input */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: palette.mutedForeground }]}>Name</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: palette.card,
                borderColor: focused ? palette.primary : palette.border,
                borderWidth: focused ? 2 : 1,
                color: palette.foreground,
              },
            ]}
            placeholder="Enter player name"
            placeholderTextColor={palette.mutedForeground}
            value={name}
            onChangeText={setName}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoFocus
            maxLength={20}
            returnKeyType="done"
            onSubmitEditing={handleAdd}
            selectionColor={palette.primary}
          />
        </View>

        {/* Color picker */}
        <View style={styles.field}>
          <Text style={[styles.label, { color: palette.mutedForeground }]}>Color</Text>
          <View style={styles.colorGrid}>
            {PLAYER_COLORS.map(color => {
              const used = usedColors.includes(color);
              const selected = selectedColor === color;
              return (
                <Pressable
                  key={color}
                  onPress={() => { if (!used) { setSelectedColor(color); Haptics.selectionAsync(); } }}
                  style={({ pressed }) => [
                    styles.colorBtn,
                    {
                      backgroundColor: color,
                      opacity: pressed ? 0.8 : used && !selected ? 0.3 : 1,
                      borderWidth: selected ? 3 : 0,
                      borderColor: '#FFFFFF',
                      transform: [{ scale: selected ? 1.15 : 1 }],
                    },
                  ]}
                />
              );
            })}
          </View>
        </View>

        {/* Submit */}
        <Pressable
          onPress={handleAdd}
          style={({ pressed }) => [
            styles.addBtn,
            { backgroundColor: palette.primary, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={[styles.addBtnText, { color: palette.primaryForeground }]}>Add Player</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  cancel: { fontFamily: 'Inter_500Medium', fontSize: 16 },
  done: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  scroll: { padding: 20, gap: 24 },
  preview: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    padding: 20, borderRadius: 18, borderWidth: 1,
  },
  previewName: { fontFamily: 'Inter_700Bold', fontSize: 20, marginBottom: 4 },
  previewBalance: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  field: { gap: 10 },
  label: { fontFamily: 'Inter_500Medium', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderRadius: 12, paddingHorizontal: 14, height: 50, fontFamily: 'Inter_500Medium', fontSize: 16 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  colorBtn: { width: 48, height: 48, borderRadius: 24 },
  addBtn: { paddingVertical: 16, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  addBtnText: { fontFamily: 'Inter_700Bold', fontSize: 17 },
});
