import React, { useState } from 'react';
import {
  Modal, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useGameStore, Player } from '@/store/gameStore';
import { PROPERTY_GROUPS, GROUP_NAMES, MonopolyProperty, GROUP_COLORS } from '@/constants/monopoly';
import { useProperties } from '@/hooks/useProperties';
import { PlayerAvatar } from '@/components/PlayerAvatar';
import { AmountInput } from '@/components/AmountInput';
import { formatMoney } from '@/utils/format';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function PropertyDetailModal({
  property, visible, onClose,
}: { property: MonopolyProperty | null; visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const players = useGameStore(s => s.players);
  const ownership = useGameStore(s => property ? s.propertyOwnerships[property.id] : undefined);
  const currency = useGameStore(s => s.settings.currency);
  const { assignProperty, setHouses, toggleMortgage } = useGameStore();

  // Buy confirmation state
  const [buyTarget, setBuyTarget] = useState<Player | null>(null);
  const [buyPriceStr, setBuyPriceStr] = useState('');

  if (!property || !ownership) return null;
  const owner = ownership.ownerId ? players.find(p => p.id === ownership.ownerId) : null;

  function handleConfirmBuy(amount: number) {
    if (!buyTarget || !property) return;
    assignProperty(property.id, buyTarget.id, amount);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBuyTarget(null);
  }

  function handleClose() {
    setBuyTarget(null);
    setBuyPriceStr('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={[styles.detailModal, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.detailStrip, { backgroundColor: property.groupColor }]} />
          <ScrollView contentContainerStyle={styles.detailContent}>
            <Text style={[styles.detailName, { color: colors.foreground }]}>{property.name}</Text>
            <Text style={[styles.detailPrice, { color: colors.mutedForeground }]}>
              {formatMoney(property.price, currency)} · Mortgage: {formatMoney(property.mortgage, currency)}
            </Text>

            {/* Owner section */}
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Owner</Text>

            {owner ? (
              /* ── Property is owned — show owner, no reassignment ── */
              <View style={styles.ownedSection}>
                <View style={[styles.ownerDisplay, { backgroundColor: owner.color + '15', borderColor: owner.color }]}>
                  <PlayerAvatar name={owner.name} color={owner.color} size={32} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.ownerDisplayName, { color: colors.foreground }]}>{owner.name}</Text>
                    <Text style={[styles.ownerDisplayBalance, { color: colors.mutedForeground }]}>
                      {formatMoney(owner.balance, currency)}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="lock" size={16} color={colors.mutedForeground} />
                </View>
                <View style={[styles.tradeHint, { backgroundColor: colors.muted }]}>
                  <MaterialCommunityIcons name="swap-horizontal" size={16} color={colors.primary} />
                  <Text style={[styles.tradeHintText, { color: colors.mutedForeground }]}>
                    Use the <Text style={{ color: colors.primary, fontFamily: 'Inter_700Bold' }}>Trade</Text> tab to transfer properties between players
                  </Text>
                </View>
              </View>
            ) : players.length === 0 ? (
              <Text style={[styles.detailPrice, { color: colors.mutedForeground }]}>No players in game yet</Text>
            ) : (
              /* ── Property is unowned — show buy buttons ── */
              <>
                {/* Buy confirmation inline */}
                {buyTarget ? (
                  <View style={[styles.confirmCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.confirmHeader}>
                      <PlayerAvatar name={buyTarget.name} color={buyTarget.color} size={28} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.confirmText, { color: colors.foreground }]}>
                          {buyTarget.name} buys {property.name}?
                        </Text>
                        <Text style={[styles.confirmSub, { color: colors.mutedForeground }]}>
                          Base price: {formatMoney(property.price, currency)}
                        </Text>
                      </View>
                    </View>

                    <AmountInput
                      value={buyPriceStr}
                      onChange={setBuyPriceStr}
                      label="Purchase Price (Auction / Base)"
                    />

                    <View style={styles.confirmBtns}>
                      <Pressable
                        onPress={() => setBuyTarget(null)}
                        style={({ pressed }) => [
                          styles.confirmCancel,
                          { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        <Text style={[styles.confirmCancelText, { color: colors.foreground }]}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => {
                          const amt = parseInt(buyPriceStr) || 0;
                          if (amt > buyTarget.balance) {
                            Alert.alert('Low Balance', `${buyTarget.name} does not have enough money.`);
                            return;
                          }
                          handleConfirmBuy(amt);
                        }}
                        style={({ pressed }) => {
                          const amt = parseInt(buyPriceStr) || 0;
                          const canAfford = amt <= buyTarget.balance;
                          return [
                            styles.confirmBuy,
                            { backgroundColor: canAfford ? colors.primary : colors.muted, opacity: pressed ? 0.8 : 1 },
                          ];
                        }}
                      >
                        <Text style={styles.confirmBuyText}>Buy</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ownerRow}>
                    {players.map(p => {
                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => {
                            setBuyTarget(p);
                            setBuyPriceStr(property.price.toString());
                          }}
                          style={[
                            styles.buyChip,
                            {
                              backgroundColor: colors.muted,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <PlayerAvatar name={p.name} color={p.color} size={22} />
                          <View>
                            <Text style={[styles.buyChipName, { color: colors.foreground }]}>{p.name}</Text>
                            <Text style={[styles.buyChipBalance, { color: colors.mutedForeground }]}>
                              {formatMoney(p.balance, currency)}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                )}
              </>
            )}

            {/* Houses/Hotels for properties */}
            {property.type === 'property' && owner && (
              <>
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Houses / Hotel</Text>
                <View style={styles.housesRow}>
                  {[0, 1, 2, 3, 4].map(n => (
                    <Pressable
                      key={n}
                      onPress={() => { setHouses(property.id, n, false); }}
                      style={[
                        styles.houseBtn,
                        { backgroundColor: ownership.houses === n && !ownership.hotel ? '#4CAF50' + '33' : colors.muted, borderColor: ownership.houses === n && !ownership.hotel ? '#4CAF50' : colors.border },
                      ]}
                    >
                      <Text style={[styles.houseBtnText, { color: ownership.houses === n && !ownership.hotel ? '#4CAF50' : colors.foreground }]}>{n}</Text>
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={() => setHouses(property.id, 0, true)}
                    style={[
                      styles.hotelBtn,
                      { backgroundColor: ownership.hotel ? colors.destructive + '33' : colors.muted, borderColor: ownership.hotel ? colors.destructive : colors.border },
                    ]}
                  >
                    <MaterialCommunityIcons name="home" size={16} color={ownership.hotel ? colors.destructive : colors.foreground} />
                    <Text style={[styles.houseBtnText, { color: ownership.hotel ? colors.destructive : colors.foreground }]}>Hotel</Text>
                  </Pressable>
                </View>
              </>
            )}

            {/* Mortgage */}
            {owner && (
              <Pressable
                onPress={() => { toggleMortgage(property.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                style={({ pressed }) => [
                  styles.mortgageBtn,
                  {
                    backgroundColor: ownership.isMortgaged ? colors.success + '22' : colors.destructive + '22',
                    borderColor: ownership.isMortgaged ? colors.success : colors.destructive,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Text style={[styles.mortgageBtnText, { color: ownership.isMortgaged ? colors.success : colors.destructive }]}>
                  {ownership.isMortgaged
                    ? `Unmortgage (+${formatMoney(Math.floor(property.mortgage * 1.1), currency)})`
                    : `Mortgage (+${formatMoney(property.mortgage, currency)})`}
                </Text>
              </Pressable>
            )}

            {/* Rent table */}
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Rent</Text>
            {[
              { label: 'Base', value: property.rent },
              { label: '1 House', value: property.rentWith1 },
              { label: '2 Houses', value: property.rentWith2 },
              { label: '3 Houses', value: property.rentWith3 },
              { label: '4 Houses', value: property.rentWith4 },
              { label: 'Hotel', value: property.rentWithHotel },
            ].filter(r => r.value > 0).map(r => (
              <View key={r.label} style={[styles.rentRow, { borderBottomColor: colors.border }]}>
                <Text style={[styles.rentLabel, { color: colors.mutedForeground }]}>{r.label}</Text>
                <Text style={[styles.rentValue, { color: colors.foreground }]}>{formatMoney(r.value, currency)}</Text>
              </View>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function PropertiesScreen() {
  const colors = useColors();
  const properties = useProperties();
  const insets = useSafeAreaInsets();
  const [selectedProperty, setSelectedProperty] = useState<MonopolyProperty | null>(null);

  // Subscribe to store so the grid re-renders on ownership changes
  const propertyOwnerships = useGameStore(s => s.propertyOwnerships);
  const players = useGameStore(s => s.players);
  const currency = useGameStore(s => s.settings.currency);

  const topPad = Platform.OS === 'web' ? 16 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PropertyDetailModal
        property={selectedProperty}
        visible={!!selectedProperty}
        onClose={() => setSelectedProperty(null)}
      />

      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Properties</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {PROPERTY_GROUPS.map(group => {
          const props = properties.filter(p => p.group === group);
          return (
            <View key={group} style={styles.groupSection}>
              <View style={styles.groupHeader}>
                <View style={[styles.groupDot, { backgroundColor: GROUP_COLORS[group] }]} />
                <Text style={[styles.groupName, { color: colors.foreground }]}>{GROUP_NAMES[group]}</Text>
              </View>
              <View style={styles.propGrid}>
                {props.map(prop => {
                  const ownership = propertyOwnerships[prop.id];
                  const owner = ownership?.ownerId ? players.find(p => p.id === ownership.ownerId) : null;
                  const isMortgaged = ownership?.isMortgaged;
                  return (
                    <Pressable
                      key={prop.id}
                      onPress={() => setSelectedProperty(prop)}
                      style={({ pressed }) => [
                        styles.propCard,
                        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : isMortgaged ? 0.6 : 1 },
                      ]}
                    >
                      <View style={[styles.propStrip, { backgroundColor: prop.groupColor }]} />
                      <View style={styles.propBody}>
                        <View style={styles.propTop}>
                          <Text style={[styles.propName, { color: colors.foreground }]} numberOfLines={2}>{prop.name}</Text>
                          {owner && <PlayerAvatar name={owner.name} color={owner.color} size={22} />}
                        </View>
                        <View style={styles.propFooter}>
                          <Text style={[styles.propPrice, { color: colors.mutedForeground }]}>
                            {formatMoney(prop.price, currency)}
                          </Text>
                          {isMortgaged && (
                            <Text style={[styles.mortgagedBadge, { color: colors.destructive }]}>M</Text>
                          )}
                          {ownership?.hotel && (
                            <MaterialCommunityIcons name="home" size={12} color={colors.destructive} />
                          )}
                          {!ownership?.hotel && (ownership?.houses ?? 0) > 0 && (
                            <View style={styles.housesDots}>
                              {Array.from({ length: ownership!.houses }).map((_, i) => (
                                <View key={i} style={styles.houseDot} />
                              ))}
                            </View>
                          )}
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 28 },
  scroll: { padding: 14, gap: 20 },
  groupSection: { gap: 10 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  groupDot: { width: 12, height: 12, borderRadius: 6 },
  groupName: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  propGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  propCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', width: '47%' },
  propStrip: { height: 6 },
  propBody: { padding: 10 },
  propTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 4 },
  propName: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 16 },
  propFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  propPrice: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  mortgagedBadge: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  housesDots: { flexDirection: 'row', gap: 2 },
  houseDot: { width: 8, height: 8, borderRadius: 2, backgroundColor: '#4CAF50' },
  // Modal styles
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detailModal: { borderRadius: 28, borderWidth: 1, overflow: 'hidden', maxHeight: '85%' },
  detailStrip: { height: 8 },
  detailContent: { padding: 22, gap: 14 },
  detailName: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  detailPrice: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: -8 },
  detailLabel: { fontFamily: 'Inter_500Medium', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
  // Owned property display
  ownedSection: { gap: 10 },
  ownerDisplay: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1.5,
  },
  ownerDisplayName: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  ownerDisplayBalance: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  tradeHint: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 10,
  },
  tradeHintText: { fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1, lineHeight: 17 },
  // Unowned — buy chips
  ownerRow: { flexDirection: 'row', gap: 8 },
  buyChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5,
  },
  buyChipName: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  buyChipBalance: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  // Buy confirmation
  confirmCard: {
    borderRadius: 14, borderWidth: 1, padding: 16, gap: 14,
  },
  confirmHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  confirmText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  confirmSub: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginTop: 2 },
  confirmBtns: { flexDirection: 'row', gap: 10 },
  confirmCancel: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1.5, alignItems: 'center',
  },
  confirmCancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  confirmBuy: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  confirmBuyText: { fontFamily: 'Inter_700Bold', fontSize: 15, color: '#fff' },
  // Houses
  housesRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  houseBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  hotelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 44, borderRadius: 10, borderWidth: 1.5 },
  houseBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  mortgageBtn: { paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  mortgageBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  rentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  rentLabel: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  rentValue: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
});
