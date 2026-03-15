import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import AppText from './AppText';
import ImageCropPicker from 'react-native-image-crop-picker';

interface ImagePreviewModalProps {
  visible: boolean;
  imageUri?: string;
  onConfirm: (uri: string) => void;
  onCancel: () => void;
  loading?: boolean;
  aspectRatio?: number;
  cropShape?: 'square' | 'circle';
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  visible,
  imageUri,
  onConfirm,
  onCancel,
  loading = false,
  aspectRatio = 1,
  cropShape = 'square',
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <AppText style={styles.title}>Preview Image</AppText>
          
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={[
                styles.preview,
                cropShape === 'circle' && styles.previewCircle,
              ]}
            />
          ) : (
            <View style={styles.previewPlaceholder}>
              <AppText style={styles.placeholderText}>No image selected</AppText>
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.confirmButton]}
              onPress={() => imageUri && onConfirm(imageUri)}
              disabled={!imageUri || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <AppText style={styles.confirmButtonText}>Confirm & Upload</AppText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              disabled={loading}
            >
              <AppText style={styles.cancelButtonText}>Cancel</AppText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

interface ImagePickerWithCropProps {
  onImageSelected: (uri: string) => void;
  aspectRatio?: number;
  cropShape?: 'square' | 'circle';
}

export const useImagePickerWithCrop = ({
  onImageSelected,
  aspectRatio = 1,
  cropShape = 'square',
}: ImagePickerWithCropProps) => {
  const [croppedImage, setCroppedImage] = useState<string>();
  const [previewVisible, setPreviewVisible] = useState(false);

  const handlePickImage = async () => {
    try {
      const image = await ImageCropPicker.openPicker({
        width: 300,
        height: 300,
        cropping: true,
        cropperActiveButtonColor: '#667eea',
        cropperStatusBarColor: '#667eea',
        cropperToolbarColor: '#667eea',
        cropperCircleOverlay: cropShape === 'circle',
        freeStyleCropEnabled: cropShape === 'square',
        mediaType: 'photo',
      });

      console.log('🖼️ Image cropped:', {
        path: image.path,
        size: image.size,
        mime: image.mime,
      });

      setCroppedImage(image.path);
      setPreviewVisible(true);
    } catch (error: any) {
      // Silently ignore user cancellation
      if (error.message !== 'User cancelled image selection') {
        console.error('❌ Image picker error:', error.message);
        throw error;
      }
    }
  };

  const handleConfirmImage = (uri: string) => {
    onImageSelected(uri);
    setPreviewVisible(false);
    setCroppedImage(undefined);
  };

  const handleClosePreview = () => {
    setPreviewVisible(false);
    setCroppedImage(undefined);
  };

  return {
    handlePickImage,
    previewVisible,
    croppedImage,
    handleConfirmImage,
    handleClosePreview,
    ImagePreviewModal: (
      <ImagePreviewModal
        visible={previewVisible}
        imageUri={croppedImage}
        onConfirm={handleConfirmImage}
        onCancel={handleClosePreview}
        aspectRatio={aspectRatio}
        cropShape={cropShape}
      />
    ),
  };
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 20,
    textAlign: 'center',
  },
  preview: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    marginBottom: 24,
  },
  previewCircle: {
    borderRadius: 125,
    width: 250,
    height: 250,
    alignSelf: 'center',
  },
  previewPlaceholder: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    backgroundColor: '#667eea',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '700',
  },
});
