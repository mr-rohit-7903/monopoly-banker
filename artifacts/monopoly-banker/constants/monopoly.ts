export type PropertyGroup =
  | 'brown' | 'lightblue' | 'pink' | 'orange'
  | 'red' | 'yellow' | 'green' | 'darkblue'
  | 'railroad' | 'utility';

export interface MonopolyProperty {
  id: string;
  name: string;
  group: PropertyGroup;
  groupColor: string;
  price: number;
  mortgage: number;
  rent: number;
  rentWith1: number;
  rentWith2: number;
  rentWith3: number;
  rentWith4?: number;
  rentWithHotel: number;
  housePrice: number;
  type: 'property' | 'railroad' | 'utility';
}

// Removed dynamic require to avoid circular dependency


const VERSION_GROUP_NAMES: Record<string, Record<PropertyGroup, string>> = {
  US: {
    brown: 'Brown',
    lightblue: 'Light Blue',
    pink: 'Pink',
    orange: 'Orange',
    red: 'Red',
    yellow: 'Yellow',
    green: 'Green',
    darkblue: 'Dark Blue',
    railroad: 'Railroad',
    utility: 'Utility',
  },
  IN: {
    brown: 'Brown',
    lightblue: 'Light Blue',
    pink: 'Pink',
    orange: 'Orange',
    red: 'Red',
    yellow: 'Yellow',
    green: 'Green',
    darkblue: 'Dark Blue',
    railroad: 'Railroad',
    utility: 'Utility',
  },
  INT: {
    brown: 'Europe A',
    lightblue: 'Europe B',
    pink: 'Asia A',
    orange: 'Asia B',
    red: 'Americas A',
    yellow: 'Americas B',
    green: 'Africa & Middle East A',
    darkblue: 'Africa & Middle East B',
    railroad: 'Transport',
    utility: 'Utilities',
  },
};

const VERSION_GROUP_COLORS: Record<string, Record<PropertyGroup, string>> = {
  US: {
    brown: '#795548',
    lightblue: '#29B6F6',
    pink: '#E91E63',
    orange: '#FF9800',
    red: '#F44336',
    yellow: '#FFEB3B',
    green: '#4CAF50',
    darkblue: '#1565C0',
    railroad: '#212121',
    utility: '#607D8B',
  },
  IN: {
    brown: '#795548',
    lightblue: '#29B6F6',
    pink: '#E91E63',
    orange: '#FF9800',
    red: '#F44336',
    yellow: '#FFEB3B',
    green: '#4CAF50',
    darkblue: '#1565C0',
    railroad: '#212121',
    utility: '#607D8B',
  },
  INT: {
    brown: '#C5A059',
    lightblue: '#C5A059',
    pink: '#1E90FF',
    orange: '#1E90FF',
    red: '#FFA500',
    yellow: '#FFA500',
    green: '#228B22',
    darkblue: '#228B22',
    railroad: '#212121',
    utility: '#212121',
  },
};

export function getGroupColor(group: PropertyGroup, version: string = 'US'): string {
  return VERSION_GROUP_COLORS[version]?.[group] || VERSION_GROUP_COLORS.US[group];
}

export function getGroupName(group: PropertyGroup, version: string = 'US'): string {
  return VERSION_GROUP_NAMES[version]?.[group] || VERSION_GROUP_NAMES.US[group];
}

import { VERSIONS } from './versions';

export const MONOPOLY_PROPERTIES: MonopolyProperty[] = VERSIONS.US.properties;

// Standard US Monopoly starting money: 2 x $500, 2 x $100, 2 x $50, 6 x $20, 5 x $10, 5 x $5, 5 x $1
export const STANDARD_STARTING_MONEY = 1500;
export const BANK_STARTING_BALANCE = 20580;
export const SALARY_AMOUNT = 200;
export const INCOME_TAX_AMOUNT = 200;
export const LUXURY_TAX_AMOUNT = 100;

export const PROPERTY_GROUPS: PropertyGroup[] = [
  'brown', 'lightblue', 'pink', 'orange', 'red', 'yellow', 'green', 'darkblue', 'railroad', 'utility',
];

export function getProperties(version: string): MonopolyProperty[] {
  return (VERSIONS[version] || VERSIONS.US).properties;
}
