import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import AppText from './AppText';
import Icon from './Icon';

type IconName = React.ComponentProps<typeof Icon>['name'];

type UploadMediaCardProps = {
  imageUri?: string | null;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  placeholderTitle: string;
  placeholderHint?: string;
  actionText: string;
  loadingText?: string;
  placeholderIconName?: IconName;
  actionIconName?: IconName;
  previewHeight?: number;
  style?: StyleProp<ViewStyle>;
};

export default function UploadMediaCard({
  imageUri,
  onPress,
  disabled = false,
  loading = false,
  placeholderTitle,
  placeholderHint,
  actionText,
  loadingText = 'Uploading...',
  placeholderIconName = 'Photo',
  actionIconName = 'Pencil',
  previewHeight = 188,
  style,
}: UploadMediaCardProps) {
  return (
    <TouchableOpacity
      style={[styles.imageCard, disabled && styles.imageCardDisabled, style]}
      onPress={onPress}
      activeOpacity={0.88}
      disabled={disabled}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={[styles.imagePreview, { height: previewHeight }]}
        />
      ) : (
        <View style={[styles.imagePlaceholder, { minHeight: previewHeight }]}>
          <View style={styles.imagePlaceholderIconWrap}>
            <Icon
              name={placeholderIconName}
              width={28}
              height={28}
              color="#4f46e5"
            />
          </View>
          <AppText style={styles.imagePlaceholderText}>
            {placeholderTitle}
          </AppText>
          {placeholderHint ? (
            <AppText style={styles.imagePlaceholderHint}>
              {placeholderHint}
            </AppText>
          ) : null}
        </View>
      )}

      <View style={styles.imageAction}>
        {loading ? (
          <View style={styles.imageActionLoading}>
            <ActivityIndicator size="small" color="#4f46e5" />
            <AppText style={styles.imageActionText}>{loadingText}</AppText>
          </View>
        ) : (
          <>
            <Icon name={actionIconName} width={14} height={14} color="#4f46e5" />
            <AppText style={styles.imageActionText}>{actionText}</AppText>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  imageCard: {
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  imageCardDisabled: {
    opacity: 0.72,
  },
  imagePreview: {
    width: '100%',
    backgroundColor: '#e2e8f0',
  },
  imagePlaceholder: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: '#f8fafc',
  },
  imagePlaceholderIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
  },
  imagePlaceholderText: {
    color: '#4f46e5',
    fontSize: 14,
    fontWeight: '600'
    ,
    textAlign: 'center',
  },
  imagePlaceholderHint: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    maxWidth: 240,
  },
  imageAction: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  imageActionLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imageActionText: {
    color: '#4f46e5',
    fontSize: 13,
    fontWeight: '700',
  },
});
