import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  FirebaseConfig,
  initFirebase,
  loadFirebaseConfig,
  saveFirebaseConfig,
  generateRoomCode,
  createRoom,
  checkRoomExists,
  joinRoomDB,
  subscribeToRoom,
  pushState,
  destroyRoom,
  leaveRoomDB,
  getFirebaseDB,
} from '@/config/firebase';
import { useGameStore } from './gameStore';
import { Database } from 'firebase/database';

export type MultiplayerStatus = 'offline' | 'connecting' | 'connected' | 'error';

interface MultiplayerState {
  status: MultiplayerStatus;
  roomCode: string | null;
  isHost: boolean;
  myName: string | null;
  myPlayerId: string | null; // Which player this device controls
  firebaseConfigured: boolean;
  error: string | null;
  lastSyncTime: number;

  // Prevent echo: when we push state, ignore the next incoming update
  _isSyncing: boolean;
  _unsubscribe: (() => void) | null;

  // Actions
  configureFirebase: (config: FirebaseConfig) => Promise<boolean>;
  checkFirebaseConfig: () => Promise<boolean>;
  hostGame: (playerName: string, playerId: string) => Promise<string>;
  previewRoom: (roomCode: string) => Promise<any>;
  joinGame: (roomCode: string, playerName: string, playerId?: string) => Promise<void>;
  leaveGame: () => Promise<void>;
  syncToFirebase: () => Promise<void>;
}

export const useMultiplayerStore = create<MultiplayerState>()(
  persist(
    (set, get) => ({
      status: 'offline',
  roomCode: null,
  isHost: false,
  myName: null,
  myPlayerId: null,
  firebaseConfigured: false,
  error: null,
  lastSyncTime: 0,
  _isSyncing: false,
  _unsubscribe: null,

  configureFirebase: async (config) => {
    try {
      initFirebase(config);
      await saveFirebaseConfig(config);
      set({ firebaseConfigured: true, error: null });
      return true;
    } catch (e: any) {
      set({ error: e.message, firebaseConfigured: false });
      return false;
    }
  },

  checkFirebaseConfig: async () => {
    const config = await loadFirebaseConfig();
    if (config) {
      try {
        initFirebase(config);
        set({ firebaseConfigured: true });

        // Auto-reconnect if we were already in a room
        const state = get();
        if (state.status === 'connected' && state.roomCode) {
          const db = getFirebaseDB();
          if (db) {
            const unsub = subscribeToRoom(db, state.roomCode, (incomingState) => {
              handleIncomingState(incomingState);
            });
            set({ _unsubscribe: unsub });
          }
        }
        
        return true;
      } catch (e) {
        console.error('Failed to init firebase on check:', e);
        return false;
      }
    }
    return false;
  },

  hostGame: async (playerName, playerId) => {
    const db = getFirebaseDB();
    if (!db) throw new Error('Firebase not configured');

    set({ status: 'connecting', error: null });

    // Generate unique room code
    let code = generateRoomCode();
    let attempts = 0;
    while (await checkRoomExists(db, code) && attempts < 10) {
      code = generateRoomCode();
      attempts++;
    }

    // Get current game state (strip functions, keep data only)
    const gameState = getSerializableState();

    await createRoom(db, code, gameState, playerName);

    // Subscribe to room updates
    const unsub = subscribeToRoom(db, code, (incomingState) => {
      handleIncomingState(incomingState);
    });

    set({
      status: 'connected',
      roomCode: code,
      isHost: true,
      myName: playerName,
      myPlayerId: playerId,
      _unsubscribe: unsub,
      lastSyncTime: Date.now(),
    });

    return code;
  },

  previewRoom: async (roomCode) => {
    const db = getFirebaseDB();
    if (!db) throw new Error('Firebase not configured');
    
    // We can use the existing joinRoomDB logic to get the state without fully subscribing yet,
    // but joinRoomDB adds to connectedPlayers. 
    // Let's just fetch the state.
    const { ref, get: fbGet } = await import('firebase/database');
    const snapshot = await fbGet(ref(db, `rooms/${roomCode.toUpperCase()}`));
    if (!snapshot.exists()) throw new Error('Room not found');
    return snapshot.val().state;
  },

  joinGame: async (roomCode, playerName, playerId) => {
    const db = getFirebaseDB();
    if (!db) throw new Error('Firebase not configured');

    set({ status: 'connecting', error: null });

    try {
      const roomState = await joinRoomDB(db, roomCode.toUpperCase(), playerName);

      // Apply the room state to local store
      applyRemoteState(roomState);

      // Subscribe to room updates
      const unsub = subscribeToRoom(db, roomCode.toUpperCase(), (incomingState) => {
        handleIncomingState(incomingState);
      });

      set({
        status: 'connected',
        roomCode: roomCode.toUpperCase(),
        isHost: false,
        myName: playerName,
        myPlayerId: playerId || null,
        _unsubscribe: unsub,
        lastSyncTime: Date.now(),
      });
    } catch (e: any) {
      set({ status: 'error', error: e.message || 'Failed to join room' });
      throw e;
    }
  },

  leaveGame: async () => {
    const { roomCode, isHost, myName, _unsubscribe } = get();
    const db = getFirebaseDB();

    // Unsubscribe from listener
    if (_unsubscribe) _unsubscribe();

    if (db && roomCode) {
      if (isHost) {
        await destroyRoom(db, roomCode);
      } else if (myName) {
        await leaveRoomDB(db, roomCode, myName);
      }
    }

    set({
      status: 'offline',
      roomCode: null,
      isHost: false,
      myName: null,
      myPlayerId: null,
      error: null,
      _unsubscribe: null,
      lastSyncTime: 0,
    });
  },

  syncToFirebase: async () => {
    const { status, roomCode, _isSyncing } = get();
    const db = getFirebaseDB();

    if (status !== 'connected' || !roomCode || !db || _isSyncing) return;

    set({ _isSyncing: true });
    try {
      const gameState = getSerializableState();
      await pushState(db, roomCode, gameState);
      set({ lastSyncTime: Date.now() });
    } catch (e: any) {
      console.warn('Sync to Firebase failed:', e.message);
    } finally {
      set({ _isSyncing: false });
    }
  },
    }),
    {
      name: 'monopoly-multiplayer-v5',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        status: state.status,
        roomCode: state.roomCode,
        isHost: state.isHost,
        myName: state.myName,
        myPlayerId: state.myPlayerId,
        firebaseConfigured: state.firebaseConfigured,
      }), // Don't persist _unsubscribe, error, _isSyncing, etc.
    }
  )
);

// Helper: Extract only serializable data from game store
function getSerializableState() {
  const state = useGameStore.getState();
  return {
    players: state.players,
    transactions: state.transactions,
    propertyOwnerships: state.propertyOwnerships,
    settings: state.settings,
    gameStartTime: state.gameStartTime,
    pendingTrades: state.pendingTrades,
  };
}

// Helper: Apply remote state to local game store
function applyRemoteState(remoteState: any) {
  if (!remoteState) return;
  useGameStore.setState({
    players: remoteState.players || [],
    transactions: remoteState.transactions || [],
    propertyOwnerships: remoteState.propertyOwnerships || {},
    settings: remoteState.settings,
    gameStartTime: remoteState.gameStartTime,
    pendingTrades: remoteState.pendingTrades || [],
  });
}

// Helper: Handle incoming Firebase state
function handleIncomingState(incomingState: any) {
  const mpState = useMultiplayerStore.getState();
  if (mpState._isSyncing) return; // Ignore echoes of our own writes

  const incomingTime = incomingState.lastUpdated || 0;
  if (incomingTime > mpState.lastSyncTime) {
    applyRemoteState(incomingState);
    useMultiplayerStore.setState({ lastSyncTime: incomingTime });
  }
}

// Auto-sync: Subscribe to game store changes and push to Firebase
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

useGameStore.subscribe((state, prevState) => {
  const mp = useMultiplayerStore.getState();
  if (mp.status !== 'connected' || mp._isSyncing) return;

  // Debounce sync to avoid flooding Firebase on rapid changes
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    mp.syncToFirebase();
  }, 300);
});
