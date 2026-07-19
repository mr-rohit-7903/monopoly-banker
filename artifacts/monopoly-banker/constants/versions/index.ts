import { MonopolyProperty } from '../monopoly';
import { MonopolyCard } from '../cards';

import us from './us.json';
import inVersion from './in.json';
import intVersion from './int.json';

export interface VersionData {
  properties: MonopolyProperty[];
  chanceCards: MonopolyCard[];
  communityChestCards: MonopolyCard[];
}

export const VERSIONS: Record<string, VersionData> = {
  US: us as unknown as VersionData,
  IN: inVersion as unknown as VersionData,
  INT: intVersion as unknown as VersionData,
};
