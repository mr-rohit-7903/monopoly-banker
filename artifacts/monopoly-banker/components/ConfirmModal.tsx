import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: 'primary' | 'destructive';
  icon?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmVariant = 'primary',
  icon = 'help-circle',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const colors = useColors();
  
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.modalBody}>
            <MaterialCommunityIcons 
              name={icon as any} 
              size={36} 
              color={confirmVariant === 'destructive' ? colors.destructive : colors.primary} 
              style={{ marginBottom: 12 }} 
            />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>{message}</Text>
            
            <View style={styles.modalBtns}>
              <Pressable
                onPress={onCancel}
                style={({ pressed }) => [
                  styles.modalCancel,
                  { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.modalCancelText, { color: colors.foreground }]}>{cancelText}</Text>
              </Pressable>
              <Pressable
                onPress={onConfirm}
                style={({ pressed }) => [
                  styles.modalConfirm,
                  { 
                    backgroundColor: confirmVariant === 'destructive' ? colors.destructive : colors.primary, 
                    opacity: pressed ? 0.8 : 1 
                  },
                ]}
              >
                <Text style={styles.modalConfirmText}>{confirmText}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalBody: {
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 16,
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    color: '#fff',
  },
});
