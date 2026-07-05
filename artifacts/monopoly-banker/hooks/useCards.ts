import { useMemo } from 'react';
import { useGameStore } from '@/store/gameStore';
import { VERSIONS } from '@/constants/versions';

export function useCards() {
  const version = useGameStore(s => s.settings.version);
  return useMemo(() => {
    const data = VERSIONS[version] || VERSIONS.US;
    return {
      chanceCards: data.chanceCards,
      communityChestCards: data.communityChestCards,
    };
  }, [version]);
}
