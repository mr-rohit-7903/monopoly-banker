import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MONOPOLY_PROPERTIES, STANDARD_STARTING_MONEY, SALARY_AMOUNT, INCOME_TAX_AMOUNT, LUXURY_TAX_AMOUNT } from '@/constants/monopoly';

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export interface Player {
  id: string;
  name: string;
  color: string;
  balance: number;
  jailCards: number; // Get Out of Jail Free cards held
}

export type TransactionType =
  | 'transfer' | 'bank_give' | 'bank_receive'
  | 'salary' | 'income_tax' | 'luxury_tax'
  | 'mortgage' | 'unmortgage'
  | 'property_buy' | 'property_sell'
  | 'chance_card' | 'community_card'
  | 'jail_fine' | 'jail_card';

export interface Transaction {
  id: string;
  type: TransactionType;
  fromId: string | null;
  toId: string | null;
  amount: number;
  description: string;
  timestamp: number;
  // Undo metadata
  propertyId?: string;
  prevMortgaged?: boolean;
  prevOwnerId?: string | null;
}

export interface PropertyOwnership {
  ownerId: string | null;
  houses: number; // 0-4
  hotel: boolean;
  isMortgaged: boolean;
}

export interface GameSettings {
  startingMoney: number;
  currency: string;
  darkMode: 'light' | 'dark' | 'system';
  salaryAmount: number;
  incomeTaxAmount: number;
  luxuryTaxAmount: number;
}

const DEFAULT_SETTINGS: GameSettings = {
  startingMoney: STANDARD_STARTING_MONEY,
  currency: '$',
  darkMode: 'system',
  salaryAmount: SALARY_AMOUNT,
  incomeTaxAmount: INCOME_TAX_AMOUNT,
  luxuryTaxAmount: LUXURY_TAX_AMOUNT,
};

function initOwnerships(): Record<string, PropertyOwnership> {
  const o: Record<string, PropertyOwnership> = {};
  MONOPOLY_PROPERTIES.forEach(p => {
    o[p.id] = { ownerId: null, houses: 0, hotel: false, isMortgaged: false };
  });
  return o;
}

interface GameState {
  players: Player[];
  transactions: Transaction[];
  propertyOwnerships: Record<string, PropertyOwnership>;
  settings: GameSettings;
  gameStartTime: number;

  // Player actions
  addPlayer: (name: string, color: string) => void;
  removePlayer: (id: string) => void;
  updatePlayer: (id: string, updates: { name?: string; color?: string }) => void;
  addJailCard: (playerId: string) => void;
  useJailCard: (playerId: string) => boolean;

  // Banking actions
  transfer: (fromId: string | null, toId: string | null, amount: number, type: TransactionType, description: string) => boolean;
  undoLastTransaction: () => void;
  collectSalary: (playerId: string) => void;
  payJailFine: (playerId: string) => boolean;

  // Property actions
  assignProperty: (propertyId: string, ownerId: string | null, price: number) => void;
  setHouses: (propertyId: string, houses: number, hotel: boolean) => void;
  toggleMortgage: (propertyId: string) => void;

  // Game actions
  resetGame: () => void;
  updateSettings: (updates: Partial<GameSettings>) => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      players: [],
      transactions: [],
      propertyOwnerships: initOwnerships(),
      settings: DEFAULT_SETTINGS,
      gameStartTime: Date.now(),

      addPlayer: (name, color) => set(state => ({
        players: [...state.players, {
          id: genId(),
          name: name.trim(),
          color,
          balance: state.settings.startingMoney,
          jailCards: 0,
        }],
        // Joining is not a transaction — don't log it so the Add Player button stays visible
      })),

      removePlayer: (id) => set(state => {
        const player = state.players.find(p => p.id === id);
        if (!player) return state;
        return {
          players: state.players.filter(p => p.id !== id),
          propertyOwnerships: Object.fromEntries(
            Object.entries(state.propertyOwnerships).map(([pid, o]) =>
              [pid, o.ownerId === id ? { ...o, ownerId: null } : o]
            )
          ),
        };
      }),

      updatePlayer: (id, updates) => set(state => ({
        players: state.players.map(p => p.id === id ? { ...p, ...updates } : p),
      })),

      addJailCard: (playerId) => set(state => ({
        players: state.players.map(p =>
          p.id === playerId ? { ...p, jailCards: p.jailCards + 1 } : p
        ),
      })),

      useJailCard: (playerId) => {
        const player = get().players.find(p => p.id === playerId);
        if (!player || player.jailCards <= 0) return false;
        set(state => ({
          players: state.players.map(p =>
            p.id === playerId ? { ...p, jailCards: p.jailCards - 1 } : p
          ),
          transactions: [...state.transactions, {
            id: genId(), type: 'jail_card', fromId: playerId, toId: null,
            amount: 0, description: `${player.name} used Get Out of Jail Free card`,
            timestamp: Date.now(),
          }],
        }));
        return true;
      },

      transfer: (fromId, toId, amount, type, description) => {
        const state = get();
        if (amount <= 0) return false;
        // Only check player balances — bank is unlimited
        if (fromId !== null) {
          const from = state.players.find(p => p.id === fromId);
          if (!from || from.balance < amount) return false;
        }

        set(state => {
          let players = [...state.players];

          if (fromId === null && toId !== null) {
            players = players.map(p => p.id === toId ? { ...p, balance: p.balance + amount } : p);
          } else if (fromId !== null && toId === null) {
            players = players.map(p => p.id === fromId ? { ...p, balance: p.balance - amount } : p);
          } else if (fromId !== null && toId !== null) {
            players = players.map(p => {
              if (p.id === fromId) return { ...p, balance: p.balance - amount };
              if (p.id === toId) return { ...p, balance: p.balance + amount };
              return p;
            });
          }

          return {
            players,
            transactions: [...state.transactions, {
              id: genId(), type, fromId, toId, amount, description, timestamp: Date.now(),
            }],
          };
        });
        return true;
      },

      undoLastTransaction: () => set(state => {
        if (state.transactions.length === 0) return state;
        const last = state.transactions[state.transactions.length - 1];
        const transactions = state.transactions.slice(0, -1);
        const { fromId, toId, amount, type } = last;

        let players = [...state.players];
        let propertyOwnerships = { ...state.propertyOwnerships };

        if (type === 'mortgage' || type === 'unmortgage') {
          if (last.propertyId) {
            propertyOwnerships = {
              ...propertyOwnerships,
              [last.propertyId]: {
                ...propertyOwnerships[last.propertyId],
                isMortgaged: last.prevMortgaged ?? false,
              },
            };
          }
        }

        if (type === 'property_buy' || type === 'property_sell') {
          if (last.propertyId) {
            propertyOwnerships = {
              ...propertyOwnerships,
              [last.propertyId]: {
                ...propertyOwnerships[last.propertyId],
                ownerId: last.prevOwnerId ?? null,
              },
            };
          }
        }

        // Restore consumed jail card
        if (type === 'jail_card' && fromId !== null) {
          players = players.map(p =>
            p.id === fromId ? { ...p, jailCards: p.jailCards + 1 } : p
          );
        }

        // Reverse the money flow (bank is unlimited — only adjust player balances)
        if (fromId === null && toId !== null) {
          players = players.map(p => p.id === toId ? { ...p, balance: p.balance - amount } : p);
        } else if (fromId !== null && toId === null) {
          players = players.map(p => p.id === fromId ? { ...p, balance: p.balance + amount } : p);
        } else if (fromId !== null && toId !== null) {
          players = players.map(p => {
            if (p.id === fromId) return { ...p, balance: p.balance + amount };
            if (p.id === toId) return { ...p, balance: p.balance - amount };
            return p;
          });
        }

        return { players, propertyOwnerships, transactions };
      }),

      collectSalary: (playerId) => {
        const { settings, transfer } = get();
        transfer(null, playerId, settings.salaryAmount, 'salary', 'Salary — passed Go');
      },

      payJailFine: (playerId) => {
        const { transfer } = get();
        return transfer(playerId, null, 50, 'jail_fine', 'Paid Jail Fine ($50)');
      },

      assignProperty: (propertyId, ownerId, price) => set(state => {
        const prev = state.propertyOwnerships[propertyId];
        const prevOwnerId = prev?.ownerId ?? null;
        let players = state.players;
        const transactions = [...state.transactions];

        if (ownerId !== null && price > 0) {
          // Player buying from bank — deduct from player only (bank is unlimited)
          const buyer = state.players.find(p => p.id === ownerId);
          if (!buyer || buyer.balance < price) return state;
          players = players.map(p => p.id === ownerId ? { ...p, balance: p.balance - price } : p);
          transactions.push({
            id: genId(), type: 'property_buy', fromId: ownerId, toId: null,
            amount: price, description: `Bought ${MONOPOLY_PROPERTIES.find(p => p.id === propertyId)?.name}`,
            timestamp: Date.now(), propertyId, prevOwnerId,
          });
        } else if (ownerId !== null && price === 0 && prevOwnerId !== null) {
          // Player-to-player trade (no money changes hands)
          transactions.push({
            id: genId(), type: 'property_buy', fromId: ownerId, toId: null,
            amount: 0, description: `Traded ${MONOPOLY_PROPERTIES.find(p => p.id === propertyId)?.name}`,
            timestamp: Date.now(), propertyId, prevOwnerId,
          });
        }
        // Returning a property to the bank is not allowed once purchased

        return {
          players,
          transactions,
          propertyOwnerships: {
            ...state.propertyOwnerships,
            [propertyId]: { ...prev, ownerId, isMortgaged: false, houses: 0, hotel: false },
          },
        };
      }),

      setHouses: (propertyId, houses, hotel) => set(state => ({
        propertyOwnerships: {
          ...state.propertyOwnerships,
          [propertyId]: { ...state.propertyOwnerships[propertyId], houses, hotel },
        },
      })),

      toggleMortgage: (propertyId) => set(state => {
        const ownership = state.propertyOwnerships[propertyId];
        const property = MONOPOLY_PROPERTIES.find(p => p.id === propertyId);
        if (!property || !ownership?.ownerId) return state;

        const isMortgaging = !ownership.isMortgaged;
        const ownerId = ownership.ownerId;
        const mortgageValue = property.mortgage;
        const unmortgageCost = Math.floor(mortgageValue * 1.1);

        if (!isMortgaging) {
          const owner = state.players.find(p => p.id === ownerId);
          if (!owner || owner.balance < unmortgageCost) return state;
        }

        const amount = isMortgaging ? mortgageValue : unmortgageCost;

        return {
          propertyOwnerships: {
            ...state.propertyOwnerships,
            [propertyId]: { ...ownership, isMortgaged: isMortgaging },
          },
          players: state.players.map(p => {
            if (p.id !== ownerId) return p;
            return { ...p, balance: isMortgaging ? p.balance + mortgageValue : p.balance - unmortgageCost };
          }),
          transactions: [...state.transactions, {
            id: genId(),
            type: isMortgaging ? 'mortgage' : 'unmortgage',
            fromId: isMortgaging ? null : ownerId,
            toId: isMortgaging ? ownerId : null,
            amount,
            description: isMortgaging ? `Mortgaged ${property.name}` : `Unmortgaged ${property.name}`,
            timestamp: Date.now(),
            propertyId,
            prevMortgaged: ownership.isMortgaged,
          }],
        };
      }),

      resetGame: () => set({
        players: [],
        transactions: [],
        propertyOwnerships: initOwnerships(),
        gameStartTime: Date.now(),
      }),

      updateSettings: (updates) => set(state => ({
        settings: { ...state.settings, ...updates },
      })),
    }),
    {
      name: 'monopoly-banker-v5',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
