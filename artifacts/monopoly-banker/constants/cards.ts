// All 16 Chance + 16 Community Chest card definitions

export type CardActionType =
  | 'bank_give'    // bank pays player a fixed amount
  | 'player_pay'   // player pays bank a fixed amount
  | 'salary'       // advance to GO — collect $200 from bank
  | 'repairs'      // pay per house / hotel owned
  | 'birthday'     // collect fixed amount from every other player
  | 'display';     // movement / jail / GOOJF — no automatic money

export interface MonopolyCard {
  id: string;
  deck: 'chance' | 'community';
  emoji: string;
  title: string;
  description: string;
  action: CardActionType;
  amount?: number;        // for bank_give / player_pay / birthday / salary
  houseAmount?: number;   // for repairs
  hotelAmount?: number;   // for repairs
  hasGoBonus?: boolean;   // movement cards where passing GO is possible
  isGoojf?: boolean;      // Get Out of Jail Free — grants player a jail card
}

// JSON files now contain the chance and community chest definitions
