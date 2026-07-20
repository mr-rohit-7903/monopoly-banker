import { useMultiplayerStore } from '@/store/multiplayerStore';

/**
 * Returns multiplayer permission info.
 * In offline/local mode, everything is allowed (isMultiplayer = false).
 * In multiplayer mode, only actions for myPlayerId are allowed.
 */
export function useMultiplayerPermissions() {
  const status = useMultiplayerStore(s => s.status);
  const myPlayerId = useMultiplayerStore(s => s.myPlayerId);

  const isMultiplayer = status === 'connected';

  return {
    isMultiplayer,
    myPlayerId: isMultiplayer ? myPlayerId : null,

    /** Can this device perform actions as the given player? */
    canActAs: (playerId: string) => {
      if (!isMultiplayer) return true; // Local mode — full access
      return playerId === myPlayerId;
    },

    /** Can this device initiate a transfer FROM this player? (spend their money) */
    canSpendAs: (playerId: string) => {
      if (!isMultiplayer) return true;
      return playerId === myPlayerId;
    },

    /** Can this device receive money for this player? Only if it's their own device. */
    canReceiveAs: (playerId: string) => {
      if (!isMultiplayer) return true;
      return playerId === myPlayerId;
    },
  };
}
