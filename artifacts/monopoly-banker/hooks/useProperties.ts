import { useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { getProperties } from '@/constants/monopoly';

export function useProperties() {
  const version = useGameStore(s => s.settings.version);
  return useMemo(() => getProperties(version), [version]);
}
