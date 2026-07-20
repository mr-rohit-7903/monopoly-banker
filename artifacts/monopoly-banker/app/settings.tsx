import React, { useState, useEffect } from 'react';
import {
  Alert, Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { loadFirebaseConfig, clearFirebaseConfig, FirebaseConfig } from '@/config/firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from '@/components/Toast';
import { ConfirmModal } from '@/components/ConfirmModal';

type DarkMode = 'light' | 'dark' | 'system';

function SettingRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  const colors = useColors();
  return (
    <View style={[
      styles.settingRow,
      !last && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
    ]}>
      <Text style={[styles.settingLabel, { color: colors.foreground }]}>{label}</Text>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const palette = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const settings = useGameStore(s => s.settings);
  const transactions = useGameStore(s => s.transactions);
  const gameStarted = transactions.length > 0;
  const [showResetModal, setShowResetModal] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  // Multiplayer state for status card
  const mpStatus = useMultiplayerStore(s => s.status);
  const roomCode = useMultiplayerStore(s => s.roomCode);
  const isHost = useMultiplayerStore(s => s.isHost);
  const myName = useMultiplayerStore(s => s.myName);
  const players = useGameStore(s => s.players);

  // Multiplayer Modals State
  const [showHostModal, setShowHostModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [hostPlayerId, setHostPlayerId] = useState<string | null>(null);
  const [joinStep, setJoinStep] = useState<1 | 2>(1);
  const [joinCode, setJoinCode] = useState('');
  const [availablePlayers, setAvailablePlayers] = useState<any[]>([]);
  const [joinPlayerId, setJoinPlayerId] = useState<string | null>(null);
  const [hostLoading, setHostLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);

  // Firebase config state
  const { configureFirebase, firebaseConfigured, checkFirebaseConfig, leaveGame, hostGame, joinGame, previewRoom } = useMultiplayerStore();
  const { updateSettings, resetGame, setAppMode } = useGameStore();
  
  const topPad = Platform.OS === 'web' ? 16 : insets.top;
  const [startingMoneyStr, setStartingMoneyStr] = useState(settings.startingMoney.toString());
  const [salaryStr, setSalaryStr] = useState(settings.salaryAmount.toString());
  const [incomeTaxStr, setIncomeTaxStr] = useState(settings.incomeTaxAmount.toString());
  const [luxuryTaxStr, setLuxuryTaxStr] = useState(settings.luxuryTaxAmount.toString());
  const [fbApiKey, setFbApiKey] = useState('');
  const [fbAuthDomain, setFbAuthDomain] = useState('');
  const [fbDatabaseURL, setFbDatabaseURL] = useState('');
  const [fbProjectId, setFbProjectId] = useState('');
  const [fbStorageBucket, setFbStorageBucket] = useState('');
  const [fbMessagingSenderId, setFbMessagingSenderId] = useState('');
  const [fbAppId, setFbAppId] = useState('');
  const [fbSaving, setFbSaving] = useState(false);
  const [fbShowConfig, setFbShowConfig] = useState(false);

  // Load existing firebase config on mount
  useEffect(() => {
    loadFirebaseConfig().then(cfg => {
      if (cfg) {
        setFbApiKey(cfg.apiKey || '');
        setFbAuthDomain(cfg.authDomain || '');
        setFbDatabaseURL(cfg.databaseURL || '');
        setFbProjectId(cfg.projectId || '');
        setFbStorageBucket(cfg.storageBucket || '');
        setFbMessagingSenderId(cfg.messagingSenderId || '');
        setFbAppId(cfg.appId || '');
      }
    });
    checkFirebaseConfig();
  }, []);

  async function handleSaveFirebase() {
    if (!fbApiKey.trim() || !fbDatabaseURL.trim() || !fbProjectId.trim()) {
      const msg = 'API Key, Database URL, and Project ID are required.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Missing Fields', msg);
      return;
    }
    setFbSaving(true);
    const config: FirebaseConfig = {
      apiKey: fbApiKey.trim(),
      authDomain: fbAuthDomain.trim(),
      databaseURL: fbDatabaseURL.trim(),
      projectId: fbProjectId.trim(),
      storageBucket: fbStorageBucket.trim(),
      messagingSenderId: fbMessagingSenderId.trim(),
      appId: fbAppId.trim(),
    };
    const ok = await configureFirebase(config);
    setFbSaving(false);
    if (ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFbShowConfig(false);
    } else {
      toast.error('Failed to initialize Firebase. Check your credentials.');
    }
  }

  async function handleClearFirebase() {
    await clearFirebaseConfig();
    setFbApiKey(''); setFbAuthDomain(''); setFbDatabaseURL('');
    setFbProjectId(''); setFbStorageBucket(''); setFbMessagingSenderId(''); setFbAppId('');
    useMultiplayerStore.setState({ firebaseConfigured: false });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleReset() {
    resetGame();
    setShowResetModal(false);
    router.back();
  }

  function handleLeave() {
    setShowLeaveConfirm(true);
  }

  async function performLeave() {
    try {
      await leaveGame();
      resetGame(); // clears players, transactions, and sets appMode to null
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowLeaveConfirm(false);
      router.back();
    } catch (e: any) {
      console.error('Leave error:', e);
      toast.error(e.message || 'Failed to leave room');
      setShowLeaveConfirm(false);
    }
  }

  async function handleHost() {
    if (!hostPlayerId) return;
    const p = players.find(x => x.id === hostPlayerId);
    if (!p) return;
    setHostLoading(true);
    try {
      await hostGame(p.name, p.id);
      setAppMode('online');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowHostModal(false);
      setHostPlayerId(null);
    } catch (e: any) {
      toast.error(e.message || 'Failed to create room');
    } finally {
      setHostLoading(false);
    }
  }

  async function handleJoinStep1() {
    if (joinCode.length < 4) return;
    setJoinLoading(true);
    try {
      const state = await previewRoom(joinCode.toUpperCase());
      setAvailablePlayers(state.players || []);
      setJoinStep(2);
    } catch (e: any) {
      toast.error(e.message || 'Room not found');
    } finally {
      setJoinLoading(false);
    }
  }

  async function handleJoinStep2() {
    if (!joinPlayerId) return;
    const p = availablePlayers.find(x => x.id === joinPlayerId);
    if (!p) return;
    setJoinLoading(true);
    try {
      await joinGame(joinCode.toUpperCase(), p.name, p.id);
      setAppMode('online');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowJoinModal(false);
      setJoinCode('');
      setJoinStep(1);
      setJoinPlayerId(null);
    } catch (e: any) {
      toast.error(e.message || 'Failed to join room');
    } finally {
      setJoinLoading(false);
    }
  }

  const DARK_MODES: { value: DarkMode; label: string }[] = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  const VERSIONS = [
    { value: 'US', label: 'US ($)' },
    { value: 'IN', label: 'India (₹)' },
    { value: 'INT', label: 'International ($)' },
  ];

  function NumInput({ value, onChange, onBlur }: { value: string; onChange: (v: string) => void; onBlur?: () => void }) {
    return (
      <TextInput
        style={[styles.numInput, { color: palette.foreground, borderColor: palette.border, backgroundColor: palette.muted }]}
        value={value}
        onChangeText={t => onChange(t.replace(/[^0-9]/g, ''))}
        onBlur={onBlur}
        keyboardType="numeric"
        selectionColor={palette.primary}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ConfirmModal
        visible={showResetModal}
        title="Reset Game?"
        message="This will remove all players, transactions, and property ownerships. This cannot be undone."
        confirmText="Reset"
        confirmVariant="destructive"
        icon="restart"
        onCancel={() => setShowResetModal(false)}
        onConfirm={handleReset}
      />
      
      <ConfirmModal
        visible={showLeaveConfirm}
        title={isHost ? 'Close Room' : 'Leave Room'}
        message={isHost ? 'Close this room? All players will be disconnected.' : 'Leave this room?'}
        confirmText={isHost ? 'Close Room' : 'Leave'}
        confirmVariant="destructive"
        icon="exit-run"
        onCancel={() => setShowLeaveConfirm(false)}
        onConfirm={performLeave}
      />

      {/* Host Modal */}
      <Modal visible={showHostModal} transparent animationType="fade" onRequestClose={() => setShowHostModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowHostModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={{ fontSize: 48, textAlign: 'center' }}>🎮</Text>
            <Text style={[styles.modalTitle, { color: palette.foreground, textAlign: 'center', marginTop: 12 }]}>Host Multiplayer</Text>
            <Text style={[styles.modalSub, { color: palette.mutedForeground, textAlign: 'center' }]}>
              Which player are you?
            </Text>
            <ScrollView style={{ width: '100%', maxHeight: 200, marginVertical: 10 }}>
              {players.map(p => (
                <Pressable
                  key={p.id}
                  onPress={() => setHostPlayerId(p.id)}
                  style={[{ flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: 'transparent', borderRadius: 10, marginBottom: 6 },
                    hostPlayerId === p.id && { backgroundColor: p.color + '22', borderColor: p.color }
                  ]}
                >
                  <View style={{ width: 16, height: 16, borderRadius: 8, marginRight: 12, backgroundColor: p.color }} />
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: palette.foreground }}>{p.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Pressable
              onPress={handleHost}
              disabled={hostLoading || !hostPlayerId}
              style={({ pressed }) => [{ width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: palette.primary, opacity: (hostLoading || !hostPlayerId) ? 0.5 : pressed ? 0.85 : 1 }]}
            >
              <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' }}>{hostLoading ? 'Creating...' : 'Create Room'}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Join Modal */}
      <Modal visible={showJoinModal} transparent animationType="fade" onRequestClose={() => setShowJoinModal(false)}>
        <Pressable style={styles.overlay} onPress={() => setShowJoinModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            {joinStep === 1 ? (
              <>
                <Text style={{ fontSize: 48, textAlign: 'center' }}>🔗</Text>
                <Text style={[styles.modalTitle, { color: palette.foreground, textAlign: 'center', marginTop: 12 }]}>Join Room</Text>
                <Text style={[styles.modalSub, { color: palette.mutedForeground, textAlign: 'center' }]}>
                  Enter the 4-character room code shared by the host.
                </Text>
                <View style={{ gap: 10, width: '100%', marginVertical: 10 }}>
                  <TextInput
                    style={[{ width: '100%', borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, height: 48, fontFamily: 'Inter_600SemiBold', fontSize: 16, textAlign: 'center' }, { backgroundColor: palette.background, borderColor: palette.border, color: palette.foreground }]}
                    placeholder="Room Code (e.g. AB3K)"
                    placeholderTextColor={palette.mutedForeground}
                    value={joinCode}
                    onChangeText={(t) => setJoinCode(t.toUpperCase().slice(0, 4))}
                    autoCapitalize="characters"
                    maxLength={4}
                    selectionColor={palette.primary}
                  />
                </View>
                <Pressable
                  onPress={handleJoinStep1}
                  disabled={joinLoading || joinCode.length < 4}
                  style={({ pressed }) => [{ width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: palette.primary, opacity: (joinLoading || joinCode.length < 4) ? 0.5 : pressed ? 0.85 : 1 }]}
                >
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' }}>{joinLoading ? 'Finding Room...' : 'Next'}</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 48, textAlign: 'center' }}>👤</Text>
                <Text style={[styles.modalTitle, { color: palette.foreground, textAlign: 'center', marginTop: 12 }]}>Select Player</Text>
                <Text style={[styles.modalSub, { color: palette.mutedForeground, textAlign: 'center' }]}>
                  Which player are you?
                </Text>
                <ScrollView style={{ width: '100%', maxHeight: 200, marginVertical: 10 }}>
                  {availablePlayers.map(p => (
                    <Pressable
                      key={p.id}
                      onPress={() => setJoinPlayerId(p.id)}
                      style={[{ flexDirection: 'row', alignItems: 'center', padding: 12, borderWidth: 1, borderColor: 'transparent', borderRadius: 10, marginBottom: 6 },
                        joinPlayerId === p.id && { backgroundColor: p.color + '22', borderColor: p.color }
                      ]}
                    >
                      <View style={{ width: 16, height: 16, borderRadius: 8, marginRight: 12, backgroundColor: p.color }} />
                      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: palette.foreground }}>{p.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Pressable
                  onPress={handleJoinStep2}
                  disabled={joinLoading || !joinPlayerId}
                  style={({ pressed }) => [{ width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: palette.primary, opacity: (joinLoading || !joinPlayerId) ? 0.5 : pressed ? 0.85 : 1 }]}
                >
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' }}>{joinLoading ? 'Joining...' : 'Join Game'}</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: palette.background, borderBottomColor: palette.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={palette.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.foreground }]}>Settings</Text>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text style={[styles.doneText, { color: palette.primary }]}>Done</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 30 }]}>
        {/* Multiplayer Status */}
        {mpStatus === 'connected' && roomCode ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.groupLabel, { color: palette.mutedForeground }]}>Multiplayer</Text>
            <View style={[styles.card, { backgroundColor: palette.success + '15', borderColor: palette.success + '44', gap: 12 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette.success }} />
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: palette.success }}>Live Sync Active</Text>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 10, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, letterSpacing: 1, color: palette.mutedForeground, backgroundColor: palette.muted }}>
                  {isHost ? 'HOST' : 'CLIENT'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: palette.mutedForeground }}>Room Code</Text>
                <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: 6, color: palette.foreground }}>{roomCode}</Text>
              </View>
              {myName && (
                <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: palette.mutedForeground }}>
                  Connected as <Text style={{ fontFamily: 'Inter_700Bold', color: palette.foreground }}>{myName}</Text>
                </Text>
              )}
              <Pressable
                onPress={handleLeave}
                style={({ pressed }) => [{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, marginTop: 4,
                  borderColor: palette.destructive, opacity: pressed ? 0.7 : 1
                }]}
              >
                <MaterialCommunityIcons name="exit-run" size={16} color={palette.destructive} />
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: palette.destructive }}>
                  {isHost ? 'Close Room' : 'Leave Room'}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : firebaseConfigured ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.groupLabel, { color: palette.mutedForeground }]}>Multiplayer</Text>
            <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: palette.mutedForeground, marginBottom: 12 }}>
                Play on multiple phones in real-time.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable
                  onPress={() => setShowHostModal(true)}
                  style={({ pressed }) => [{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: palette.primary, alignItems: 'center', opacity: pressed ? 0.8 : 1 }]}
                >
                  <Text style={{ fontFamily: 'Inter_700Bold', color: '#FFF' }}>Host Game</Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowJoinModal(true)}
                  style={({ pressed }) => [{ flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: palette.foreground, alignItems: 'center', opacity: pressed ? 0.8 : 1 }]}
                >
                  <Text style={{ fontFamily: 'Inter_700Bold', color: palette.background }}>Join Game</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.groupLabel, { color: palette.mutedForeground }]}>Multiplayer</Text>
            <View style={[styles.card, { backgroundColor: palette.muted, borderColor: palette.border }]}>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 13, color: palette.mutedForeground }}>
                Configure Firebase below to enable multiplayer.
              </Text>
            </View>
          </View>
        )}

        {/* Appearance */}
        <Text style={[styles.groupLabel, { color: palette.mutedForeground }]}>Appearance</Text>
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <SettingRow label="Theme">
            <View style={styles.segmented}>
              {DARK_MODES.map(m => (
                <Pressable
                  key={m.value}
                  onPress={() => updateSettings({ darkMode: m.value })}
                  style={[
                    styles.segment,
                    { backgroundColor: settings.darkMode === m.value ? palette.primary : palette.muted },
                  ]}
                >
                  <Text style={[styles.segmentText, { color: settings.darkMode === m.value ? palette.primaryForeground : palette.foreground }]}>
                    {m.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </SettingRow>
          <SettingRow label="Version" last>
            <View style={styles.chipRow}>
              {VERSIONS.map(v => (
                <Pressable
                  key={v.value}
                  disabled={gameStarted}
                  onPress={() => {
                    const targetVersion = v.value as 'US' | 'IN' | 'INT';
                    let startMoney = 1500;
                    let sal = 200;
                    let incTax = 200;
                    let luxTax = 100;
                    
                    if (targetVersion === 'IN') {
                      startMoney = 1500;
                      sal = 200;
                      incTax = 200;
                      luxTax = 100;
                    } else if (targetVersion === 'INT') {
                      startMoney = 25000;
                      sal = 1500;
                      incTax = 2000;
                      luxTax = 1000;
                    }
                    
                    updateSettings({ version: targetVersion });
                    setStartingMoneyStr(startMoney.toString());
                    setSalaryStr(sal.toString());
                    setIncomeTaxStr(incTax.toString());
                    setLuxuryTaxStr(luxTax.toString());
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: settings.version === v.value ? palette.primary + '22' : palette.muted,
                      borderColor: settings.version === v.value ? palette.primary : palette.border,
                      opacity: gameStarted && settings.version !== v.value ? 0.3 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: settings.version === v.value ? palette.primary : palette.foreground }]}>
                    {v.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </SettingRow>
        </View>

        {/* Game rules */}
        <Text style={[styles.groupLabel, { color: palette.mutedForeground }]}>Game Rules</Text>
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <SettingRow label="Starting Money">
            <NumInput value={startingMoneyStr} onChange={setStartingMoneyStr} onBlur={() => {
              const v = parseInt(startingMoneyStr);
              if (!isNaN(v)) updateSettings({ startingMoney: v });
            }} />
          </SettingRow>
          <SettingRow label="Salary (Pass Go)">
            <NumInput value={salaryStr} onChange={setSalaryStr} onBlur={() => {
              const v = parseInt(salaryStr);
              if (!isNaN(v)) updateSettings({ salaryAmount: v });
            }} />
          </SettingRow>
          <SettingRow label="Income Tax">
            <NumInput value={incomeTaxStr} onChange={setIncomeTaxStr} onBlur={() => {
              const v = parseInt(incomeTaxStr);
              if (!isNaN(v)) updateSettings({ incomeTaxAmount: v });
            }} />
          </SettingRow>
          <SettingRow label="Luxury Tax" last>
            <NumInput value={luxuryTaxStr} onChange={setLuxuryTaxStr} onBlur={() => {
              const v = parseInt(luxuryTaxStr);
              if (!isNaN(v)) updateSettings({ luxuryTaxAmount: v });
            }} />
          </SettingRow>
        </View>

        {/* Developer / Firebase */}
        <Text style={[styles.groupLabel, { color: palette.mutedForeground }]}>Developer</Text>
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.settingRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: palette.foreground }]}>Firebase</Text>
              <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: palette.mutedForeground, marginTop: 2 }}>
                {firebaseConfigured ? '✅ Configured' : '❌ Not configured'}
              </Text>
            </View>
            <Pressable
              onPress={() => setFbShowConfig(!fbShowConfig)}
              style={({ pressed }) => [styles.segment, { backgroundColor: palette.primary, opacity: pressed ? 0.85 : 1 }]}
            >
              <Text style={[styles.segmentText, { color: '#fff' }]}>{fbShowConfig ? 'Hide' : 'Configure'}</Text>
            </Pressable>
          </View>
          {fbShowConfig && (
            <View style={{ padding: 16, gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border }}>
              {[
                { label: 'API Key *', value: fbApiKey, setter: setFbApiKey },
                { label: 'Database URL *', value: fbDatabaseURL, setter: setFbDatabaseURL },
                { label: 'Project ID *', value: fbProjectId, setter: setFbProjectId },
                { label: 'Auth Domain', value: fbAuthDomain, setter: setFbAuthDomain },
                { label: 'Storage Bucket', value: fbStorageBucket, setter: setFbStorageBucket },
                { label: 'Messaging Sender ID', value: fbMessagingSenderId, setter: setFbMessagingSenderId },
                { label: 'App ID', value: fbAppId, setter: setFbAppId },
              ].map(({ label, value, setter }) => (
                <View key={label} style={{ gap: 3 }}>
                  <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 11, color: palette.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</Text>
                  <TextInput
                    style={[styles.numInput, { backgroundColor: palette.background, borderColor: palette.border, color: palette.foreground, textAlign: 'left', minWidth: '100%' }]}
                    placeholder={label}
                    placeholderTextColor={palette.mutedForeground}
                    value={value}
                    onChangeText={setter}
                    selectionColor={palette.primary}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              ))}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <Pressable
                  onPress={handleSaveFirebase}
                  disabled={fbSaving}
                  style={({ pressed }) => [{ flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center', backgroundColor: palette.primary, opacity: fbSaving ? 0.5 : pressed ? 0.85 : 1 }]}
                >
                  <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 14, color: '#fff' }}>{fbSaving ? 'Saving...' : 'Save & Connect'}</Text>
                </Pressable>
                {firebaseConfigured && (
                  <Pressable
                    onPress={handleClearFirebase}
                    style={({ pressed }) => [{ paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1.5, borderColor: palette.destructive, opacity: pressed ? 0.7 : 1 }]}
                  >
                    <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: palette.destructive }}>Clear</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Danger zone */}
        <Text style={[styles.groupLabel, { color: palette.mutedForeground }]}>Danger Zone</Text>
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Pressable
            onPress={() => setShowResetModal(true)}
            style={({ pressed }) => [styles.dangerRow, { opacity: pressed ? 0.7 : 1 }]}
          >
            <MaterialCommunityIcons name="restart" size={20} color={palette.destructive} />
            <Text style={[styles.dangerText, { color: palette.destructive }]}>Reset Game</Text>
          </Pressable>
        </View>

        <Text style={[styles.version, { color: palette.mutedForeground }]}>
          Monopoly Banker · Unofficial companion app
        </Text>
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
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  doneText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  scroll: { padding: 20, gap: 10 },
  groupLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 10, marginBottom: 2 },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 13, gap: 12,
  },
  settingLabel: { fontFamily: 'Inter_500Medium', fontSize: 16, flex: 1 },
  numInput: {
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    fontFamily: 'Inter_600SemiBold', fontSize: 15, textAlign: 'right', minWidth: 80,
  },
  segmented: { flexDirection: 'row', gap: 4 },
  segment: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  segmentText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1, justifyContent: 'flex-end' },
  chip: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  chipText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  dangerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14 },
  dangerText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  version: { fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center', marginTop: 10 },
  // Reset modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: { width: '100%', borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  modalBody: { padding: 24, alignItems: 'center', gap: 12 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, textAlign: 'center' },
  modalSub: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8, width: '100%' },
  modalCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, alignItems: 'center',
  },
  modalCancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  modalConfirm: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalConfirmText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' },
});
