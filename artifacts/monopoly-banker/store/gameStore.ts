import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MONOPOLY_PROPERTIES, BANK_STARTING_BALANCE, STANDARD_STARTING_MONEY, SALARY_AMOUNT, INCOME_TAX_AMOUNT, LUXURY_TAX_AMOUNT } from '@/constants/monopoly';

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export interface Player {
  id: string;
  name: string;
  color: string;
  balance: number;
}

export type TransactionType =
  | 'transfer' | 'bank_give' | 'bank_receive'
  | 'salary' | 'income_tax' | 'luxury_tax'
  | 'mortgage' | 'unmortgage'
  | 'property_buy' | 'property_sell'
  | 'free_parking_add' | 'free_parking_collect';

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
  freeParkingDelta?: number;
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
  freeParking: boolean;
  salaryAmount: number;
  incomeTaxAmount: number;
  luxuryTaxAmount: number;
}

const DEFAULT_SETTINGS: GameSettings = {
  startingMoney: STANDARD_STARTING_MONEY,
  currency: '$',
  darkMode: 'system',
  freeParking: true,
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
  bankBalance: number;
  freeParkingBalance: number;
  gameStartTime: number;

  // Actions
  addPlayer: (name: string, color: string) => void;
  removePlayer: (id: string) => void;
  updatePlayer: (id: string, updates: { name?: string; color?: string }) => void;
  adjustBalance: (playerId: string, amount: number) => void;

  transfer: (fromId: string | null, toId: string | null, amount: number, type: TransactionType, description: string) => boolean;
  undoLastTransaction: () => void;

  collectSalary: (playerId: string) => void;
  payIncomeTax: (playerId: string) => void;
  payLuxuryTax: (playerId: string) => void;
  addToFreeParking: (playerId: string, amount: number) => void;
  collectFreeParking: (playerId: string) => void;

  assignProperty: (propertyId: string, ownerId: string | null, price: number) => void;
  setHouses: (propertyId: string, houses: number, hotel: boolean) => void;
  toggleMortgage: (propertyId: string) => void;

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
      bankBalance: BANK_STARTING_BALANCE,
      freeParkingBalance: 0,
      gameStartTime: Date.now(),

      addPlayer: (name, color) => set(state => ({
        players: [...state.players, {
          id: genId(),
          name: name.trim(),
          color,
          balance: state.settings.startingMoney,
        }],
        bankBalance: state.bankBalance - state.settings.startingMoney,
        transactions: [...state.transactions, {
          id: genId(),
          type: 'bank_give',
          fromId: null,
          toId: 'new_player',
          amount: state.settings.startingMoney,
          description: `${name.trim()} joined the game`,
          timestamp: Date.now(),
        }],
      })),

      removePlayer: (id) => set(state => {
        const player = state.players.find(p => p.id === id);
        if (!player) return state;
        return {
          players: state.players.filter(p => p.id !== id),
          bankBalance: state.bankBalance + player.balance,
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

      adjustBalance: (playerId, amount) => set(state => ({
        players: state.players.map(p =>
          p.id === playerId ? { ...p, balance: p.balance + amount } : p
        ),
        bankBalance: state.bankBalance - amount,
      })),

      transfer: (fromId, toId, amount, type, description) => {
        const state = get();
        // Validate
        if (amount <= 0) return false;
        if (fromId !== null) {
          const from = state.players.find(p => p.id === fromId);
          if (!from || from.balance < amount) return false;
        } else {
          if (state.bankBalance < amount) return false;
        }

        set(state => {
          let players = [...state.players];
          let bankBalance = state.bankBalance;

          if (fromId === null && toId !== null) {
            players = players.map(p => p.id === toId ? { ...p, balance: p.balance + amount } : p);
            bankBalance -= amount;
          } else if (fromId !== null && toId === null) {
            players = players.map(p => p.id === fromId ? { ...p, balance: p.balance - amount } : p);
            bankBalance += amount;
          } else if (fromId !== null && toId !== null) {
            players = players.map(p => {
              if (p.id === fromId) return { ...p, balance: p.balance - amount };
              if (p.id === toId) return { ...p, balance: p.balance + amount };
              return p;
            });
          }

          return {
            players,
            bankBalance,
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
        let bankBalance = state.bankBalance;
        let freeParkingBalance = state.freeParkingBalance;
        let propertyOwnerships = { ...state.propertyOwnerships };

        if (type === 'free_parking_add') {
          // Reverse: remove from free parking, give back to player
          freeParkingBalance -= amount;
          players = players.map(p => p.id === fromId ? { ...p, balance: p.balance + amount } : p);
        } else if (type === 'free_parking_collect') {
          // Reverse: remove from player, restore to free parking
          freeParkingBalance += amount;
          players = players.map(p => p.id === toId ? { ...p, balance: p.balance - amount } : p);
        } else if (type === 'mortgage' || type === 'unmortgage') {
          if (last.propertyId) {
            propertyOwnerships = {
              ...propertyOwnerships,
              [last.propertyId]: {
                ...propertyOwnerships[last.propertyId],
                isMortgaged: last.prevMortgaged ?? false,
              },
            };
          }
          // Reverse money
          if (fromId === null && toId !== null) {
            players = players.map(p => p.id === toId ? { ...p, balance: p.balance - amount } : p);
            bankBalance += amount;
          } else if (fromId !== null && toId === null) {
            players = players.map(p => p.id === fromId ? { ...p, balance: p.balance + amount } : p);
            bankBalance -= amount;
          }
        } else if (type === 'property_buy' || type === 'property_sell') {
          if (last.propertyId) {
            propertyOwnerships = {
              ...propertyOwnerships,
              [last.propertyId]: {
                ...propertyOwnerships[last.propertyId],
                ownerId: last.prevOwnerId ?? null,
              },
            };
          }
          // Reverse money
          if (fromId === null && toId !== null) {
            players = players.map(p => p.id === toId ? { ...p, balance: p.balance - amount } : p);
            bankBalance += amount;
          } else if (fromId !== null && toId === null) {
            players = players.map(p => p.id === fromId ? { ...p, balance: p.balance + amount } : p);
            bankBalance -= amount;
          }
        } else {
          // Standard money reversal
          if (fromId === null && toId !== null) {
            players = players.map(p => p.id === toId ? { ...p, balance: p.balance - amount } : p);
            bankBalance += amount;
          } else if (fromId !== null && toId === null) {
            players = players.map(p => p.id === fromId ? { ...p, balance: p.balance + amount } : p);
            bankBalance -= amount;
          } else if (fromId !== null && toId !== null) {
            players = players.map(p => {
              if (p.id === fromId) return { ...p, balance: p.balance + amount };
              if (p.id === toId) return { ...p, balance: p.balance - amount };
              return p;
            });
          }
        }

        return { players, bankBalance, freeParkingBalance, propertyOwnerships, transactions };
      }),

      collectSalary: (playerId) => {
        const { settings, transfer } = get();
        transfer(null, playerId, settings.salaryAmount, 'salary', 'Salary — passed Go');
      },

      payIncomeTax: (playerId) => {
        const { settings, transfer } = get();
        transfer(playerId, null, settings.incomeTaxAmount, 'income_tax', 'Income Tax');
      },

      payLuxuryTax: (playerId) => {
        const { settings, transfer } = get();
        transfer(playerId, null, settings.luxuryTaxAmount, 'luxury_tax', 'Luxury Tax');
      },

      addToFreeParking: (playerId, amount) => set(state => {
        const player = state.players.find(p => p.id === playerId);
        if (!player || player.balance < amount) return state;
        return {
          players: state.players.map(p =>
            p.id === playerId ? { ...p, balance: p.balance - amount } : p
          ),
          freeParkingBalance: state.freeParkingBalance + amount,
          transactions: [...state.transactions, {
            id: genId(), type: 'free_parking_add', fromId: playerId, toId: null,
            amount, description: 'Added to Free Parking', timestamp: Date.now(),
            freeParkingDelta: amount,
          }],
        };
      }),

      collectFreeParking: (playerId) => set(state => {
        const amount = state.freeParkingBalance;
        if (amount === 0) return state;
        return {
          players: state.players.map(p =>
            p.id === playerId ? { ...p, balance: p.balance + amount } : p
          ),
          freeParkingBalance: 0,
          transactions: [...state.transactions, {
            id: genId(), type: 'free_parking_collect', fromId: null, toId: playerId,
            amount, description: 'Collected Free Parking', timestamp: Date.now(),
            freeParkingDelta: -amount,
          }],
        };
      }),

      assignProperty: (propertyId, ownerId, price) => set(state => {
        const prev = state.propertyOwnerships[propertyId];
        const prevOwnerId = prev?.ownerId ?? null;
        let players = state.players;
        let bankBalance = state.bankBalance;
        const transactions = [...state.transactions];

        if (ownerId !== null && price > 0) {
          // Player buys from bank — check funds first
          const buyer = state.players.find(p => p.id === ownerId);
          if (!buyer || buyer.balance < price) return state;
          players = players.map(p => p.id === ownerId ? { ...p, balance: p.balance - price } : p);
          bankBalance += price;
          transactions.push({
            id: genId(), type: 'property_buy', fromId: ownerId, toId: null,
            amount: price, description: `Bought ${MONOPOLY_PROPERTIES.find(p => p.id === propertyId)?.name}`,
            timestamp: Date.now(), propertyId, prevOwnerId,
          });
        } else if (ownerId === null && prevOwnerId !== null && price > 0) {
          // Player sells back to bank
          players = players.map(p => p.id === prevOwnerId ? { ...p, balance: p.balance + price } : p);
          bankBalance -= price;
          transactions.push({
            id: genId(), type: 'property_sell', fromId: null, toId: prevOwnerId,
            amount: price, description: `Sold ${MONOPOLY_PROPERTIES.find(p => p.id === propertyId)?.name}`,
            timestamp: Date.now(), propertyId, prevOwnerId,
          });
        }

        return {
          players,
          bankBalance,
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
          bankBalance: isMortgaging ? state.bankBalance - mortgageValue : state.bankBalance + unmortgageCost,
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
        bankBalance: BANK_STARTING_BALANCE,
        freeParkingBalance: 0,
        gameStartTime: Date.now(),
      }),

      updateSettings: (updates) => set(state => ({
        settings: { ...state.settings, ...updates },
      })),
    }),
    {
      name: 'monopoly-banker-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
