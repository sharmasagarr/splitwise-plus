import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFooter,
  type BottomSheetFooterProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from './AppText';
import AppTextInput from './AppTextInput';
import AppModal from './Modal';


type SettleSheetProps = {
  visible: boolean;
  onClose: () => void;
  amount: string;
  setAmount: (val: string) => void;
  paymentMode: string;
  setPaymentMode: (val: string) => void;
  alreadyPaid: boolean;
  setAlreadyPaid: (val: boolean | ((prev: boolean) => boolean)) => void;
  settling: boolean;
  onSettle: () => void;
  paymentModes?: string[];
};


export default function SettleSheet({
  visible,
  onClose,
  amount,
  setAmount,
  paymentMode,
  setPaymentMode,
  alreadyPaid,
  setAlreadyPaid,
  settling,
  onSettle,
  paymentModes = ['upi', 'cash'],
}: SettleSheetProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['62%'], []);
  const [showAlreadyPaidInfo, setShowAlreadyPaidInfo] = useState(false);

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

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter
        {...props}
        bottomInset={0}
        style={{ ...styles.footer, paddingBottom: insets.bottom + 16 }}
      >
        <TouchableOpacity
          style={[styles.settleBtn, settling && styles.settleBtnDisabled]}
          onPress={onSettle}
          disabled={settling}
          activeOpacity={0.9}
        >
          <AppText style={styles.settleBtnText}>
            {settling ? 'Settling...' : 'Settle Shares'}
          </AppText>
        </TouchableOpacity>
      </BottomSheetFooter>
    ),
    [insets.bottom, onSettle, settling],
  );

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      return;
    }

    bottomSheetRef.current?.dismiss();
    setShowAlreadyPaidInfo(false);
  }, [visible]);

  return (
    <>
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
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetHandle}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onDismiss={onClose}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          <AppText style={styles.modalTitle}>Complete Settlement</AppText>
          <AppText style={styles.modalSubtitle}>
            Choose amount and payment mode.
          </AppText>

          <AppText style={styles.label}>Amount to pay</AppText>
          <AppTextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="0.00"
            keyboardType="numeric"
            placeholderTextColor="#94a3b8"
          />

          <AppText style={styles.label}>Payment mode</AppText>
          <View style={styles.paymentModes}>
            {paymentModes.map(mode => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeBtn,
                  paymentMode === mode && styles.modeBtnSelected,
                ]}
                onPress={() => setPaymentMode(mode)}
                activeOpacity={0.85}
              >
                <AppText
                  style={[
                    styles.modeBtnText,
                    paymentMode === mode && styles.modeBtnTextSelected,
                  ]}
                >
                  {mode.toUpperCase()}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.alreadyPaidRow}>
            <TouchableOpacity
              style={styles.alreadyPaidToggle}
              onPress={() => setAlreadyPaid(prev => !prev)}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.alreadyPaidCheckbox,
                  alreadyPaid && styles.alreadyPaidCheckboxSelected,
                ]}
              >
                {alreadyPaid ? (
                  <AppText style={styles.alreadyPaidCheckboxTick}>
                    {'\u2713'}
                  </AppText>
                ) : null}
              </View>
              <AppText style={styles.alreadyPaidText}>Already paid</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.infoBtn}
              onPress={() => setShowAlreadyPaidInfo(true)}
              activeOpacity={0.85}
            >
              <AppText style={styles.infoBtnText}>i</AppText>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      <AppModal
        visible={showAlreadyPaidInfo}
        onClose={() => setShowAlreadyPaidInfo(false)}
        title="Already Paid"
        description="Enable this if you have already paid outside the app. For UPI mode, settlement will be recorded directly without opening payment apps."
        primaryButton={{
          text: 'Understood',
          onPress: () => setShowAlreadyPaidInfo(false),
        }}
      />
    </>
  );
}


const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bottomSheetHandle: {
    backgroundColor: '#cbd5e1',
    width: 44,
    height: 5,
  },
  bottomSheetContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 96,
  },
  footer: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#475569',
    fontSize: 12,
    marginTop: 4,
  },
  label: {
    marginTop: 16,
    marginBottom: 8,
    color: '#475569',
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#fff',
    color: '#0f172a',
  },
  paymentModes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  modeBtnSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#4338ca',
  },
  modeBtnText: {
    color: '#475569',
    fontWeight: '600',
  },
  modeBtnTextSelected: {
    color: '#fff',
  },
  alreadyPaidRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alreadyPaidToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alreadyPaidCheckbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  alreadyPaidCheckboxSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  alreadyPaidCheckboxTick: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  alreadyPaidText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '500',
  },
  infoBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  infoBtnText: {
    color: '#475569',
    fontWeight: '700',
    fontSize: 12,
  },
  settleBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  settleBtnDisabled: {
    opacity: 0.7,
  },
  settleBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});