import React, { useState } from 'react';
import {
  Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useGameStore } from '@/store/gameStore';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { TransactionItem } from '@/components/TransactionItem';
import { formatMoney } from '@/utils/format';
import colorConstants from '@/constants/colors';
import { MONOPOLY_PROPERTIES, GROUP_NAMES } from '@/constants/monopoly';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PLAYER_COLORS = colorConstants.playerColors;

export default function PlayerDetailScreen() {
  const palette = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const player = useGameStore(s => s.players.find(p => p.id === id));
  const allPlayers = useGameStore(s => s.players);
  const transactions = useGameStore(s => s.transactions);
  const currency = useGameStore(s => s.settings.currency);
  const propertyOwnerships = useGameStore(s => s.propertyOwnerships);
  const { updatePlayer, removePlayer, transfer, declareBankrupt } = useGameStore();

  const [name, setName] = useState(player?.name ?? '');
  const [selectedColor, setSelectedColor] = useState(player?.color ?? PLAYER_COLORS[0]);
  const [editMode, setEditMode] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const topPad = Platform.OS === 'web' ? 16 : insets.top;

  if (!player) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={{ color: palette.foreground }}>Player not found</Text>
      </View>
    );
  }

  // Safe non-null reference after guard above
  const safePlayer = player;

  const playerTransactions = [...transactions]
    .reverse()
    .filter(t => t.fromId === player.id || t.toId === player.id);

  // Get properties owned by this player
  const ownedProperties = MONOPOLY_PROPERTIES.filter(
    p => propertyOwnerships[p.id]?.ownerId === player.id
  );

  // Group owned properties by group
  const groupedProperties: Record<string, typeof ownedProperties> = {};
  ownedProperties.forEach(p => {
    if (!groupedProperties[p.group]) groupedProperties[p.group] = [];
    groupedProperties[p.group].push(p);
  });

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (allPlayers.some(p => p.id !== safePlayer.id && p.name.toLowerCase() === trimmed.toLowerCase())) {
      // Name already taken — don't save
      return;
    }
    updatePlayer(safePlayer.id, { name: trimmed, color: selectedColor });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditMode(false);
  }

  function confirmDelete() {
    removePlayer(safePlayer.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowDeleteModal(false);
    router.back();
  }

  function handleBankrupt() {
    declareBankrupt(safePlayer.id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const canBankrupt = safePlayer.balance === 0 && safePlayer.jailCards === 0 && ownedProperties.length === 0 && !safePlayer.isBankrupt;

  const usedColors = allPlayers.filter(p => p.id !== safePlayer.id).map(p => p.color);

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      {/* ── Delete confirmation modal ── */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setShowDeleteModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={[styles.modalStrip, { backgroundColor: safePlayer.color }]} />
            <View style={styles.modalBody}>
              <MaterialCommunityIcons name="account-remove" size={32} color={palette.destructive} />
              <Text style={[styles.modalTitle, { color: palette.foreground }]}>
                Remove {safePlayer.name}?
              </Text>
              <Text style={[styles.modalSub, { color: palette.mutedForeground }]}>
                This will remove the player and release all their properties back to the bank.
              </Text>
              <View style={styles.modalBtns}>
                <Pressable
                  onPress={() => setShowDeleteModal(false)}
                  style={({ pressed }) => [
                    styles.modalCancel,
                    { borderColor: palette.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text style={[styles.modalCancelText, { color: palette.foreground }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={confirmDelete}
                  style={({ pressed }) => [
                    styles.modalConfirm,
                    { backgroundColor: palette.destructive, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Text style={styles.modalConfirmText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: palette.background, borderBottomColor: palette.border }]}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={palette.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: palette.foreground }]}>Player</Text>
        <Pressable
          onPress={() => editMode ? handleSave() : setEditMode(true)}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={[styles.editBtn, { color: palette.primary }]}>{editMode ? 'Save' : 'Edit'}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 30 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile */}
        <View style={[styles.profile, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <PlayerAvatar name={editMode ? (name || safePlayer.name) : safePlayer.name} color={selectedColor} size={72} />
          <View style={styles.profileInfo}>
            {editMode ? (
              <TextInput
                style={[styles.nameInput, { color: palette.foreground, borderColor: palette.primary }]}
                value={name}
                onChangeText={setName}
                autoFocus
                maxLength={20}
                selectionColor={palette.primary}
              />
            ) : (
              <Text style={[styles.profileName, { color: palette.foreground }]}>{safePlayer.name}</Text>
            )}
            {safePlayer.isBankrupt ? (
              <Text style={[styles.profileBalance, { color: palette.destructive, fontSize: 20 }]}>BANKRUPT</Text>
            ) : (
              <Text style={[styles.profileBalance, { color: palette.primary }]}>
                {formatMoney(safePlayer.balance, currency)}
              </Text>
            )}
          </View>
        </View>

        {/* Color picker in edit mode */}
        {editMode && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: palette.mutedForeground }]}>Color</Text>
            <View style={styles.colorGrid}>
              {PLAYER_COLORS.map(c => {
                const used = usedColors.includes(c);
                const selected = selectedColor === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => { if (!used) { setSelectedColor(c); Haptics.selectionAsync(); } }}
                    style={[
                      styles.colorBtn,
                      {
                        backgroundColor: c,
                        opacity: used && !selected ? 0.3 : 1,
                        borderWidth: selected ? 3 : 0,
                        borderColor: '#FFF',
                        transform: [{ scale: selected ? 1.15 : 1 }],
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>
        )}

        {/* Jail Cards */}
        {!editMode && (
          <View style={[styles.infoCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="card-account-details" size={20} color={palette.foreground} />
              <Text style={[styles.infoLabel, { color: palette.foreground }]}>Get Out of Jail Free Cards</Text>
              <View style={[styles.badge, { backgroundColor: safePlayer.jailCards > 0 ? palette.success + '22' : palette.muted }]}>
                <Text style={[styles.badgeText, { color: safePlayer.jailCards > 0 ? palette.success : palette.mutedForeground }]}>
                  {safePlayer.jailCards}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Owned Properties */}
        {!editMode && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.foreground }]}>
              Properties ({ownedProperties.length})
            </Text>
            {ownedProperties.length === 0 ? (
              <View style={[styles.emptyProps, { backgroundColor: palette.card, borderColor: palette.border }]}>
                <MaterialCommunityIcons name="home-outline" size={28} color={palette.mutedForeground} />
                <Text style={[styles.emptyPropsText, { color: palette.mutedForeground }]}>
                  No properties owned yet
                </Text>
              </View>
            ) : (
              Object.entries(groupedProperties).map(([group, props]) => (
                <View key={group} style={styles.propGroup}>
                  <View style={styles.propGroupHeader}>
                    <View style={[styles.groupDot, { backgroundColor: props[0].groupColor }]} />
                    <Text style={[styles.propGroupName, { color: palette.mutedForeground }]}>
                      {GROUP_NAMES[group as keyof typeof GROUP_NAMES] ?? group}
                    </Text>
                  </View>
                  {props.map(prop => {
                    const ownership = propertyOwnerships[prop.id];
                    return (
                      <View
                        key={prop.id}
                        style={[styles.propItem, { backgroundColor: palette.card, borderColor: palette.border }]}
                      >
                        <View style={[styles.propColorBar, { backgroundColor: prop.groupColor }]} />
                        <View style={styles.propContent}>
                          <Text style={[styles.propName, { color: palette.foreground }]} numberOfLines={1}>
                            {prop.name}
                          </Text>
                          <View style={styles.propDetails}>
                            {ownership?.isMortgaged && (
                              <View style={[styles.propTag, { backgroundColor: palette.destructive + '22' }]}>
                                <Text style={[styles.propTagText, { color: palette.destructive }]}>Mortgaged</Text>
                              </View>
                            )}
                            {prop.type === 'property' && (ownership?.houses ?? 0) > 0 && !ownership?.hotel && (
                              <View style={[styles.propTag, { backgroundColor: palette.success + '22' }]}>
                                <MaterialCommunityIcons name="home" size={12} color={palette.success} />
                                <Text style={[styles.propTagText, { color: palette.success }]}>×{ownership?.houses}</Text>
                              </View>
                            )}
                            {ownership?.hotel && (
                              <View style={[styles.propTag, { backgroundColor: '#F44336' + '22' }]}>
                                <MaterialCommunityIcons name="office-building" size={12} color="#F44336" />
                                <Text style={[styles.propTagText, { color: '#F44336' }]}>Hotel</Text>
                              </View>
                            )}
                            <Text style={[styles.propPrice, { color: palette.mutedForeground }]}>
                              {formatMoney(prop.price, currency)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              ))
            )}
          </View>
        )}

        {/* Declare Bankrupt button */}
        {!editMode && !safePlayer.isBankrupt && (
          <Pressable
            onPress={handleBankrupt}
            disabled={!canBankrupt}
            style={({ pressed }) => [
              styles.deleteBtn,
              { 
                borderColor: canBankrupt ? palette.warning : palette.border, 
                opacity: pressed ? 0.8 : (canBankrupt ? 1 : 0.5),
                marginTop: 10
              }
            ]}
          >
            <MaterialCommunityIcons name="bank-minus" size={18} color={canBankrupt ? palette.warning : palette.mutedForeground} />
            <Text style={[styles.deleteBtnText, { color: canBankrupt ? palette.warning : palette.mutedForeground }]}>
              Declare Bankrupt
            </Text>
          </Pressable>
        )}

        {/* Transaction history */}
        {!editMode && playerTransactions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.foreground }]}>Recent Transactions</Text>
            {playerTransactions.slice(0, 10).map(t => (
              <TransactionItem key={t.id} transaction={t} />
            ))}
          </View>
        )}

        {/* Delete button — always visible at bottom */}
        <Pressable
          onPress={() => setShowDeleteModal(true)}
          style={({ pressed }) => [styles.deleteBtn, { borderColor: palette.destructive, opacity: pressed ? 0.8 : 1 }]}
        >
          <MaterialCommunityIcons name="account-remove" size={18} color={palette.destructive} />
          <Text style={[styles.deleteBtnText, { color: palette.destructive }]}>Remove Player</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  editBtn: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  scroll: { padding: 20, gap: 20 },
  profile: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    padding: 20, borderRadius: 18, borderWidth: 1,
  },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  profileBalance: { fontFamily: 'Inter_700Bold', fontSize: 26 },
  nameInput: {
    fontFamily: 'Inter_700Bold', fontSize: 22, borderBottomWidth: 2,
    paddingBottom: 2, color: 'inherit',
  },
  section: { gap: 12 },
  sectionLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorBtn: { width: 44, height: 44, borderRadius: 22 },
  // Info card (jail cards)
  infoCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoLabel: { fontFamily: 'Inter_500Medium', fontSize: 15, flex: 1 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  // Owned properties
  emptyProps: {
    borderRadius: 16, borderWidth: 1, padding: 24,
    alignItems: 'center', gap: 8,
  },
  emptyPropsText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  propGroup: { gap: 6 },
  propGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  groupDot: { width: 10, height: 10, borderRadius: 5 },
  propGroupName: { fontFamily: 'Inter_600SemiBold', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  propItem: {
    flexDirection: 'row', borderRadius: 12, borderWidth: 1,
    overflow: 'hidden', marginBottom: 4,
  },
  propColorBar: { width: 5 },
  propContent: { flex: 1, padding: 12, gap: 4 },
  propName: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  propDetails: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  propTag: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },
  propTagText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  propPrice: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  // Adjust balance
  adjustCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  adjustInput: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, paddingHorizontal: 12, height: 48, borderWidth: 1,
  },
  adjCurrency: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  adjTextInput: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 22, padding: 0 },
  adjBtns: { flexDirection: 'row', gap: 10 },
  adjBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 10, borderWidth: 1,
  },
  adjBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  // Delete button
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5,
  },
  deleteBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  // Delete modal
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: { width: '100%', borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  modalStrip: { height: 6 },
  modalBody: { padding: 24, alignItems: 'center', gap: 12 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, textAlign: 'center' },
  modalSub: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8, width: '100%' },
  modalCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1.5, alignItems: 'center',
  },
  modalCancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  modalConfirm: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalConfirmText: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#fff' },
});
