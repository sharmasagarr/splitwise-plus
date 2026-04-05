import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetBackdropProps,
  BottomSheetFooter,
  type BottomSheetFooterProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from './AppText';
import AppModal from './Modal';
import AppTextInput from './AppTextInput';
import { useImagePickerWithCrop } from './ImagePickerModal';
import { uploadGroupImage } from '../services';
import UploadMediaCard from './UploadMediaCard';


type Member = {
  id: string;
  name: string;
  username: string;
  imageUrl?: string | null;
};


type EditGroupSheetProps = {
  visible: boolean;
  onClose: () => void;
  initialName?: string | null;
  initialDescription?: string | null;
  initialImageUrl?: string | null;
  saving: boolean;
  onSave: (values: {
    name: string;
    description: string;
    imageUrl: string | null;
  }) => void;
  members?: Member[];
  onRemoveMember?: (member: Member) => void;
  removingMemberId?: string | null;
};


export default function EditGroupSheet({
  visible,
  onClose,
  initialName,
  initialDescription,
  initialImageUrl,
  saving,
  onSave,
  members = [],
  onRemoveMember,
  removingMemberId,
}: EditGroupSheetProps) {
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => ['82%'], []);
  const [name, setName] = useState(initialName || '');
  const [description, setDescription] = useState(initialDescription || '');
  const [imageUrl, setImageUrl] = useState<string | null>(initialImageUrl || null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [removeMode, setRemoveMode] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<Member | null>(null);

  useEffect(() => {
    setName(initialName || '');
    setDescription(initialDescription || '');
    setImageUrl(initialImageUrl || null);
  }, [initialDescription, initialImageUrl, initialName, visible]);

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.present();
      return;
    }

    bottomSheetRef.current?.dismiss();
  }, [visible]);

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

  const handleUploadGroupPhoto = useCallback(async (uri: string) => {
    try {
      setUploadingImage(true);
      const json = await uploadGroupImage(uri);
      setImageUrl(json.imageUrl || null);
      Alert.alert('Success', 'Group image uploaded successfully.');
    } catch (error: any) {
      Alert.alert('Upload Error', error.message || 'Failed to upload group image');
    } finally {
      setUploadingImage(false);
    }
  }, []);

  const { handlePickImage, ImagePreviewModal } = useImagePickerWithCrop({
    onImageSelected: handleUploadGroupPhoto,
    cropShape: 'square',
  });

  const handleSubmit = useCallback(() => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Group name cannot be empty');
      return;
    }

    onSave({
      name: name.trim(),
      description,
      imageUrl,
    });
  }, [description, imageUrl, name, onSave]);

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter
        {...props}
        bottomInset={0}
        style={{ ...styles.footer, paddingBottom: insets.bottom + 16 }}
      >
        <View style={styles.actions}>
          {!removeMode ? (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.secondaryBtn]}
                onPress={onClose}
                disabled={saving || uploadingImage}
                activeOpacity={0.85}
              >
                <AppText style={styles.secondaryBtnText}>Cancel</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.primaryBtn]}
                onPress={handleSubmit}
                disabled={saving || uploadingImage}
                activeOpacity={0.9}
              >
                <AppText style={styles.primaryBtnText}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </AppText>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={() => setRemoveMode(false)}
              disabled={removingMemberId != null}
              activeOpacity={0.85}
            >
              <AppText style={styles.secondaryBtnText}>Back</AppText>
            </TouchableOpacity>
          )}
        </View>
      </BottomSheetFooter>
    ),
    [handleSubmit, insets.bottom, onClose, removeMode, removingMemberId, saving, uploadingImage],
  );

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
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onDismiss={onClose}
      >
        <View style={styles.container}>
          <BottomSheetScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <AppText style={styles.title}>Edit Group</AppText>

            {pendingRemove ? (
              <AppModal
                visible={Boolean(pendingRemove)}
                onClose={() => setPendingRemove(null)}
                title="Remove Member"
                description={`Remove ${pendingRemove.name} (@${pendingRemove.username}) from this group? They will lose access to this group and its chat.`}
                primaryButton={{
                  text: 'Remove',
                  onPress: () => {
                    if (onRemoveMember) onRemoveMember(pendingRemove);
                    setPendingRemove(null);
                  },
                  variant: 'danger',
                  disabled: removingMemberId === pendingRemove.id,
                }}
                secondaryButton={{
                  text: 'Cancel',
                  onPress: () => setPendingRemove(null),
                  disabled: removingMemberId === pendingRemove.id,
                }}
                closeOnBackdropPress={removingMemberId !== pendingRemove.id}
              />
            ) : null}

            {!removeMode ? (
              <>
                <AppText style={styles.subtitle}>
                  Update the group name, description, and image.
                </AppText>

                <UploadMediaCard
                  imageUri={imageUrl}
                  onPress={handlePickImage}
                  disabled={uploadingImage || saving}
                  loading={uploadingImage}
                  placeholderTitle="Click to add group image"
                  placeholderHint="Use a square photo so it looks great in the group header."
                  actionText={imageUrl ? 'Change image' : 'Upload image'}
                />

                <AppText style={styles.label}>Group Name</AppText>
                <AppTextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter group name"
                  placeholderTextColor="#94a3b8"
                />

                <AppText style={styles.label}>Description</AppText>
                <AppTextInput
                  style={[styles.input, styles.multilineInput]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Say what this group is for"
                  placeholderTextColor="#94a3b8"
                  multiline
                  textAlignVertical="top"
                  maxLength={180}
                />

                <TouchableOpacity
                  style={[styles.actionBtn, styles.removeMemberBtn]}
                  onPress={() => setRemoveMode(true)}
                  activeOpacity={0.85}
                >
                  <AppText style={styles.removeMemberBtnText}>
                    Remove a member
                  </AppText>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <AppText style={styles.subtitle}>
                  Select a member to remove from the group.
                </AppText>
                <View style={styles.membersList}>
                  {members.map(member => (
                    <View key={member.id} style={styles.memberRow}>
                      {member.imageUrl ? (
                        <Image
                          source={{ uri: member.imageUrl }}
                          style={styles.memberImage}
                        />
                      ) : (
                        <View style={styles.memberAvatar}>
                          <AppText style={styles.memberAvatarText}>
                            {member.name?.charAt(0).toUpperCase() || '?'}
                          </AppText>
                        </View>
                      )}
                      <View style={styles.memberInfo}>
                        <AppText style={styles.memberName}>{member.name}</AppText>
                        <AppText style={styles.memberUsername}>
                          @{member.username}
                        </AppText>
                      </View>
                      {onRemoveMember ? (
                        <TouchableOpacity
                          style={[
                            styles.memberRemoveBtn,
                            removingMemberId === member.id &&
                              styles.memberRemoveBtnDisabled,
                          ]}
                          onPress={() => setPendingRemove(member)}
                          disabled={removingMemberId === member.id}
                          activeOpacity={0.85}
                        >
                          <AppText style={styles.memberRemoveBtnText}>
                            {removingMemberId === member.id
                              ? 'Removing...'
                              : 'Remove'}
                          </AppText>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  ))}
                </View>
              </>
            )}
          </BottomSheetScrollView>
        </View>
      </BottomSheetModal>

      {ImagePreviewModal}
    </>
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
  // ✅ Replaces sheetContainer — plain View with flex:1
  container: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 120,
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
    marginBottom: 18,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginTop: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#ffffff',
    color: '#0f172a',
  },
  multilineInput: {
    minHeight: 110,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionBtn: {
    minWidth: 120,
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
  removeMemberBtn: {
    backgroundColor: '#fee2e2',
    marginTop: 18,
  },
  removeMemberBtnText: {
    color: '#dc2626',
    fontWeight: '700',
  },
  membersList: {
    marginTop: 10,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  memberImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 12,
    backgroundColor: '#e2e8f0',
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 12,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: {
    color: '#667eea',
    fontWeight: '700',
    fontSize: 15,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontWeight: '600',
    color: '#1e293b',
    fontSize: 14,
  },
  memberUsername: {
    color: '#64748b',
    fontSize: 11,
  },
  memberRemoveBtn: {
    backgroundColor: '#fee2e2',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginLeft: 8,
  },
  memberRemoveBtnDisabled: {
    opacity: 0.6,
  },
  memberRemoveBtnText: {
    color: '#dc2626',
    fontWeight: '700',
    fontSize: 12,
  },
});