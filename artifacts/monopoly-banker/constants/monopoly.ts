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
  rentWith4: number;
  rentWithHotel: number;
  housePrice: number;
  type: 'property' | 'railroad' | 'utility';
}

export const GROUP_COLORS: Record<PropertyGroup, string> = {
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
};

export const GROUP_NAMES: Record<PropertyGroup, string> = {
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
};

export const MONOPOLY_PROPERTIES: MonopolyProperty[] = [
  // Brown
  {
    id: 'mediterranean', name: 'Mediterranean Ave', group: 'brown', groupColor: GROUP_COLORS.brown,
    price: 60, mortgage: 30, rent: 2, rentWith1: 10, rentWith2: 30, rentWith3: 90, rentWith4: 160, rentWithHotel: 250, housePrice: 50, type: 'property',
  },
  {
    id: 'baltic', name: 'Baltic Ave', group: 'brown', groupColor: GROUP_COLORS.brown,
    price: 60, mortgage: 30, rent: 4, rentWith1: 20, rentWith2: 60, rentWith3: 180, rentWith4: 320, rentWithHotel: 450, housePrice: 50, type: 'property',
  },
  // Light Blue
  {
    id: 'oriental', name: 'Oriental Ave', group: 'lightblue', groupColor: GROUP_COLORS.lightblue,
    price: 100, mortgage: 50, rent: 6, rentWith1: 30, rentWith2: 90, rentWith3: 270, rentWith4: 400, rentWithHotel: 550, housePrice: 50, type: 'property',
  },
  {
    id: 'vermont', name: 'Vermont Ave', group: 'lightblue', groupColor: GROUP_COLORS.lightblue,
    price: 100, mortgage: 50, rent: 6, rentWith1: 30, rentWith2: 90, rentWith3: 270, rentWith4: 400, rentWithHotel: 550, housePrice: 50, type: 'property',
  },
  {
    id: 'connecticut', name: 'Connecticut Ave', group: 'lightblue', groupColor: GROUP_COLORS.lightblue,
    price: 120, mortgage: 60, rent: 8, rentWith1: 40, rentWith2: 100, rentWith3: 300, rentWith4: 450, rentWithHotel: 600, housePrice: 50, type: 'property',
  },
  // Pink
  {
    id: 'stcharles', name: 'St. Charles Place', group: 'pink', groupColor: GROUP_COLORS.pink,
    price: 140, mortgage: 70, rent: 10, rentWith1: 50, rentWith2: 150, rentWith3: 450, rentWith4: 625, rentWithHotel: 750, housePrice: 100, type: 'property',
  },
  {
    id: 'states', name: 'States Ave', group: 'pink', groupColor: GROUP_COLORS.pink,
    price: 140, mortgage: 70, rent: 10, rentWith1: 50, rentWith2: 150, rentWith3: 450, rentWith4: 625, rentWithHotel: 750, housePrice: 100, type: 'property',
  },
  {
    id: 'virginia', name: 'Virginia Ave', group: 'pink', groupColor: GROUP_COLORS.pink,
    price: 160, mortgage: 80, rent: 12, rentWith1: 60, rentWith2: 180, rentWith3: 500, rentWith4: 700, rentWithHotel: 900, housePrice: 100, type: 'property',
  },
  // Orange
  {
    id: 'stjames', name: 'St. James Place', group: 'orange', groupColor: GROUP_COLORS.orange,
    price: 180, mortgage: 90, rent: 14, rentWith1: 70, rentWith2: 200, rentWith3: 550, rentWith4: 750, rentWithHotel: 950, housePrice: 100, type: 'property',
  },
  {
    id: 'tennessee', name: 'Tennessee Ave', group: 'orange', groupColor: GROUP_COLORS.orange,
    price: 180, mortgage: 90, rent: 14, rentWith1: 70, rentWith2: 200, rentWith3: 550, rentWith4: 750, rentWithHotel: 950, housePrice: 100, type: 'property',
  },
  {
    id: 'newyork', name: 'New York Ave', group: 'orange', groupColor: GROUP_COLORS.orange,
    price: 200, mortgage: 100, rent: 16, rentWith1: 80, rentWith2: 220, rentWith3: 600, rentWith4: 800, rentWithHotel: 1000, housePrice: 100, type: 'property',
  },
  // Red
  {
    id: 'kentucky', name: 'Kentucky Ave', group: 'red', groupColor: GROUP_COLORS.red,
    price: 220, mortgage: 110, rent: 18, rentWith1: 90, rentWith2: 250, rentWith3: 700, rentWith4: 875, rentWithHotel: 1050, housePrice: 150, type: 'property',
  },
  {
    id: 'indiana', name: 'Indiana Ave', group: 'red', groupColor: GROUP_COLORS.red,
    price: 220, mortgage: 110, rent: 18, rentWith1: 90, rentWith2: 250, rentWith3: 700, rentWith4: 875, rentWithHotel: 1050, housePrice: 150, type: 'property',
  },
  {
    id: 'illinois', name: 'Illinois Ave', group: 'red', groupColor: GROUP_COLORS.red,
    price: 240, mortgage: 120, rent: 20, rentWith1: 100, rentWith2: 300, rentWith3: 750, rentWith4: 925, rentWithHotel: 1100, housePrice: 150, type: 'property',
  },
  // Yellow
  {
    id: 'atlantic', name: 'Atlantic Ave', group: 'yellow', groupColor: GROUP_COLORS.yellow,
    price: 260, mortgage: 130, rent: 22, rentWith1: 110, rentWith2: 330, rentWith3: 800, rentWith4: 975, rentWithHotel: 1150, housePrice: 150, type: 'property',
  },
  {
    id: 'ventnor', name: 'Ventnor Ave', group: 'yellow', groupColor: GROUP_COLORS.yellow,
    price: 260, mortgage: 130, rent: 22, rentWith1: 110, rentWith2: 330, rentWith3: 800, rentWith4: 975, rentWithHotel: 1150, housePrice: 150, type: 'property',
  },
  {
    id: 'marvingardens', name: 'Marvin Gardens', group: 'yellow', groupColor: GROUP_COLORS.yellow,
    price: 280, mortgage: 140, rent: 24, rentWith1: 120, rentWith2: 360, rentWith3: 850, rentWith4: 1025, rentWithHotel: 1200, housePrice: 150, type: 'property',
  },
  // Green
  {
    id: 'pacific', name: 'Pacific Ave', group: 'green', groupColor: GROUP_COLORS.green,
    price: 300, mortgage: 150, rent: 26, rentWith1: 130, rentWith2: 390, rentWith3: 900, rentWith4: 1100, rentWithHotel: 1275, housePrice: 200, type: 'property',
  },
  {
    id: 'northcarolina', name: 'North Carolina Ave', group: 'green', groupColor: GROUP_COLORS.green,
    price: 300, mortgage: 150, rent: 26, rentWith1: 130, rentWith2: 390, rentWith3: 900, rentWith4: 1100, rentWithHotel: 1275, housePrice: 200, type: 'property',
  },
  {
    id: 'pennsylvania', name: 'Pennsylvania Ave', group: 'green', groupColor: GROUP_COLORS.green,
    price: 320, mortgage: 160, rent: 28, rentWith1: 150, rentWith2: 450, rentWith3: 1000, rentWith4: 1200, rentWithHotel: 1400, housePrice: 200, type: 'property',
  },
  // Dark Blue
  {
    id: 'parkplace', name: 'Park Place', group: 'darkblue', groupColor: GROUP_COLORS.darkblue,
    price: 350, mortgage: 175, rent: 35, rentWith1: 175, rentWith2: 500, rentWith3: 1100, rentWith4: 1300, rentWithHotel: 1500, housePrice: 200, type: 'property',
  },
  {
    id: 'boardwalk', name: 'Boardwalk', group: 'darkblue', groupColor: GROUP_COLORS.darkblue,
    price: 400, mortgage: 200, rent: 50, rentWith1: 200, rentWith2: 600, rentWith3: 1400, rentWith4: 1700, rentWithHotel: 2000, housePrice: 200, type: 'property',
  },
  // Railroads
  {
    id: 'reading', name: 'Reading Railroad', group: 'railroad', groupColor: GROUP_COLORS.railroad,
    price: 200, mortgage: 100, rent: 25, rentWith1: 50, rentWith2: 100, rentWith3: 200, rentWith4: 200, rentWithHotel: 200, housePrice: 0, type: 'railroad',
  },
  {
    id: 'pennsylvaniarr', name: 'Pennsylvania Railroad', group: 'railroad', groupColor: GROUP_COLORS.railroad,
    price: 200, mortgage: 100, rent: 25, rentWith1: 50, rentWith2: 100, rentWith3: 200, rentWith4: 200, rentWithHotel: 200, housePrice: 0, type: 'railroad',
  },
  {
    id: 'bando', name: 'B. & O. Railroad', group: 'railroad', groupColor: GROUP_COLORS.railroad,
    price: 200, mortgage: 100, rent: 25, rentWith1: 50, rentWith2: 100, rentWith3: 200, rentWith4: 200, rentWithHotel: 200, housePrice: 0, type: 'railroad',
  },
  {
    id: 'shortline', name: 'Short Line Railroad', group: 'railroad', groupColor: GROUP_COLORS.railroad,
    price: 200, mortgage: 100, rent: 25, rentWith1: 50, rentWith2: 100, rentWith3: 200, rentWith4: 200, rentWithHotel: 200, housePrice: 0, type: 'railroad',
  },
  // Utilities
  {
    id: 'electric', name: 'Electric Company', group: 'utility', groupColor: GROUP_COLORS.utility,
    price: 150, mortgage: 75, rent: 0, rentWith1: 0, rentWith2: 0, rentWith3: 0, rentWith4: 0, rentWithHotel: 0, housePrice: 0, type: 'utility',
  },
  {
    id: 'waterworks', name: 'Water Works', group: 'utility', groupColor: GROUP_COLORS.utility,
    price: 150, mortgage: 75, rent: 0, rentWith1: 0, rentWith2: 0, rentWith3: 0, rentWith4: 0, rentWithHotel: 0, housePrice: 0, type: 'utility',
  },
];

// Standard US Monopoly starting money: 2 x $500, 2 x $100, 2 x $50, 6 x $20, 5 x $10, 5 x $5, 5 x $1
export const STANDARD_STARTING_MONEY = 1500;
export const BANK_STARTING_BALANCE = 20580;
export const SALARY_AMOUNT = 200;
export const INCOME_TAX_AMOUNT = 200;
export const LUXURY_TAX_AMOUNT = 100;

export const PROPERTY_GROUPS: PropertyGroup[] = [
  'brown', 'lightblue', 'pink', 'orange', 'red', 'yellow', 'green', 'darkblue', 'railroad', 'utility',
];

const IN_OVERRIDES: Record<string, { name: string; price: number }> = {
  // Brown
  'mediterranean': { name: 'Agra', price: 100 },
  'baltic': { name: 'Panaji (Goa)', price: 100 },
  // Light Blue
  'oriental': { name: 'Vadodara', price: 140 },
  'vermont': { name: 'Bhubaneswar', price: 160 },
  'connecticut': { name: 'Guwahati', price: 180 },
  // Pink
  'stcharles': { name: 'Bhopal', price: 140 },
  'states': { name: 'Patna', price: 140 },
  'virginia': { name: 'Ludhiana', price: 140 },
  // Orange
  'stjames': { name: 'Nagpur', price: 180 },
  'tennessee': { name: 'Indore', price: 180 },
  'newyork': { name: 'Kochi', price: 180 },
  // Red
  'kentucky': { name: 'Jaipur', price: 240 },
  'indiana': { name: 'Chandigarh', price: 220 },
  'illinois': { name: 'Lucknow', price: 220 },
  // Yellow
  'atlantic': { name: 'Pune', price: 260 },
  'ventnor': { name: 'Ahmedabad', price: 280 },
  'marvingardens': { name: 'Hyderabad', price: 260 },
  // Green
  'pacific': { name: 'Kolkata', price: 300 },
  'northcarolina': { name: 'Bengaluru', price: 320 },
  'pennsylvania': { name: 'Delhi', price: 350 },
  // Dark Blue
  'parkplace': { name: 'Chennai', price: 300 },
  'boardwalk': { name: 'Mumbai', price: 400 },
  // Railroads
  'reading': { name: 'Chhatrapati Shivaji Terminus', price: 200 },
  'pennsylvaniarr': { name: 'New Delhi', price: 200 },
  'bando': { name: 'Howrah', price: 200 },
  'shortline': { name: 'Chennai Central', price: 200 },
  // Utilities
  'electric': { name: 'Electric Company', price: 150 },
  'waterworks': { name: 'Water Works', price: 150 },
};

export function getProperties(version: 'US' | 'IN'): MonopolyProperty[] {
  if (version === 'US') return MONOPOLY_PROPERTIES;
  
  return MONOPOLY_PROPERTIES.map(p => {
    const override = IN_OVERRIDES[p.id];
    if (override) {
      return {
        ...p,
        name: override.name,
        price: override.price,
        mortgage: override.price / 2,
      };
    }
    return p;
  });
}
