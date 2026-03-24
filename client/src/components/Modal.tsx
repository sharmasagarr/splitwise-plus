import React, { useEffect, useState } from 'react';
import {
  Modal as RNModal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import AppText from './AppText';

export type ModalButtonConfig = {
  text: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
};

type AppModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  primaryButton?: ModalButtonConfig;
  secondaryButton?: ModalButtonConfig;
  closeOnBackdropPress?: boolean;
  children?: React.ReactNode;
};

const OPEN_DURATION = 220;
const CLOSE_DURATION = 180;

export default function AppModal({
  visible,
  onClose,
  title,
  description,
  primaryButton,
  secondaryButton,
  closeOnBackdropPress = true,
  children,
}: AppModalProps) {
  const insets = useSafeAreaInsets();
  const [rendered, setRendered] = useState(visible);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setRendered(true);
    }
  }, [visible]);

  useEffect(() => {
    if (!rendered) {
      return;
    }

    cancelAnimation(progress);

    if (visible) {
      progress.value = withTiming(1, {
        duration: OPEN_DURATION,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    progress.value = withTiming(
      0,
      {
        duration: CLOSE_DURATION,
        easing: Easing.in(Easing.cubic),
      },
      finished => {
        if (finished) {
          scheduleOnRN(setRendered, false);
        }
      },
    );
  }, [progress, rendered, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateY: interpolate(progress.value, [0, 1], [24, 0]),
      },
      {
        scale: interpolate(progress.value, [0, 1], [0.96, 1]),
      },
    ],
  }));

  if (!rendered) {
    return null;
  }

  const handleBackdropPress = () => {
    if (closeOnBackdropPress) {
      onClose();
    }
  };

  const actions = [secondaryButton, primaryButton].filter(Boolean) as ModalButtonConfig[];

  return (
    <RNModal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      hardwareAccelerated
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.modalRoot,
          {
            paddingTop: insets.top + 24,
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        <Animated.View style={[styles.backdrop, backdropStyle]} />
        <Pressable style={styles.backdropPressable} onPress={handleBackdropPress} />

        <Animated.View style={[styles.card, cardStyle]}>
          <View style={styles.content}>
            <AppText style={styles.title}>{title}</AppText>

            {description ? (
              <AppText style={styles.description}>{description}</AppText>
            ) : null}

            {children ? <View style={styles.childrenWrap}>{children}</View> : null}
          </View>

          {actions.length > 0 ? (
            <View style={styles.actionsRow}>
              {secondaryButton ? (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.secondaryButton,
                    secondaryButton.disabled && styles.buttonDisabled,
                  ]}
                  onPress={secondaryButton.onPress}
                  disabled={secondaryButton.disabled}
                  activeOpacity={0.85}
                >
                  <AppText style={styles.secondaryButtonText}>
                    {secondaryButton.text}
                  </AppText>
                </TouchableOpacity>
              ) : null}

              {primaryButton ? (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.primaryButton,
                    primaryButton.variant === 'danger' && styles.dangerButton,
                    primaryButton.disabled && styles.buttonDisabled,
                  ]}
                  onPress={primaryButton.onPress}
                  disabled={primaryButton.disabled}
                  activeOpacity={0.9}
                >
                  <AppText style={styles.primaryButtonText}>
                    {primaryButton.text}
                  </AppText>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </Animated.View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
  },
  description: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
    textAlign: 'center',
  },
  childrenWrap: {
    marginTop: 16,
    width: '100%',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  actionButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
  },
  dangerButton: {
    backgroundColor: '#dc2626',
  },
  secondaryButton: {
    backgroundColor: '#f1f5f9',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
});
