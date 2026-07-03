import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';

export function useColors() {
  const systemScheme = useColorScheme();
  const darkMode = useGameStore(s => s.settings.darkMode);
  const resolved = darkMode === 'system' ? systemScheme : darkMode;
  return resolved === 'dark' ? colors.dark : colors.light;
}
