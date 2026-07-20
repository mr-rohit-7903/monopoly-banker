import React from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useGameStore } from '@/store/gameStore';
import { useMultiplayerStore } from '@/store/multiplayerStore';
import { formatMoney } from '@/utils/format';
import { useProperties } from '@/hooks/useProperties';
import * as Haptics from 'expo-haptics';

export function PendingTradesOverlay() {
  const colors = useColors();
  const properties = useProperties();
  const currency = useGameStore(s => s.settings.currency);
  const version = useGameStore(s => s.settings.version);
  
  const pendingTrades = useGameStore(s => s.pendingTrades) || [];
  const players = useGameStore(s => s.players);
  const acceptTrade = useGameStore(s => s.acceptTrade);
  const rejectTrade = useGameStore(s => s.rejectTrade);
  const myPlayerId = useMultiplayerStore(s => s.myPlayerId);

  // Find a trade that involves ME, but I didn't initiate it
  const trade = pendingTrades.find(t => 
    t.initiatorId !== myPlayerId && 
    (t.playerAId === myPlayerId || t.playerBId === myPlayerId)
  );

  if (!trade) return null;

  const playerA = players.find(p => p.id === trade.playerAId);
  const playerB = players.find(p => p.id === trade.playerBId);
  if (!playerA || !playerB) return null;

  // I am either A or B. Let's figure out what I am receiving and what I am giving.
  const amIA = myPlayerId === trade.playerAId;
  const otherPlayer = amIA ? playerB : playerA;
  
  const iGiveMoney = (amIA ? trade.moneyAtoB : trade.moneyBtoA) || 0;
  const iReceiveMoney = (amIA ? trade.moneyBtoA : trade.moneyAtoB) || 0;
  
  const iGiveProps = (amIA ? trade.propsAtoB : trade.propsBtoA) || [];
  const iReceiveProps = (amIA ? trade.propsBtoA : trade.propsAtoB) || [];

  const getPropName = (id: string) => properties.find(p => p.id === id)?.name || id;

  const handleAccept = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    acceptTrade(trade.id);
  };

  const handleReject = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    rejectTrade(trade.id);
  };

  return (
    <Modal visible={true} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.modalBody}>
            <MaterialCommunityIcons name="handshake" size={48} color={colors.primary} style={{ marginBottom: 12 }} />
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Trade Offer</Text>
            <Text style={[styles.modalSub, { color: colors.mutedForeground }]}>
              {otherPlayer.name} has proposed a trade!
            </Text>

            <View style={styles.tradeDetails}>
              {/* What I receive */}
              <View style={[styles.tradeBox, { backgroundColor: colors.success + '11', borderColor: colors.success + '44' }]}>
                <Text style={[styles.boxTitle, { color: colors.success }]}>You Receive</Text>
                {iReceiveMoney > 0 && (
                  <Text style={[styles.itemText, { color: colors.foreground }]}>
                    +{formatMoney(iReceiveMoney, currency)}
                  </Text>
                )}
                {iReceiveProps.map(pid => (
                  <Text key={pid} style={[styles.itemText, { color: colors.foreground }]}>
                    🏡 {getPropName(pid)}
                  </Text>
                ))}
                {iReceiveMoney === 0 && iReceiveProps.length === 0 && (
                  <Text style={[styles.itemText, { color: colors.mutedForeground, fontStyle: 'italic' }]}>Nothing</Text>
                )}
              </View>

              <MaterialCommunityIcons name="swap-vertical" size={24} color={colors.mutedForeground} style={{ alignSelf: 'center', marginVertical: 8 }} />

              {/* What I give */}
              <View style={[styles.tradeBox, { backgroundColor: colors.destructive + '11', borderColor: colors.destructive + '44' }]}>
                <Text style={[styles.boxTitle, { color: colors.destructive }]}>You Give</Text>
                {iGiveMoney > 0 && (
                  <Text style={[styles.itemText, { color: colors.foreground }]}>
                    -{formatMoney(iGiveMoney, currency)}
                  </Text>
                )}
                {iGiveProps.map(pid => (
                  <Text key={pid} style={[styles.itemText, { color: colors.foreground }]}>
                    🏡 {getPropName(pid)}
                  </Text>
                ))}
                {iGiveMoney === 0 && iGiveProps.length === 0 && (
                  <Text style={[styles.itemText, { color: colors.mutedForeground, fontStyle: 'italic' }]}>Nothing</Text>
                )}
              </View>
            </View>
            
            <View style={styles.modalBtns}>
              <Pressable
                onPress={handleReject}
                style={({ pressed }) => [
                  styles.modalCancel,
                  { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Text style={[styles.modalCancelText, { color: colors.foreground }]}>Reject</Text>
              </Pressable>
              <Pressable
                onPress={handleAccept}
                style={({ pressed }) => [
                  styles.modalConfirm,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Text style={styles.modalConfirmText}>Accept Trade</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
    ...Platform.select({
      web: {
        boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.2)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      }
    }),
    elevation: 10,
  },
  modalBody: {
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 22,
    marginBottom: 4,
    textAlign: 'center',
  },
  modalSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
  },
  tradeDetails: {
    width: '100%',
    marginBottom: 24,
  },
  tradeBox: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  boxTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  itemText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 15,
    marginBottom: 4,
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
