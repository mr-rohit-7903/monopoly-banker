import { MonopolyProperty } from '../monopoly';

import us from './us.json';
import inVersion from './in.json';

export const VERSIONS: Record<string, MonopolyProperty[]> = {
  US: us as MonopolyProperty[],
  IN: inVersion as MonopolyProperty[],
};
