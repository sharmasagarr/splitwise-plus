import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import AppText from './AppText';
import AppTextInput from './AppTextInput';

type InviteGroupSheetProps = {
  visible: boolean;
  onClose: () => void;
  email: string;
  setEmail: (value: string) => void;
  onInvite: () => void;
  inviting: boolean;
  groupName?: string | null;
};

export default function InviteGroupSheet({
  visible,
  onClose,
  email,
  setEmail,
  onInvite,
  inviting,
  groupName,
}: InviteGroupSheetProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['48%'], []);

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

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      return;
    }

    bottomSheetRef.current?.dismiss();
  }, [visible]);

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      animateOnMount
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.sheetHandle}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      onDismiss={onClose}
    >
      <BottomSheetView style={styles.content}>
        <AppText style={styles.title}>Invite Member</AppText>
        <AppText style={styles.subtitle}>
          {groupName
            ? `Send an invite to join ${groupName}.`
            : 'Send an invite to join this group.'}
        </AppText>

        <AppText style={styles.label}>Email address</AppText>
        <AppTextInput
          style={styles.input}
          placeholder="name@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor="#94a3b8"
        />

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.secondaryBtn]}
            onPress={onClose}
            disabled={inviting}
            activeOpacity={0.85}
          >
            <AppText style={styles.secondaryBtnText}>Cancel</AppText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.primaryBtn]}
            onPress={onInvite}
            disabled={inviting}
            activeOpacity={0.9}
          >
            <AppText style={styles.primaryBtnText}>
              {inviting ? 'Sending...' : 'Send Invite'}
            </AppText>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
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
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 28,
  },
  title: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '700',
  },
  subtitle: {
    color: '#475569',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  label: {
    marginTop: 18,
    marginBottom: 8,
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#ffffff',
    color: '#0f172a',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 22,
  },
  actionBtn: {
    minWidth: 100,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryBtn: {
    backgroundColor: '#f1f5f9',
  },
  primaryBtn: {
    backgroundColor: '#4f46e5',
  },
  secondaryBtnText: {
    color: '#475569',
    fontWeight: '700',
  },
  primaryBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
