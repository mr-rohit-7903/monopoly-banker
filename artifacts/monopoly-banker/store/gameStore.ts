import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MONOPOLY_PROPERTIES, getProperties, STANDARD_STARTING_MONEY, SALARY_AMOUNT, INCOME_TAX_AMOUNT, LUXURY_TAX_AMOUNT } from '@/constants/monopoly';

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export interface Player {
  id: string;
  name: string;
  color: string;
  balance: number;
  jailCards: number; // Get Out of Jail Free cards held
  isBankrupt?: boolean;
}

export type TransactionType =
  | 'transfer' | 'bank_give' | 'bank_receive'
  | 'salary' | 'income_tax' | 'luxury_tax'
  | 'mortgage' | 'unmortgage'
  | 'property_buy' | 'property_sell'
  | 'chance_card' | 'community_card'
  | 'jail_fine' | 'jail_card'
  | 'free_parking'
  | 'trade';

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
  version: 'US' | 'IN' | 'INT';
  darkMode: 'light' | 'dark' | 'system';
  salaryAmount: number;
  incomeTaxAmount: number;
  luxuryTaxAmount: number;
}

export interface PendingTrade {
  id: string;
  initiatorId: string;
  playerAId: string;
  playerBId: string;
  moneyAtoB: number;
  moneyBtoA: number;
  propsAtoB: string[];
  propsBtoA: string[];
  timestamp: number;
}

const DEFAULT_SETTINGS: GameSettings = {
  startingMoney: STANDARD_STARTING_MONEY,
  currency: '$',
  version: 'US',
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
  appMode: 'offline' | 'online' | null;
  pendingTrades: PendingTrade[];

  // Player actions
  addPlayer: (name: string, color: string) => string;
  removePlayer: (id: string) => void;
  updatePlayer: (id: string, updates: { name?: string; color?: string }) => void;
  declareBankrupt: (id: string) => void;
  addJailCard: (playerId: string) => void;
  useJailCard: (playerId: string) => boolean;

  // Banking actions
  transfer: (fromId: string | null, toId: string | null, amount: number, type: TransactionType, description: string) => boolean;
  undoLastTransaction: () => void;
  collectSalary: (playerId: string) => void;
  payJailFine: (playerId: string) => boolean;
  setAppMode: (mode: 'offline' | 'online' | null) => void;

  // Property actions
  assignProperty: (propertyId: string, ownerId: string | null, price: number) => void;
  setHouses: (propertyId: string, houses: number, hotel: boolean) => void;
  toggleMortgage: (propertyId: string) => void;

  // Trade actions
  executeTrade: (trade: {
    playerAId: string;
    playerBId: string;
    moneyAtoB: number;       // money A gives to B
    moneyBtoA: number;       // money B gives to A
    propsAtoB: string[];     // property IDs A gives to B
    propsBtoA: string[];     // property IDs B gives to A
  }) => boolean;
  proposeTrade: (trade: Omit<PendingTrade, 'id' | 'timestamp'>) => void;
  acceptTrade: (tradeId: string) => boolean;
  rejectTrade: (tradeId: string) => void;

  // Game actions
  resetGame: () => void;
  restartGame: () => void;
  updateSettings: (updates: Partial<GameSettings>) => void;
  claimFreeParking: (playerId: string) => boolean;
}

export function calculateFreeParkingPot(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => {
    if (t.toId === null && t.fromId !== null && ['income_tax', 'luxury_tax', 'chance_card', 'community_card', 'jail_fine', 'bank_receive'].includes(t.type)) {
      return sum + t.amount;
    }
    if (t.type === 'free_parking' && t.fromId === null && t.toId !== null) {
      return sum - t.amount;
    }
    return sum;
  }, 0);
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      players: [],
      transactions: [],
      propertyOwnerships: initOwnerships(),
      settings: DEFAULT_SETTINGS,
      gameStartTime: Date.now(),
      appMode: null,
      pendingTrades: [],

      setAppMode: (mode) => set({ appMode: mode }),

      addPlayer: (name, color) => {
        const id = genId();
        set(state => ({
          players: [...state.players, {
            id,
            name: name.trim(),
            color,
            balance: state.settings.startingMoney,
            jailCards: 0,
            isBankrupt: false,
          }],
        }));
        return id;
      },

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

      declareBankrupt: (id) => set(state => ({
        players: state.players.map(p => p.id === id ? { ...p, isBankrupt: true } : p),
      })),

      addJailCard: (playerId) => {
        if (get().settings.version === 'INT') return;
        set(state => ({
          players: state.players.map(p =>
            p.id === playerId ? { ...p, jailCards: p.jailCards + 1 } : p
          )
        }))
      },

      useJailCard: (playerId) => {
        const player = get().players.find(p => p.id === playerId);
        if (!player || player.jailCards <= 0 || player.isBankrupt) return false;
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
        if (fromId !== null) {
          const from = state.players.find(p => p.id === fromId);
          if (!from || from.balance < amount || from.isBankrupt) return false;
        }
        if (toId !== null) {
          const to = state.players.find(p => p.id === toId);
          if (!to || to.isBankrupt) return false;
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

        if (type === 'jail_card' && fromId !== null) {
          players = players.map(p =>
            p.id === fromId ? { ...p, jailCards: p.jailCards + 1 } : p
          );
        }

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
        const { settings, transfer, players } = get();
        const player = players.find(p => p.id === playerId);
        if (player?.isBankrupt) return;
        transfer(null, playerId, settings.salaryAmount, 'salary', 'Salary — passed Go');
      },

      payJailFine: (playerId) => {
        const { transfer, settings } = get();
        const fine = settings.version === 'INT' ? 500 : 50;
        return transfer(playerId, null, fine, 'jail_fine', `Paid Jail Fine (${settings.version === 'INT' ? '$500' : '$50'})`);
      },

      assignProperty: (propertyId, ownerId, price) => set(state => {
        const prev = state.propertyOwnerships[propertyId];
        const prevOwnerId = prev?.ownerId ?? null;
        let players = state.players;
        const transactions = [...state.transactions];

        if (ownerId !== null && price > 0) {
          const buyer = state.players.find(p => p.id === ownerId);
          if (!buyer || buyer.balance < price) return state;
          players = players.map(p => p.id === ownerId ? { ...p, balance: p.balance - price } : p);
          const propName = getProperties(state.settings.version).find(p => p.id === propertyId)?.name;
          transactions.push({
            id: genId(), type: 'property_buy', fromId: ownerId, toId: null,
            amount: price, description: `Bought ${propName}`,
            timestamp: Date.now(), propertyId, prevOwnerId,
          });
        } else if (ownerId !== null && price === 0 && prevOwnerId !== null) {
          const propName = getProperties(state.settings.version).find(p => p.id === propertyId)?.name;
          transactions.push({
            id: genId(), type: 'property_buy', fromId: ownerId, toId: null,
            amount: 0, description: `Traded ${propName}`,
            timestamp: Date.now(), propertyId, prevOwnerId,
          });
        }

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
        const property = getProperties(state.settings.version).find(p => p.id === propertyId);
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

      executeTrade: ({ playerAId, playerBId, moneyAtoB = 0, moneyBtoA = 0, propsAtoB = [], propsBtoA = [] }) => {
        const state = get();
        const playerA = state.players.find(p => p.id === playerAId);
        const playerB = state.players.find(p => p.id === playerBId);
        if (!playerA || !playerB || playerA.isBankrupt || playerB.isBankrupt) return false;

        const netA = moneyBtoA - moneyAtoB;
        const netB = moneyAtoB - moneyBtoA;

        if (playerA.balance + netA < 0) return false;
        if (playerB.balance + netB < 0) return false;

        for (const pid of propsAtoB) {
          if (state.propertyOwnerships[pid]?.ownerId !== playerAId) return false;
        }
        for (const pid of propsBtoA) {
          if (state.propertyOwnerships[pid]?.ownerId !== playerBId) return false;
        }

        const parts: string[] = [];
        if (moneyAtoB > 0) parts.push(`${playerA.name} pays ${state.settings.currency}${moneyAtoB}`);
        if (moneyBtoA > 0) parts.push(`${playerB.name} pays ${state.settings.currency}${moneyBtoA}`);
        const props = getProperties(state.settings.version);
        const propNames = (ids: string[]) =>
          ids.map(id => props.find(p => p.id === id)?.name ?? id).join(', ');
        if (propsAtoB.length > 0) parts.push(`${playerA.name} gives ${propNames(propsAtoB)}`);
        if (propsBtoA.length > 0) parts.push(`${playerB.name} gives ${propNames(propsBtoA)}`);
        const description = `Trade: ${parts.join(' · ')}`;

        set(state => {
          const players = state.players.map(p => {
            if (p.id === playerAId) return { ...p, balance: p.balance + netA };
            if (p.id === playerBId) return { ...p, balance: p.balance + netB };
            return p;
          });

          const ownerships = { ...state.propertyOwnerships };
          for (const pid of propsAtoB) {
            ownerships[pid] = { ...ownerships[pid], ownerId: playerBId };
          }
          for (const pid of propsBtoA) {
            ownerships[pid] = { ...ownerships[pid], ownerId: playerAId };
          }

          return {
            players,
            propertyOwnerships: ownerships,
            transactions: [...state.transactions, {
              id: genId(), type: 'trade' as const,
              fromId: playerAId, toId: playerBId,
              amount: moneyAtoB + moneyBtoA,
              description,
              timestamp: Date.now(),
            }],
          };
        });
        return true;
      },

      proposeTrade: (trade) => {
        const id = genId();
        set((state) => ({
          pendingTrades: [...(state.pendingTrades || []), { ...trade, id, timestamp: Date.now() }]
        }));
      },

      acceptTrade: (tradeId) => {
        const state = get();
        const trade = state.pendingTrades.find(t => t.id === tradeId);
        if (!trade) return false;
        const ok = state.executeTrade({
          playerAId: trade.playerAId,
          playerBId: trade.playerBId,
          moneyAtoB: trade.moneyAtoB,
          moneyBtoA: trade.moneyBtoA,
          propsAtoB: trade.propsAtoB,
          propsBtoA: trade.propsBtoA,
        });

        if (ok) {
          set(s => ({ pendingTrades: s.pendingTrades.filter(t => t.id !== tradeId) }));
        }
        return ok;
      },

      rejectTrade: (tradeId) => {
        set(s => ({ pendingTrades: s.pendingTrades.filter(t => t.id !== tradeId) }));
      },

      resetGame: () => set({
        players: [],
        transactions: [],
        propertyOwnerships: initOwnerships(),
        gameStartTime: Date.now(),
        appMode: null,
        pendingTrades: [],
      }),

      restartGame: () => set(state => ({
        players: state.players.map(p => ({
          ...p,
          balance: state.settings.startingMoney,
          jailCards: 0,
          isBankrupt: false,
        })),
        transactions: [],
        propertyOwnerships: initOwnerships(),
        gameStartTime: Date.now(),
      })),

      updateSettings: (updates) => set(state => {
        const newSettings = { ...state.settings, ...updates };
        if (updates.version) {
          if (updates.version === 'IN') {
            newSettings.currency = '₹';
            newSettings.startingMoney = 1500;
            newSettings.salaryAmount = 200;
            newSettings.incomeTaxAmount = 200;
            newSettings.luxuryTaxAmount = 100;
          } else if (updates.version === 'INT') {
            newSettings.currency = '$';
            newSettings.startingMoney = 25000;
            newSettings.salaryAmount = 1500;
            newSettings.incomeTaxAmount = 2000;
            newSettings.luxuryTaxAmount = 1000;
          } else { // US
            newSettings.currency = '$';
            newSettings.startingMoney = 1500;
            newSettings.salaryAmount = 200;
            newSettings.incomeTaxAmount = 200;
            newSettings.luxuryTaxAmount = 100;
          }
        }
        return { settings: newSettings };
      }),

      claimFreeParking: (playerId) => {
        const state = get();
        const pot = calculateFreeParkingPot(state.transactions);
        if (pot <= 0) return false;
        
        const player = state.players.find(p => p.id === playerId);
        if (!player || player.isBankrupt) return false;
        
        set(state => ({
          players: state.players.map(p => p.id === playerId ? { ...p, balance: p.balance + pot } : p),
          transactions: [...state.transactions, {
            id: genId(), type: 'free_parking',
            fromId: null, toId: playerId,
            amount: pot,
            description: `Claimed Free Parking Pot (${state.settings.currency}${pot})`,
            timestamp: Date.now(),
          }],
        }));
        return true;
      },
    }),
    {
      name: 'monopoly-banker-v5',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
