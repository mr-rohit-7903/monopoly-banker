import React, { useState } from 'react';
import {
  Alert, Modal, Platform, Pressable, ScrollView,
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

const INT_PAIRS: Record<string, { partnerId: string; partnerName: string }> = {
  reading: { partnerId: 'shortline', partnerName: 'Railways' },
  pennsylvaniarr: { partnerId: 'bando', partnerName: 'Airways' },
  bando: { partnerId: 'shortline', partnerName: 'Railways' },
  shortline: { partnerId: 'reading', partnerName: 'Roadways' },
  electric: { partnerId: 'waterworks', partnerName: 'Waterways' },
  waterworks: { partnerId: 'electric', partnerName: 'Satellite' },
};

function PropertyDetailModal({
  property, visible, onClose,
}: { property: MonopolyProperty | null; visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const players = useGameStore(s => s.players);
  const propertyOwnerships = useGameStore(s => s.propertyOwnerships);
  const ownership = property ? propertyOwnerships[property.id] : undefined;
  const currency = useGameStore(s => s.settings.currency);
  const version = useGameStore(s => s.settings.version);
  const { assignProperty, setHouses, toggleMortgage, transfer } = useGameStore();
  const propertiesList = useProperties();

  const groupProps = property ? propertiesList.filter(p => p.group === property.group) : [];
  const hasBuildingsInGroup = useGameStore(s => {
    return groupProps.some(p => {
      const own = s.propertyOwnerships[p.id];
      return own && (own.houses > 0 || own.hotel);
    });
  });

  const [buyTarget, setBuyTarget] = useState<Player | null>(null);
  const [rentPayer, setRentPayer] = useState<Player | null>(null);
  const [txConfirm, setTxConfirm] = useState<{ emoji: string; title: string; sub: string } | null>(null);
  const [buyPriceStr, setBuyPriceStr] = useState('');

  if (!property || !ownership) return null;
  const owner = ownership.ownerId ? players.find(p => p.id === ownership.ownerId) : null;

  const ownsAllOfGroup = owner ? groupProps.every(
    p => propertyOwnerships[p.id]?.ownerId === owner.id
  ) : false;

  const preventMortgage = version === 'INT'
    ? (ownership ? (ownership.houses > 0 || ownership.hotel) : false)
    : hasBuildingsInGroup;

  const partnerId = property && version === 'INT' ? INT_PAIRS[property.id]?.partnerId : undefined;
  const partnerOwnership = partnerId ? propertyOwnerships[partnerId] : undefined;
  const ownsPartner = owner && partnerOwnership && partnerOwnership.ownerId === owner.id && !partnerOwnership.isMortgaged;

  // Compute active rent
  const activeRent = (() => {
    if (!property || !ownership || ownership.isMortgaged || !ownership.ownerId) return 0;
    if (property.type === 'property') {
      const showDoubleBase = version === 'INT' && ownsAllOfGroup && !hasBuildingsInGroup;
      if (ownership.hotel) return property.rentWithHotel;
      if (ownership.houses === 1) return property.rentWith1;
      if (ownership.houses === 2) return property.rentWith2;
      if (ownership.houses === 3) return property.rentWith3;
      if (ownership.houses === 4) return property.rentWith4 ?? 0;
      return showDoubleBase ? property.rent * 2 : property.rent;
    } else if (property.type === 'railroad') {
      if (version === 'INT') {
        return ownsPartner ? property.rentWith1 : property.rent;
      } else {
        const ownerId = ownership.ownerId;
        const rrCount = ownerId
          ? propertiesList.filter(p => p.type === 'railroad' && propertyOwnerships[p.id]?.ownerId === ownerId && !propertyOwnerships[p.id]?.isMortgaged).length
          : 0;
        if (rrCount === 1) return property.rent;
        if (rrCount === 2) return property.rentWith1;
        if (rrCount === 3) return property.rentWith2;
        if (rrCount === 4) return property.rentWith3;
        return 0;
      }
    } else { // utility
      if (version === 'INT') {
        return ownsPartner ? property.rentWith1 : property.rent;
      } else {
        const ownerId = ownership.ownerId;
        const utilCount = ownerId
          ? propertiesList.filter(p => p.type === 'utility' && propertyOwnerships[p.id]?.ownerId === ownerId && !propertyOwnerships[p.id]?.isMortgaged).length
          : 0;
        if (utilCount === 1) return property.rent;
        if (utilCount === 2) return property.rentWith1;
        return 0;
      }
    }
  })();

  function handleConfirmBuy(amount: number) {
    if (!buyTarget || !property) return;
    assignProperty(property.id, buyTarget.id, amount);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setBuyTarget(null);
  }

  function handleClose() {
    setBuyTarget(null);
    setBuyPriceStr('');
    setRentPayer(null);
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
                            const shortfall = amt - buyTarget.balance;
                            Alert.alert(
                              'Insufficient Balance', 
                              `${buyTarget.name} has ${formatMoney(buyTarget.balance, currency)} but needs ${formatMoney(amt, currency)}.\n\nShortfall: ${formatMoney(shortfall, currency)}`
                            );
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
                  <View style={styles.ownerRow}>
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
                          <PlayerAvatar name={p.name} color={p.color} size={28} />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.buyChipName, { color: colors.foreground }]}>{p.name}</Text>
                            <Text style={[styles.buyChipBalance, { color: colors.mutedForeground }]}>
                              {formatMoney(p.balance, currency)}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </>
            )}

            {/* Houses/Hotels for properties */}
            {property.type === 'property' && owner && (() => {
              const isAnyGroupPropertyMortgaged = groupProps.some(
                p => useGameStore.getState().propertyOwnerships[p.id]?.isMortgaged
              );

              const getBuildingCount = (propId: string) => {
                const own = useGameStore.getState().propertyOwnerships[propId];
                if (!own) return 0;
                if (own.hotel) return version === 'INT' ? 4 : 5;
                return own.houses;
              };

              const currentCount = getBuildingCount(property.id);
              const groupCounts = groupProps.map(p => getBuildingCount(p.id));
              const minCount = Math.min(...groupCounts);
              const maxCount = Math.max(...groupCounts);
              const isEvenBuild = currentCount === minCount;
              const isEvenSell = currentCount === maxCount;

              const canAfford = owner.balance >= property.housePrice;

              let buyDisableReason = '';
              const maxBuildings = version === 'INT' ? 4 : 5;

              if (version === 'INT') {
                if (ownership.isMortgaged) {
                  buyDisableReason = 'Cannot build on a mortgaged property';
                } else if (currentCount >= maxBuildings) {
                  buyDisableReason = 'Maximum buildings reached (Hotel)';
                } else if (!canAfford) {
                  buyDisableReason = `Requires ${formatMoney(property.housePrice, currency)} (Insufficient funds)`;
                }
              } else {
                if (!ownsAllOfGroup) {
                  buyDisableReason = `Requires all ${GROUP_NAMES[property.group]} properties`;
                } else if (isAnyGroupPropertyMortgaged) {
                  buyDisableReason = 'Cannot build while a property in group is mortgaged';
                } else if (currentCount >= maxBuildings) {
                  buyDisableReason = 'Maximum buildings reached (Hotel)';
                } else if (!isEvenBuild) {
                  buyDisableReason = 'Must build evenly (add houses to other properties first)';
                } else if (!canAfford) {
                  buyDisableReason = `Requires ${formatMoney(property.housePrice, currency)} (Insufficient funds)`;
                }
              }

              const canBuild = !buyDisableReason;
              const isNextHotel = currentCount === (version === 'INT' ? 3 : 4);
              const buyButtonText = isNextHotel ? `Buy Hotel` : `Buy House`;

              const handleBuyHouse = () => {
                if (!canBuild) return;
                const description = isNextHotel
                  ? `Bought Hotel on ${property.name}`
                  : `Bought House on ${property.name}`;

                const success = transfer(
                  owner.id,
                  null,
                  property.housePrice,
                  'transfer',
                  description
                );

                if (success) {
                  const nextCount = currentCount + 1;
                  const targetHotelCount = version === 'INT' ? 4 : 5;
                  const houses = nextCount === targetHotelCount ? 0 : nextCount;
                  const hotel = nextCount === targetHotelCount;
                  setHouses(property.id, houses, hotel);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } else {
                  Alert.alert('Error', 'Transaction failed.');
                }
              };

              const sellPrice = Math.floor(property.housePrice / 2);
              let sellDisableReason = '';
              if (currentCount === 0) {
                sellDisableReason = 'No buildings to sell';
              } else if (version !== 'INT' && !isEvenSell) {
                sellDisableReason = 'Must sell evenly (remove houses from other properties first)';
              }
              const canSell = !sellDisableReason;
              const isCurrentHotel = ownership.hotel;
              const sellButtonText = isCurrentHotel ? `Sell Hotel` : `Sell House`;

              const handleSellHouse = () => {
                if (!canSell) return;
                const description = isCurrentHotel
                  ? `Sold Hotel on ${property.name}`
                  : `Sold House on ${property.name}`;

                const success = transfer(
                  null, // from Bank
                  owner.id, // to Player
                  sellPrice,
                  'transfer',
                  description
                );

                if (success) {
                  const nextCount = currentCount - 1;
                  const houses = nextCount; // since nextCount is at most 4
                  const hotel = false; // can't sell house to get hotel
                  setHouses(property.id, houses, hotel);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                } else {
                  Alert.alert('Error', 'Transaction failed.');
                }
              };

              return (
                <>
                  <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Houses / Hotel</Text>
                  <View style={styles.houseBuyContainer}>
                    <View style={styles.houseStatusRow}>
                      <Text style={[styles.houseStatusText, { color: colors.foreground }]}>
                        Current: {ownership.hotel ? '1 Hotel' : ownership.houses > 0 ? `${ownership.houses} House${ownership.houses > 1 ? 's' : ''}` : 'None'}
                      </Text>
                      <Text style={[styles.housePriceText, { color: colors.mutedForeground }]}>
                        Cost: {formatMoney(property.housePrice, currency)} / each
                      </Text>
                    </View>

                    <View style={styles.houseActionBtns}>
                      <Pressable
                        onPress={handleBuyHouse}
                        disabled={!canBuild}
                        style={({ pressed }) => [
                          styles.houseActionBtn,
                          {
                            backgroundColor: canBuild ? '#4CAF50' : colors.muted,
                            borderColor: canBuild ? '#45a049' : colors.border,
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                      >
                        <Text style={[styles.houseActionBtnText, { color: canBuild ? '#fff' : colors.mutedForeground }]}>
                          {buyButtonText} (+1)
                        </Text>
                        <Text style={[styles.houseActionBtnSub, { color: canBuild ? 'rgba(255,255,255,0.8)' : colors.mutedForeground }]}>
                          -{formatMoney(property.housePrice, currency)}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={handleSellHouse}
                        disabled={!canSell}
                        style={({ pressed }) => [
                          styles.houseActionBtn,
                          {
                            backgroundColor: canSell ? colors.destructive : colors.muted,
                            borderColor: canSell ? '#D32F2F' : colors.border,
                            opacity: pressed ? 0.8 : 1,
                          },
                        ]}
                      >
                        <Text style={[styles.houseActionBtnText, { color: canSell ? '#fff' : colors.mutedForeground }]}>
                          {sellButtonText} (-1)
                        </Text>
                        <Text style={[styles.houseActionBtnSub, { color: canSell ? 'rgba(255,255,255,0.8)' : colors.mutedForeground }]}>
                          +{formatMoney(sellPrice, currency)}
                        </Text>
                      </Pressable>
                    </View>

                    {buyDisableReason && currentCount < 5 ? (
                      <Text style={[styles.warningText, { color: colors.destructive }]}>
                        Buy: {buyDisableReason}
                      </Text>
                    ) : null}
                    {sellDisableReason && currentCount > 0 ? (
                      <Text style={[styles.warningText, { color: colors.destructive }]}>
                        Sell: {sellDisableReason}
                      </Text>
                    ) : null}
                  </View>
                </>
              );
            })()}

            {/* Mortgage */}
            {owner && (
              <View style={{ gap: 4 }}>
                <Pressable
                  onPress={() => { toggleMortgage(property.id); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                  disabled={preventMortgage && !ownership.isMortgaged}
                  style={({ pressed }) => [
                    styles.mortgageBtn,
                    {
                      backgroundColor: ownership.isMortgaged ? colors.success + '22' : colors.destructive + '22',
                      borderColor: ownership.isMortgaged ? colors.success : colors.destructive,
                      opacity: (preventMortgage && !ownership.isMortgaged) ? 0.4 : pressed ? 0.8 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.mortgageBtnText, { color: ownership.isMortgaged ? colors.success : colors.destructive }]}>
                    {ownership.isMortgaged
                      ? `Unmortgage (-${formatMoney(Math.floor(property.mortgage * 1.1), currency)})`
                      : `Mortgage (+${formatMoney(property.mortgage, currency)})`}
                  </Text>
                </Pressable>
                {preventMortgage && !ownership.isMortgaged && (
                  <Text style={[styles.warningText, { color: colors.destructive }]}>
                    {version === 'INT' ? 'Cannot mortgage while property has buildings' : 'Cannot mortgage while color group has buildings'}
                  </Text>
                )}
              </View>
            )}

            {/* Pay Rent Section */}
            {owner && !ownership.isMortgaged && activeRent > 0 && (
              <View style={{ gap: 8, marginTop: 4 }}>
                <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Pay Rent</Text>
                
                {rentPayer ? (
                  /* ── Rent Pay Confirmation Card ── */
                  <View style={[styles.confirmCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={styles.confirmHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <PlayerAvatar name={rentPayer.name} color={rentPayer.color} size={28} />
                        <MaterialCommunityIcons name="arrow-right-thick" size={18} color={colors.mutedForeground} />
                        <PlayerAvatar name={owner.name} color={owner.color} size={28} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={[styles.confirmText, { color: colors.foreground }]}>
                          Pay Rent to {owner.name}?
                        </Text>
                        <Text style={[styles.confirmSub, { color: colors.mutedForeground }]}>
                          Amount: <Text style={{ fontFamily: 'Inter_700Bold', color: colors.primary }}>{formatMoney(activeRent, currency)}</Text>
                        </Text>
                      </View>
                    </View>

                    {rentPayer.balance < activeRent && (
                      <View style={{ backgroundColor: colors.destructive + '15', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.destructive + '33' }}>
                        <Text style={{ color: colors.destructive, fontFamily: 'Inter_500Medium', fontSize: 13, textAlign: 'center' }}>
                          ⚠️ Insufficient Funds: {rentPayer.name} has only {formatMoney(rentPayer.balance, currency)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.confirmBtns}>
                      <Pressable
                        onPress={() => setRentPayer(null)}
                        style={({ pressed }) => [
                          styles.confirmCancel,
                          { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                        ]}
                      >
                        <Text style={[styles.confirmCancelText, { color: colors.foreground }]}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        disabled={rentPayer.balance < activeRent}
                        onPress={() => {
                          const ok = transfer(
                            rentPayer.id,
                            owner.id,
                            activeRent,
                            'transfer',
                            `Rent for ${property.name}`
                          );
                          if (ok) {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            setTxConfirm({
                              emoji: '💸',
                              title: 'Rent Paid',
                              sub: `${rentPayer.name} paid ${formatMoney(activeRent, currency)} to ${owner.name}`
                            });
                          }
                        }}
                        style={({ pressed }) => [
                          styles.confirmBuy,
                          {
                            backgroundColor: rentPayer.balance >= activeRent ? colors.success : colors.muted,
                            opacity: rentPayer.balance < activeRent ? 0.5 : pressed ? 0.8 : 1,
                          },
                        ]}
                      >
                        <Text style={styles.confirmBuyText}>Confirm Pay</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  /* ── Player List for selection ── */
                  <View style={{ gap: 8 }}>
                    {players
                      .filter(p => p.id !== owner.id && !p.isBankrupt)
                      .map(payer => (
                        <Pressable
                          key={payer.id}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setRentPayer(payer);
                          }}
                          style={({ pressed }) => [
                            styles.rentPayBtn,
                            {
                              backgroundColor: payer.color + '15',
                              borderColor: payer.color + '66',
                              opacity: pressed ? 0.8 : 1,
                            },
                          ]}
                        >
                          <PlayerAvatar name={payer.name} color={payer.color} size={24} />
                          <Text style={[styles.rentPayBtnText, { color: colors.foreground }]}>
                            {payer.name} pays <Text style={{ fontFamily: 'Inter_700Bold', color: colors.primary }}>{formatMoney(activeRent, currency)}</Text>
                          </Text>
                          <MaterialCommunityIcons name="chevron-right" size={16} color={colors.mutedForeground} />
                        </Pressable>
                      ))}
                    {players.filter(p => p.id !== owner.id && !p.isBankrupt).length === 0 && (
                      <Text style={{ color: colors.mutedForeground, fontSize: 13, fontStyle: 'italic' }}>
                        No other active players to pay rent.
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Rent table */}
            <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>Rent</Text>
            {(() => {
              if (property.type === 'property') {
                const activeLabel = ownership.isMortgaged
                  ? null
                  : ownership.hotel
                  ? 'Hotel'
                  : ownership.houses === 1
                  ? '1 House'
                  : ownership.houses === 2
                  ? '2 Houses'
                  : ownership.houses === 3
                  ? '3 Houses'
                  : ownership.houses === 4
                  ? '4 Houses'
                  : 'Base';
                const showDoubleBase = version === 'INT' && ownsAllOfGroup && !hasBuildingsInGroup;
                const displayBaseRent = showDoubleBase ? property.rent * 2 : property.rent;
                return [
                  { label: showDoubleBase ? 'Base (Doubled)' : 'Base', value: displayBaseRent, active: activeLabel === 'Base' && !!owner },
                  { label: '1 House', value: property.rentWith1, active: activeLabel === '1 House' },
                  { label: '2 Houses', value: property.rentWith2, active: activeLabel === '2 Houses' },
                  { label: '3 Houses', value: property.rentWith3, active: activeLabel === '3 Houses' },
                  { label: '4 Houses', value: property.rentWith4, active: activeLabel === '4 Houses' },
                  { label: 'Hotel', value: property.rentWithHotel, active: activeLabel === 'Hotel' },
                ];
              } else if (property.type === 'railroad') {
                if (version === 'INT') {
                  const partnerInfo = INT_PAIRS[property.id];
                  const labelWithPartner = partnerInfo ? `With ${partnerInfo.partnerName}` : 'With Pair';
                  return [
                    { label: 'Base Rent', value: property.rent, active: !ownsPartner && !!owner && !ownership.isMortgaged },
                    { label: labelWithPartner, value: property.rentWith1, active: !!ownsPartner && !!owner && !ownership.isMortgaged },
                  ];
                } else {
                  const ownerId = ownership.ownerId;
                  const rrCount = ownerId
                    ? propertiesList.filter(p => p.type === 'railroad' && propertyOwnerships[p.id]?.ownerId === ownerId && !propertyOwnerships[p.id]?.isMortgaged).length
                    : 0;
                  return [
                    { label: '1 Owned', value: property.rent, active: rrCount === 1 && !ownership.isMortgaged },
                    { label: '2 Owned', value: property.rentWith1, active: rrCount === 2 && !ownership.isMortgaged },
                    { label: '3 Owned', value: property.rentWith2, active: rrCount === 3 && !ownership.isMortgaged },
                    { label: '4 Owned', value: property.rentWith3, active: rrCount === 4 && !ownership.isMortgaged },
                  ];
                }
              } else { // utility
                if (version === 'INT') {
                  const partnerInfo = INT_PAIRS[property.id];
                  const labelWithPartner = partnerInfo ? `With ${partnerInfo.partnerName}` : 'With Pair';
                  return [
                    { label: 'Base Rent', value: property.rent, active: !ownsPartner && !!owner && !ownership.isMortgaged },
                    { label: labelWithPartner, value: property.rentWith1, active: !!ownsPartner && !!owner && !ownership.isMortgaged },
                  ];
                } else {
                  const ownerId = ownership.ownerId;
                  const utilCount = ownerId
                    ? propertiesList.filter(p => p.type === 'utility' && propertyOwnerships[p.id]?.ownerId === ownerId && !propertyOwnerships[p.id]?.isMortgaged).length
                    : 0;
                  return [
                    { label: '1 Utility', value: property.rent, active: utilCount === 1 && !ownership.isMortgaged },
                    { label: '2 Utilities', value: property.rentWith1, active: utilCount === 2 && !ownership.isMortgaged },
                  ];
                }
              }
            })().filter((r): r is { label: string; value: number; active: boolean } => typeof r.value === 'number' && r.value > 0).map(r => (
              <View key={r.label} style={[
                styles.rentRow,
                { borderBottomColor: colors.border },
                r.active && { backgroundColor: colors.primary + '15', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }
              ]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {r.active && <MaterialCommunityIcons name="check-circle" size={14} color={colors.primary} />}
                  <Text style={[styles.rentLabel, { color: r.active ? colors.primary : colors.mutedForeground, fontFamily: r.active ? 'Inter_700Bold' : 'Inter_400Regular' }]}>
                    {r.label}
                  </Text>
                </View>
                <Text style={[styles.rentValue, { color: r.active ? colors.primary : colors.foreground, fontFamily: r.active ? 'Inter_700Bold' : 'Inter_600SemiBold' }]}>
                  {formatMoney(r.value, currency)}
                </Text>
              </View>
            ))}
          </ScrollView>

            {/* ── Transaction success popup ── */}
            <Modal visible={!!txConfirm} transparent animationType="fade" onRequestClose={() => { setTxConfirm(null); setRentPayer(null); onClose(); }}>
              <Pressable style={confirmStyles.overlay} onPress={() => { setTxConfirm(null); setRentPayer(null); onClose(); }}>
                <Pressable style={[confirmStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={confirmStyles.emoji}>{txConfirm?.emoji}</Text>
                  <Text style={[confirmStyles.title, { color: colors.foreground }]}>{txConfirm?.title}</Text>
                  <Text style={[confirmStyles.sub, { color: colors.mutedForeground }]}>{txConfirm?.sub}</Text>
                  <Pressable
                    onPress={() => { setTxConfirm(null); setRentPayer(null); onClose(); }}
                    style={({ pressed }) => [confirmStyles.okBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
                  >
                    <Text style={[confirmStyles.okText, { color: colors.primaryForeground }]}>Done</Text>
                  </Pressable>
                </Pressable>
              </Pressable>
            </Modal>
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
          if (props.length === 0) return null;
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
  ownerRow: { flexDirection: 'column', gap: 8 },
  buyChip: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5,
  },
  buyChipName: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  buyChipBalance: { fontFamily: 'Inter_400Regular', fontSize: 12 },
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
  houseBuyContainer: { gap: 8, marginTop: 4 },
  houseStatusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  houseStatusText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  housePriceText: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  houseActionBtns: { flexDirection: 'row', gap: 10 },
  houseActionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  houseActionBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  houseActionBtnSub: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 2 },
  warningText: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2, textAlign: 'center' },
  mortgageBtn: { paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  mortgageBtnText: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  rentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  rentLabel: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  rentValue: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  rentPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  rentPayBtnText: {
    flex: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
});

const confirmStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  card: {
    width: '100%', maxWidth: 360, borderRadius: 20, borderWidth: 1,
    padding: 28, alignItems: 'center', gap: 10,
  },
  emoji: { fontSize: 48 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 20, textAlign: 'center' },
  sub: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  okBtn: { marginTop: 8, paddingHorizontal: 40, paddingVertical: 13, borderRadius: 14 },
  okText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
});
