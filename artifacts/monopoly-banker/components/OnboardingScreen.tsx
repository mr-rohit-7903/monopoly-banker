import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, Platform, Alert, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { toast } from '@/components/Toast';

const ONLINE_COLORS = ['#E53935', '#1E88E5', '#FDD835', '#43A047'];
const COLOR_NAMES: Record<string, string> = {
  '#E53935': 'Red',
  '#1E88E5': 'Blue',
  '#FDD835': 'Yellow',
  '#43A047': 'Green'
};

export function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = (Platform.OS === 'web' ? 84 : insets.bottom + 70) + 24; // 84 for tab bar + 24 for normal padding

  const { setAppMode, addPlayer, updateSettings } = useGameStore();
  const { hostGame, joinGame, previewRoom } = useMultiplayerStore();

  const [step, setStep] = useState<'mode' | 'online_profile' | 'online_action' | 'join' | 'version'>('mode');
  const [pendingAction, setPendingAction] = useState<'offline' | 'host' | null>(null);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(ONLINE_COLORS[0]);
  const [selectedVersion, setSelectedVersion] = useState<'US' | 'IN' | 'INT'>('US');
  
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleHost() {
    setLoading(true);
    try {
      const playerId = addPlayer(name, selectedColor);
      await hostGame(name, playerId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAppMode('online');
    } catch (e: any) {
      toast.error(e.message || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!joinCode.trim() || joinCode.trim().length < 4) {
      toast.error('Enter a valid 4-character room code.');
      return;
    }
    setLoading(true);
    try {
      const state = await previewRoom(joinCode.trim().toUpperCase());
      if ((state.players?.length || 0) >= 4) {
        throw new Error('Room is full (max 4 players)');
      }
      
      const colorTaken = state.players?.some((p: any) => p.color === selectedColor);
      if (colorTaken) {
        throw new Error(`The color ${COLOR_NAMES[selectedColor]} is already taken in this room. Please go back and pick a different color.`);
      }
      
      // Join room and sync remote state down to local store
      await joinGame(joinCode.trim().toUpperCase(), name, undefined); // Pass undefined because player not added yet
      
      // Now that local store is in sync with host, add our player (this triggers sync back up)
      const playerId = useGameStore.getState().addPlayer(name, selectedColor);
      useMultiplayerStore.setState({ myPlayerId: playerId });
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setAppMode('online');
    } catch (e: any) {
      toast.error(e.message || 'Failed to join room');
    } finally {
      setLoading(false);
    }
  }

  if (step === 'mode') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: bottomPadding }]}>
        <MaterialCommunityIcons name="bank" size={80} color={colors.primary} style={styles.icon} />
        <Text style={[styles.title, { color: colors.foreground }]}>Monopoly Banker</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>How would you like to play?</Text>

        <View style={styles.btnGroup}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setPendingAction('offline');
              setStep('version');
            }}
            style={({ pressed }) => [styles.modeBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}
          >
            <MaterialCommunityIcons name="cellphone" size={32} color={colors.foreground} />
            <View style={styles.modeBtnTextCol}>
              <Text style={[styles.modeBtnTitle, { color: colors.foreground }]}>Offline Mode</Text>
              <Text style={[styles.modeBtnSub, { color: colors.mutedForeground }]}>Pass & Play on one device</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => { Haptics.selectionAsync(); setStep('online_profile'); }}
            style={({ pressed }) => [styles.modeBtn, { backgroundColor: colors.primary + '15', borderColor: colors.primary, borderWidth: 2, opacity: pressed ? 0.8 : 1 }]}
          >
            <MaterialCommunityIcons name="wifi" size={32} color={colors.primary} />
            <View style={styles.modeBtnTextCol}>
              <Text style={[styles.modeBtnTitle, { color: colors.primary }]}>Online Multiplayer</Text>
              <Text style={[styles.modeBtnSub, { color: colors.primary }]}>Connect multiple devices</Text>
            </View>
          </Pressable>
        </View>
      </View>
    );
  }

  if (step === 'online_profile') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: bottomPadding }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setStep('mode')} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Your Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.label, { color: colors.foreground }]}>Player Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="Enter your name"
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={setName}
            maxLength={15}
            autoFocus
          />

          <Text style={[styles.label, { color: colors.foreground, marginTop: 24 }]}>Choose Color</Text>
          <View style={styles.colorGrid}>
            {ONLINE_COLORS.map(c => (
              <Pressable
                key={c}
                onPress={() => { Haptics.selectionAsync(); setSelectedColor(c); }}
                style={[
                  styles.colorBtn,
                  { backgroundColor: c, borderColor: selectedColor === c ? colors.foreground : 'transparent' }
                ]}
              >
                {selectedColor === c && <MaterialCommunityIcons name="check" size={24} color="#FFF" />}
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          disabled={!name.trim()}
          onPress={() => { Haptics.selectionAsync(); setStep('online_action'); }}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: colors.primary, opacity: !name.trim() ? 0.5 : pressed ? 0.8 : 1 }
          ]}
        >
          <Text style={styles.primaryBtnText}>Next</Text>
        </Pressable>
      </View>
    );
  }

  if (step === 'online_action') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: bottomPadding }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setStep('online_profile')} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Multiplayer</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.contentCenter}>
          <Pressable
            disabled={loading}
            onPress={() => {
              Haptics.selectionAsync();
              setPendingAction('host');
              setStep('version');
            }}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.primary, opacity: loading ? 0.5 : pressed ? 0.8 : 1 }
            ]}
          >
            <MaterialCommunityIcons name="access-point" size={28} color="#fff" />
            <Text style={styles.actionBtnText}>{loading ? 'Creating...' : 'Host New Game'}</Text>
          </Pressable>

          <Text style={[styles.orText, { color: colors.mutedForeground }]}>- OR -</Text>

          <Pressable
            disabled={loading}
            onPress={() => setStep('join')}
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, opacity: loading ? 0.5 : pressed ? 0.8 : 1 }
            ]}
          >
            <MaterialCommunityIcons name="link-variant" size={28} color={colors.foreground} />
            <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Join Existing Game</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (step === 'join') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: bottomPadding }]}>
        <View style={styles.header}>
          <Pressable onPress={() => setStep('online_action')} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Join Game</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.label, { color: colors.foreground }]}>Room Code</Text>
          <TextInput
            style={[styles.input, styles.codeInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            placeholder="AB3K"
            placeholderTextColor={colors.mutedForeground}
            value={joinCode}
            onChangeText={(t) => setJoinCode(t.toUpperCase().slice(0, 4))}
            maxLength={4}
            autoCapitalize="characters"
            autoFocus
          />
        </View>

        <Pressable
          disabled={loading || joinCode.length < 4}
          onPress={handleJoin}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: colors.primary, opacity: loading || joinCode.length < 4 ? 0.5 : pressed ? 0.8 : 1 }
          ]}
        >
          <Text style={styles.primaryBtnText}>{loading ? 'Joining...' : 'Join Game'}</Text>
        </Pressable>
      </View>
    );
  }

  if (step === 'version') {
    const VERSIONS: { id: 'US' | 'IN' | 'INT', name: string, icon: any }[] = [
      { id: 'US', name: 'US Edition', icon: 'currency-usd' },
      { id: 'IN', name: 'India Edition', icon: 'currency-inr' },
      { id: 'INT', name: 'International', icon: 'earth' },
    ];

    const handleVersionSubmit = async () => {
      Haptics.selectionAsync();
      updateSettings({ version: selectedVersion });
      if (pendingAction === 'offline') {
        setAppMode('offline');
      } else if (pendingAction === 'host') {
        await handleHost();
      }
    };

    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingBottom: bottomPadding }]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              if (pendingAction === 'offline') setStep('mode');
              else setStep('online_action');
            }}
            style={styles.backBtn}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Game Version</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.subtitle, { color: colors.mutedForeground, marginBottom: 24 }]}>
            Select the Monopoly board version you are playing with to ensure proper properties and currency.
          </Text>

          <View style={{ gap: 12 }}>
            {VERSIONS.map(v => (
              <Pressable
                key={v.id}
                onPress={() => { Haptics.selectionAsync(); setSelectedVersion(v.id); }}
                style={({ pressed }) => [
                  styles.modeBtn,
                  {
                    backgroundColor: selectedVersion === v.id ? colors.primary + '15' : colors.card,
                    borderColor: selectedVersion === v.id ? colors.primary : colors.border,
                    borderWidth: selectedVersion === v.id ? 2 : 1,
                    opacity: pressed ? 0.8 : 1
                  }
                ]}
              >
                <MaterialCommunityIcons name={v.icon} size={32} color={selectedVersion === v.id ? colors.primary : colors.foreground} />
                <View style={styles.modeBtnTextCol}>
                  <Text style={[styles.modeBtnTitle, { color: selectedVersion === v.id ? colors.primary : colors.foreground }]}>{v.name}</Text>
                </View>
                {selectedVersion === v.id && (
                  <MaterialCommunityIcons name="check-circle" size={24} color={colors.primary} />
                )}
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          disabled={loading}
          onPress={handleVersionSubmit}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: colors.primary, opacity: loading ? 0.5 : pressed ? 0.8 : 1 }
          ]}
        >
          <Text style={styles.primaryBtnText}>{loading ? 'Creating...' : 'Start Game'}</Text>
        </Pressable>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  icon: {
    alignSelf: 'center',
    marginBottom: 24,
    marginTop: 60,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 48,
  },
  btnGroup: {
    gap: 16,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  modeBtnTextCol: {
    flex: 1,
  },
  modeBtnTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
    marginBottom: 4,
  },
  modeBtnSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Platform.OS === 'web' ? 20 : 40,
    marginBottom: 32,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  contentCenter: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
    marginBottom: 12,
  },
  input: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 18,
    fontFamily: 'Inter_500Medium',
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 8,
    height: 72,
  },
  colorGrid: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  colorBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  primaryBtnText: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  actionBtn: {
    flexDirection: 'row',
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  actionBtnText: {
    color: '#FFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 18,
  },
  orText: {
    textAlign: 'center',
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
  },
});
