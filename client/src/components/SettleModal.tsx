import React from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AppText from './AppText';
import AppTextInput from './AppTextInput';

type SettleModalProps = {
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

export default function SettleModal({
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
}: SettleModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.bottomSheetBackdrop}>
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.bottomSheetCard}>
          <View style={styles.bottomSheetHandle} />
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
            >
              <View
                style={[
                  styles.alreadyPaidCheckbox,
                  alreadyPaid && styles.alreadyPaidCheckboxSelected,
                ]}
              >
                {alreadyPaid ? (
                  <AppText style={styles.alreadyPaidCheckboxTick}>✓</AppText>
                ) : null}
              </View>
              <AppText style={styles.alreadyPaidText}>Already paid</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.infoBtn}
              onPress={() =>
                Alert.alert(
                  'Already Paid',
                  'Enable this if you have already paid outside the app. For UPI mode, settlement will be recorded directly without opening payment apps.',
                )
              }
            >
              <AppText style={styles.infoBtnText}>i</AppText>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.settleBtn, settling && styles.settleBtnDisabled]}
            onPress={onSettle}
            disabled={settling}
          >
            <AppText style={styles.settleBtnText}>
              {settling ? 'Settling...' : 'Settle Shares'}
            </AppText>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bottomSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'flex-end',
  },
  bottomSheetOverlay: {
    flex: 1,
  },
  bottomSheetCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    maxHeight: '72%',
  },
  bottomSheetHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
    marginBottom: 10,
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#475569',
    fontSize: 12,
  },
  label: {
    marginTop: 14,
    marginBottom: 8,
    color: '#475569',
    fontSize: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
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
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#e2e8f0',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  modeBtnSelected: {
    backgroundColor: '#4f46e5',
    borderColor: '#4338ca',
  },
  modeBtnText: { color: '#475569', fontWeight: '600' },
  modeBtnTextSelected: { color: '#fff' },
  alreadyPaidRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  alreadyPaidToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alreadyPaidCheckbox: {
    width: 20,
    height: 20,
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
    fontSize: 12,
  },
  alreadyPaidText: {
    color: '#334155',
    fontSize: 14,
    fontWeight: '600',
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
    marginTop: 20,
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  settleBtnDisabled: { opacity: 0.7 },
  settleBtnText: { color: '#fff', fontSize: 14 },
});
