import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFooter,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from './AppText';


export type ExpenseSplitParticipant = {
  id: string;
  imageUrl?: string | null;
  isCurrentUser?: boolean;
  name: string;
  username?: string | null;
};


type ExpenseSplitSheetProps = {
  onClose: () => void;
  onConfirm: (shareAmounts?: number[]) => void;
  participants: ExpenseSplitParticipant[];
  saving: boolean;
  totalAmount: number;
  visible: boolean;
};


type SplitMode = 'equal' | 'unequal';


type EqualSplitTabContentProps = {
  equalShares: number[];
  participants: ExpenseSplitParticipant[];
};


type UnequalSplitTabContentProps = {
  participants: ExpenseSplitParticipant[];
  shareValues: string[];
  totalAmount: number;
  totalMatches: boolean;
  totalSplitAmount: number;
  updateShareValue: (index: number, value: string) => void;
};


const toPaise = (value: number) => Math.round(value * 100);

const formatAmount = (value: number) => value.toFixed(2);

const normalizeCurrencyInput = (value: string) => {
  const sanitized = value.replace(/[^0-9.]/g, '');
  const [wholePart = '', ...decimalParts] = sanitized.split('.');
  const decimal = decimalParts.join('').slice(0, 2);

  if (decimalParts.length === 0) {
    return wholePart;
  }

  return `${wholePart}.${decimal}`;
};


const buildEqualShares = (
  totalAmount: number,
  participants: ExpenseSplitParticipant[],
) => {
  if (participants.length === 0) return [];

  const totalPaise = toPaise(totalAmount);
  const base = Math.floor(totalPaise / participants.length);
  let remainder = totalPaise % participants.length;

  const splits = Array.from({ length: participants.length }, () => {
    let share = base;
    if (remainder > 0) {
      share += 1;
      remainder -= 1;
    }
    return share / 100;
  }).sort((a, b) => a - b);

  const settlerIndex = participants.findIndex(p => p.isCurrentUser);
  if (settlerIndex === -1) return splits;

  const settlerShare = splits[0];
  const otherShares = splits.slice(1);
  let otherIndex = 0;

  return participants.map((_, index) => {
    if (index === settlerIndex) return settlerShare;
    return otherShares[otherIndex++] ?? settlerShare;
  });
};


const getParticipantDisplayName = (participant: ExpenseSplitParticipant) =>
  participant.isCurrentUser ? 'You' : participant.name;

const getParticipantUsername = (participant: ExpenseSplitParticipant) =>
  `@${participant.username || 'user'}`;


const ParticipantAvatar = ({ participant }: { participant: ExpenseSplitParticipant }) => {
  const displayName = getParticipantDisplayName(participant);

  if (participant.imageUrl) {
    return <Image source={{ uri: participant.imageUrl }} style={styles.avatarImage} />;
  }

  return (
    <View style={styles.avatarFallback}>
      <AppText style={styles.avatarText}>
        {displayName.charAt(0).toUpperCase()}
      </AppText>
    </View>
  );
};


const EmptyState = () => (
  <View style={styles.emptyState}>
    <AppText style={styles.emptyStateTitle}>No participants found</AppText>
    <AppText style={styles.emptyStateText}>
      Go back and select a group or participants before proceeding.
    </AppText>
  </View>
);


const EqualSplitTabContent = ({
  participants,
  equalShares,
}: EqualSplitTabContentProps) => {
  if (participants.length === 0) return <EmptyState />;

  return (
    <View style={styles.tabContent}>
      <View style={styles.participantsList}>
        {participants.map((participant, index) => (
          <View key={participant.id} style={styles.participantCard}>
            <View style={styles.equalParticipantRow}>
              <View style={styles.participantInfoRow}>
                <ParticipantAvatar participant={participant} />
                <View style={styles.participantTextWrap}>
                  <AppText style={styles.participantName}>
                    {getParticipantDisplayName(participant)}
                  </AppText>
                  <AppText style={styles.participantUsername}>
                    {getParticipantUsername(participant)}
                  </AppText>
                </View>
              </View>
              <AppText style={styles.equalAmountText}>
                {`\u20b9${formatAmount(equalShares[index] ?? 0)}`}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};


const UnequalSplitTabContent = ({
  participants,
  shareValues,
  totalAmount,
  totalMatches,
  totalSplitAmount,
  updateShareValue,
}: UnequalSplitTabContentProps) => {
  if (participants.length === 0) return <EmptyState />;

  return (
    <View style={styles.tabContent}>
      <View style={styles.participantsList}>
        {participants.map((participant, index) => (
          <View key={participant.id} style={styles.participantCard}>
            <View style={styles.participantInfoRow}>
              <ParticipantAvatar participant={participant} />
              <View style={styles.participantTextWrap}>
                <AppText style={styles.participantName}>
                  {getParticipantDisplayName(participant)}
                </AppText>
                <AppText style={styles.participantUsername}>
                  {getParticipantUsername(participant)}
                </AppText>
              </View>
            </View>

            <View style={styles.editableAmountWrap}>
              <AppText style={styles.currencyPrefix}>{'\u20b9'}</AppText>
              <BottomSheetTextInput
                style={styles.amountInput}
                value={shareValues[index] ?? ''}
                onChangeText={value => updateShareValue(index, value)}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor="#94a3b8"
                returnKeyType="done"
              />
            </View>
          </View>
        ))}
      </View>

      <View style={styles.totalCard}>
        <View style={styles.totalTextWrap}>
          <AppText style={styles.totalLabel}>Total Split Amount</AppText>
          <AppText style={styles.totalHint}>
            This should match the expense total.
          </AppText>
        </View>
        <AppText style={[styles.totalValue, !totalMatches && styles.totalValueError]}>
          {`\u20b9${formatAmount(totalSplitAmount)}`}
        </AppText>
      </View>

      {!totalMatches ? (
        <AppText style={styles.errorText}>
          Split amounts must add up to {`\u20b9${formatAmount(totalAmount)}`}.
        </AppText>
      ) : null}
    </View>
  );
};


export default function ExpenseSplitSheet({
  visible,
  onClose,
  onConfirm,
  participants,
  saving,
  totalAmount,
}: ExpenseSplitSheetProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['88%'], []);
  const footerHeight = 72; // paddingTop(12) + button(50) + paddingBottom(16) - approx
  const bottomContentInset = useMemo(
    () => insets.bottom + footerHeight + 16,
    [insets.bottom],
  );
  const equalShares = useMemo(
    () => buildEqualShares(totalAmount, participants),
    [participants, totalAmount],
  );
  const [splitMode, setSplitMode] = useState<SplitMode>('equal');
  const [shareValues, setShareValues] = useState<string[]>([]);

  const parsedShares = useMemo(
    () => shareValues.map(v => Number.parseFloat(v || '0') || 0),
    [shareValues],
  );
  const totalSplitAmount = useMemo(
    () => parsedShares.reduce((sum, v) => sum + v, 0),
    [parsedShares],
  );
  const totalMatches = toPaise(totalSplitAmount) === toPaise(totalAmount);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      setSplitMode('equal');
      setShareValues(equalShares.map(formatAmount));
      return;
    }
    bottomSheetRef.current?.dismiss();
  }, [equalShares, visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.35}
        pressBehavior="close"
      />
    ),
    [],
  );

  const updateShareValue = (index: number, value: string) => {
    setShareValues(prev =>
      prev.map((cur, i) => (i === index ? normalizeCurrencyInput(value) : cur)),
    );
  };

  const handleConfirm = useCallback(() => {
    if (splitMode === 'unequal') {
      onConfirm(parsedShares);
      return;
    }
    onConfirm();
  }, [onConfirm, parsedShares, splitMode]);

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter
        {...props}
        bottomInset={0}
        style={{ ...styles.footer, paddingBottom: insets.bottom + 16 }}
      >
        <TouchableOpacity
          style={[
            styles.saveButton,
            (saving ||
              participants.length === 0 ||
              (splitMode === 'unequal' && !totalMatches)) &&
              styles.saveButtonDisabled,
          ]}
          onPress={handleConfirm}
          disabled={
            saving ||
            participants.length === 0 ||
            (splitMode === 'unequal' && !totalMatches)
          }
          activeOpacity={0.9}
        >
          <AppText style={styles.saveButtonText}>
            {saving ? 'Saving...' : 'Save Expense'}
          </AppText>
        </TouchableOpacity>
      </BottomSheetFooter>
    ),
    [handleConfirm, insets.bottom, participants.length, saving, splitMode, totalMatches],
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      animateOnMount
      enablePanDownToClose
      enableOverDrag={false}
      topInset={insets.top + 8}
      footerComponent={renderFooter}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.sheetHandle}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      onDismiss={onClose}
    >
      <View style={styles.container}>

        {/* Static header — plain View, auto height */}
        <View style={styles.header}>
          <AppText style={styles.title}>Review Split</AppText>
          <AppText style={styles.subtitle}>
            Check each participant&apos;s share before saving the expense.
          </AppText>

          <View style={styles.summaryCard}>
            <AppText style={styles.summaryLabel}>Expense Total</AppText>
            <AppText style={styles.summaryValue}>
              {`\u20b9${formatAmount(totalAmount)}`}
            </AppText>
          </View>

          {/* Tab bar is static — belongs in header, not in scroll */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[
                styles.tabBarItem,
                splitMode === 'equal' && styles.tabBarItemActive,
              ]}
              onPress={() => setSplitMode('equal')}
              activeOpacity={0.9}
            >
              <AppText
                style={[
                  styles.tabBarLabel,
                  splitMode === 'equal' ? styles.tabBarLabelActive : styles.tabBarLabelInactive,
                ]}
              >
                Split Equally
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabBarItem,
                splitMode === 'unequal' && styles.tabBarItemActive,
              ]}
              onPress={() => setSplitMode('unequal')}
              activeOpacity={0.9}
            >
              <AppText
                style={[
                  styles.tabBarLabel,
                  splitMode === 'unequal' ? styles.tabBarLabelActive : styles.tabBarLabelInactive,
                ]}
              >
                Split Unequally
              </AppText>
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable content — flex:1 fills remaining space after header */}
        <BottomSheetScrollView
          style={styles.scrollArea}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: bottomContentInset },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {splitMode === 'equal' ? (
            <EqualSplitTabContent
              participants={participants}
              equalShares={equalShares}
            />
          ) : (
            <UnequalSplitTabContent
              participants={participants}
              shareValues={shareValues}
              totalAmount={totalAmount}
              totalMatches={totalMatches}
              totalSplitAmount={totalSplitAmount}
              updateShareValue={updateShareValue}
            />
          )}
        </BottomSheetScrollView>

      </View>
    </BottomSheetModal>
  );
}


const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sheetHandle: {
    backgroundColor: '#cbd5e1',
    width: 44,
    height: 5,
  },
  // Single flex:1 container — fills the entire sheet height
  container: {
    flex: 1,
  },
  // Static header — no flex, just natural height
  header: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 4,
  },
  // Scrollable area — flex:1 takes all space below header
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: '#475569',
    fontSize: 12,
    lineHeight: 20,
    marginTop: 6,
  },
  summaryCard: {
    marginTop: 18,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    color: '#64748b',
    fontSize: 13,
  },
  summaryValue: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
  tabBar: {
    marginTop: 18,
    marginBottom: 4,
    backgroundColor: '#e0e7ff',
    borderRadius: 50,
    minHeight: 44,
    padding: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBarItem: {
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    paddingHorizontal: 8,
  },
  tabBarItemActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
  },
  tabBarLabel: {
    fontSize: 13,
    fontFamily: 'GoogleSans-Medium',
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
    margin: 0,
    padding: 0,
  },
  tabBarLabelActive: {
    color: '#4f46e5',
  },
  tabBarLabelInactive: {
    color: '#64748b',
  },
  tabContent: {
    paddingTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 48,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 20,
    color: '#64748b',
    textAlign: 'center',
  },
  participantsList: {
    gap: 12,
  },
  participantCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 12,
  },
  equalParticipantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  participantInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
    backgroundColor: '#e2e8f0',
  },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dbeafe',
  },
  avatarText: {
    color: '#2563eb',
    fontSize: 15,
    fontWeight: '700',
  },
  participantTextWrap: {
    flex: 1,
  },
  participantName: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '600',
  },
  participantUsername: {
    color: '#2563eb',
    fontSize: 12,
    marginTop: 2,
  },
  equalAmountText: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
  },
  editableAmountWrap: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
  },
  currencyPrefix: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#0f172a',
  },
  totalCard: {
    marginTop: 20,
    marginBottom: 8,
    borderRadius: 18,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  totalTextWrap: {
    flex: 1,
  },
  totalLabel: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  totalHint: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 3,
  },
  totalValue: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
  totalValueError: {
    color: '#dc2626',
  },
  errorText: {
    marginTop: 10,
    color: '#dc2626',
    fontSize: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});