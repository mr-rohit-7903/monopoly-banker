import React, { useEffect, useRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { create } from 'zustand';

/* ─── Toast store ─── */
export type ToastVariant = 'error' | 'success' | 'info' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastState {
  toasts: ToastItem[];
  push: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: number) => void;
}

let _nextId = 0;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  push: (message, variant = 'error') => {
    const id = ++_nextId;
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
    // Auto-dismiss after 4s
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** Shortcut: show a toast from anywhere */
export const toast = {
  error: (msg: string) => useToastStore.getState().push(msg, 'error'),
  success: (msg: string) => useToastStore.getState().push(msg, 'success'),
  info: (msg: string) => useToastStore.getState().push(msg, 'info'),
  warning: (msg: string) => useToastStore.getState().push(msg, 'warning'),
};

/* ─── Single toast row ─── */
function ToastRow({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-30)).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver }),
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver }),
    ]).start();
  }, []);

  const ICON_MAP: Record<ToastVariant, { name: string; bg: string; fg: string }> = {
    error: { name: 'alert-circle', bg: colors.destructive + '18', fg: colors.destructive },
    success: { name: 'check-circle', bg: colors.success + '18', fg: colors.success },
    info: { name: 'information', bg: colors.primary + '18', fg: colors.primary },
    warning: { name: 'alert', bg: '#F59E0B18', fg: '#F59E0B' },
  };

  const cfg = ICON_MAP[item.variant];

  return (
    <Animated.View style={[styles.row, { opacity, transform: [{ translateY }], backgroundColor: colors.card, borderColor: cfg.fg + '44' }]}>
      <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
        <MaterialCommunityIcons name={cfg.name as any} size={20} color={cfg.fg} />
      </View>
      <Text style={[styles.msg, { color: colors.foreground }]} numberOfLines={3}>{item.message}</Text>
      <Pressable onPress={onDismiss} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
        <MaterialCommunityIcons name="close" size={18} color={colors.mutedForeground} />
      </Pressable>
    </Animated.View>
  );
}

/* ─── Toast container — render once in _layout ─── */
export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <View style={[styles.container, { pointerEvents: 'box-none' as any }]}>
      {toasts.map((t) => (
        <ToastRow key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    maxWidth: 460,
    width: '100%',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.12)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      }
    }),
    elevation: 6,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  msg: {
    flex: 1,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    lineHeight: 18,
  },
});
