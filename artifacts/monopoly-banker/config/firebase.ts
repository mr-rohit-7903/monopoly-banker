import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getDatabase, Database, ref, set, onValue, off, remove, get as fbGet } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIREBASE_CONFIG_KEY = 'monopoly-firebase-config';

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const DEFAULT_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyBPruzPuqzcsMPnj_-SaC9RKsclnQLaPFA",
  authDomain: "monopoly-banker-34f61.firebaseapp.com",
  databaseURL: "https://monopoly-banker-34f61-default-rtdb.firebaseio.com",
  projectId: "monopoly-banker-34f61",
  storageBucket: "monopoly-banker-34f61.firebasestorage.app",
  messagingSenderId: "219033872306",
  appId: "1:219033872306:web:fe9674134ade75cec726ab",
};

let firebaseApp: FirebaseApp | null = null;
let database: Database | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  return firebaseApp;
}

export function getFirebaseDB(): Database | null {
  return database;
}

export function initFirebase(config: FirebaseConfig): { app: FirebaseApp; db: Database } {
  if (getApps().length > 0) {
    firebaseApp = getApps()[0];
  } else {
    firebaseApp = initializeApp(config);
  }
  database = getDatabase(firebaseApp);
  return { app: firebaseApp, db: database };
}

export async function saveFirebaseConfig(config: FirebaseConfig): Promise<void> {
  await AsyncStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
}

export async function loadFirebaseConfig(): Promise<FirebaseConfig | null> {
  const raw = await AsyncStorage.getItem(FIREBASE_CONFIG_KEY);
  if (!raw) return DEFAULT_CONFIG;
  try {
    return JSON.parse(raw) as FirebaseConfig;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function clearFirebaseConfig(): Promise<void> {
  await AsyncStorage.removeItem(FIREBASE_CONFIG_KEY);
}

// Room helpers
function roomRef(db: Database, roomCode: string) {
  return ref(db, `rooms/${roomCode}`);
}

function stateRef(db: Database, roomCode: string) {
  return ref(db, `rooms/${roomCode}/state`);
}

function playersRef(db: Database, roomCode: string) {
  return ref(db, `rooms/${roomCode}/connectedPlayers`);
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createRoom(db: Database, roomCode: string, initialState: any, hostName: string): Promise<void> {
  await set(roomRef(db, roomCode), {
    state: { ...initialState, lastUpdated: Date.now() },
    connectedPlayers: { [hostName]: { name: hostName, joinedAt: Date.now(), isHost: true } },
    createdAt: Date.now(),
  });
}

export async function checkRoomExists(db: Database, roomCode: string): Promise<boolean> {
  const snapshot = await fbGet(roomRef(db, roomCode));
  return snapshot.exists();
}

export async function joinRoomDB(db: Database, roomCode: string, playerName: string): Promise<any> {
  const snapshot = await fbGet(roomRef(db, roomCode));
  if (!snapshot.exists()) throw new Error('Room not found');

  // Add to connected players
  await set(ref(db, `rooms/${roomCode}/connectedPlayers/${playerName}`), {
    name: playerName,
    joinedAt: Date.now(),
    isHost: false,
  });

  return snapshot.val().state;
}

export function subscribeToRoom(
  db: Database,
  roomCode: string,
  onStateUpdate: (state: any) => void,
): () => void {
  const sRef = stateRef(db, roomCode);
  const handler = onValue(sRef, (snapshot) => {
    const val = snapshot.val();
    if (val) onStateUpdate(val);
  });

  return () => off(sRef);
}

export async function pushState(db: Database, roomCode: string, state: any): Promise<void> {
  await set(stateRef(db, roomCode), { ...state, lastUpdated: Date.now() });
}

export async function destroyRoom(db: Database, roomCode: string): Promise<void> {
  await remove(roomRef(db, roomCode));
}

export async function leaveRoomDB(db: Database, roomCode: string, playerName: string): Promise<void> {
  await remove(ref(db, `rooms/${roomCode}/connectedPlayers/${playerName}`));
}

export { ref, set, onValue, off };
