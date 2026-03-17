import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
} from 'react-native';
import AppText from '../components/AppText';
import { useGetExpenseDetail, uploadExpenseAttachment } from '../services';
import { useAppSelector } from '../store/hooks';
import { useImagePickerWithCrop } from '../components/ImagePickerModal';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigations/RootStack';

type Props = NativeStackScreenProps<RootStackParamList, 'ExpenseDetail'>;

const ExpenseDetail: React.FC<Props> = ({ route }) => {
  const { expenseId } = route.params;
  const { user } = useAppSelector(state => state.auth);
  const [uploading, setUploading] = useState(false);

  const { data, loading, refetch } = useGetExpenseDetail(expenseId);

  const expense = data?.getExpenseDetail;

  const handleUploadExpenseAttachmentDirect = useCallback(
    async (imageUri: string) => {
      try {
        setUploading(true);

        console.log('🚀 Starting expense attachment upload:', {
          expenseId,
        });

        const json = await uploadExpenseAttachment(imageUri, expenseId);

        console.log('✅ Upload successful:', json);
        Alert.alert('Success', 'Bill uploaded successfully!');
        refetch();
      } catch (error: any) {
        console.error('❌ Upload error:', error.message);
        Alert.alert('Upload Error', error.message || 'Failed to upload bill');
      } finally {
        setUploading(false);
      }
    },
    [expenseId, refetch]
  );

  const {
    handlePickImage: openExpenseImagePicker,
    // previewVisible: expensePreviewVisible,
    // croppedImage: expenseCroppedImage,
    // handleConfirmImage: handleConfirmExpenseImage,
    // handleClosePreview: handleCloseExpensePreview,
    ImagePreviewModal: ExpenseImagePreviewModal,
  } = useImagePickerWithCrop({
    onImageSelected: handleUploadExpenseAttachmentDirect,
    cropShape: 'square',
  });

  // const handleUpload = useCallback(async () => {
  //   try {
  //     const result = await launchImageLibrary({
  //       mediaType: 'mixed',
  //       quality: 0.8,
  //       selectionLimit: 1,
  //     });

  //     if (result.didCancel || !result.assets || result.assets.length === 0) {
  //       return;
  //     }

  //     const asset = result.assets[0];
  //     if (!asset.uri) {
  //       return;
  //     }

  //     setUploading(true);

  //     const token = await AsyncStorage.getItem('token');
  //     if (!token) {
  //       Alert.alert('Error', 'You need to be logged in');
  //       setUploading(false);
  //       return;
  //     }

  //     // Validate file size before upload (5MB limit)
  //     if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
  //       Alert.alert('Error', 'File size must be less than 5MB');
  //       setUploading(false);
  //       return;
  //     }

  //     // Prepare file object for FormData
  //     // React Native requires specific format for file uploads
  //     const fileUri = Platform.OS === 'android' 
  //       ? asset.uri 
  //       : asset.uri?.replace('file://', '');
      
  //     const fileName = asset.fileName || `bill_${Date.now()}.jpg`;
  //     const fileType = asset.type || 'image/jpeg';

  //     console.log('🚀 Starting upload:', {
  //       fileName,
  //       fileSize: asset.fileSize,
  //       fileType,
  //       fileUri,
  //       expenseId,
  //       apiUrl: `${API_URL}/api/upload/expense-attachment`,
  //       platform: Platform.OS,
  //     });

  //     const uploadUrl = `${API_URL}/api/upload/expense-attachment`;
      
  //     console.log('📤 Sending request to:', uploadUrl);
  //     console.log('📦 Preparing multipart upload with ReactNativeBlobUtil');
  //     console.log('🔑 Token present:', !!token);
      
  //     // Use ReactNativeBlobUtil for reliable file uploads
  //     try {
  //       const response = await ReactNativeBlobUtil.fetch(
  //         'POST',
  //         uploadUrl,
  //         {
  //           'Authorization': `Bearer ${token}`,
  //           'Accept': 'application/json',
  //           'Content-Type': 'multipart/form-data',
  //         },
  //         [
  //           {
  //             name: 'file',
  //             filename: fileName,
  //             type: fileType,
  //             data: ReactNativeBlobUtil.wrap(fileUri.replace('file://', '')),
  //           },
  //           {
  //             name: 'expenseId',
  //             data: expenseId,
  //           },
  //         ]
  //       );

  //       console.log('📡 Response received:', {
  //         status: response.info().status,
  //         headers: response.info().headers,
  //       });

  //       const statusCode = response.info().status;
  //       const rawText = await Promise.resolve(response.text());
  //       const responseText =
  //         typeof rawText === 'string' ? rawText : JSON.stringify(rawText ?? '');
        
  //       console.log('📄 Raw response:', responseText.substring(0, 300));

  //       let json: any;
  //       try {
  //         json = await Promise.resolve(response.json());
  //       } catch (parseError) {
  //         console.error('❌ JSON parse error:', parseError);
  //         throw new Error(`Invalid server response: ${responseText.substring(0, 100)}`);
  //       }

  //       if (statusCode < 200 || statusCode >= 300) {
  //         console.error('❌ Upload failed:', json);
  //         throw new Error(json.error || `Upload failed: HTTP ${statusCode}`);
  //       }

  //       console.log('✅ Upload successful:', json);
  //       Alert.alert('Success', 'Bill uploaded successfully!');
  //       refetch();
  //     } catch (fetchError: any) {
  //       console.error('❌ Upload error:', {
  //         message: fetchError.message,
  //         name: fetchError.name,
  //       });
  //       throw fetchError;
  //     }
  //   } catch (error: any) {
  //     console.error('❌ Upload error details:', {
  //       message: error.message,
  //       name: error.name,
  //       code: error.code,
  //       stack: error.stack?.substring(0, 200),
  //     });

  //     let userMessage = 'Something went wrong';
      
  //     if (error.message.includes('timeout')) {
  //       userMessage = 'Upload took too long. Please check your connection.';
  //     } else if (error.message.toLowerCase().includes('network request failed')) {
  //       userMessage = `Network request failed. Please check:\n1. Server is running\n2. Dev tunnel is active\n3. Internet connection is stable\n\nAPI: ${API_URL}`;
  //     } else if (error.message.includes('Network')) {
  //       userMessage = `Network error: ${error.message}\n\nAPI: ${API_URL}`;
  //     } else if (error.message.includes('invalid response')) {
  //       userMessage = error.message;
  //     } else if (error.message.includes('Unauthorized') || error.message.includes('401')) {
  //       userMessage = 'Session expired. Please log out and log in again.';
  //     } else if (error.message.includes('403')) {
  //       userMessage = 'You are not authorized to upload to this expense.';
  //     } else if (error.message.includes('404')) {
  //       userMessage = 'Expense not found or upload endpoint unavailable.';
  //     } else {
  //       userMessage = error.message || 'Unknown error occurred';
  //     }

  //     Alert.alert('Upload Error', userMessage);
  //   } finally {
  //     setUploading(false);
  //   }
  // }, [expenseId, refetch]);

  const openAttachment = useCallback((url: string) => {
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'Could not open attachment'),
    );
  }, []);

  if (loading && !expense) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  if (!expense) {
    return (
      <View style={styles.center}>
        <AppText style={styles.errorText}>Expense not found</AppText>
      </View>
    );
  }

  const createdDate = new Date(Number(expense.createdAt));
  const formattedDate = createdDate.toLocaleDateString([], {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = createdDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const groupMembers = expense.group?.members || [];
  const attachments = expense.attachments || [];

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} />
        }
      >
      {/* Expense Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <AppText style={styles.headerIconText}>🧾</AppText>
        </View>
        <AppText style={styles.headerNote}>{expense.note || 'Expense'}</AppText>
        <AppText style={styles.headerAmount}>
          ₹{parseFloat(expense.totalAmount).toFixed(2)}
        </AppText>
        <AppText style={styles.headerCurrency}>{expense.currency}</AppText>
        <View style={styles.headerMeta}>
          <AppText style={styles.headerMetaText}>
            Paid by{' '}
            <AppText style={styles.headerMetaBold}>
              {expense.createdBy.id === user?.id
                ? 'You'
                : expense.createdBy.name}
            </AppText>
          </AppText>
          <AppText style={styles.headerDot}>•</AppText>
          <AppText style={styles.headerMetaText}>
            {formattedDate} at {formattedTime}
          </AppText>
        </View>
        {expense.group && (
          <View style={styles.groupBadge}>
            <AppText style={styles.groupBadgeText}>👥 {expense.group.name}</AppText>
          </View>
        )}
      </View>

      {/* Group Members */}
      {groupMembers.length > 0 && (
        <View style={styles.section}>
          <AppText style={styles.sectionTitle}>
            👥 Group Members ({groupMembers.length})
          </AppText>
          <View style={styles.membersRow}>
            {groupMembers.map((m: any) => (
              <View key={m.id} style={styles.memberChip}>
                <View style={styles.memberChipAvatar}>
                  <AppText style={styles.memberChipAvatarText}>
                    {m.user.name.charAt(0).toUpperCase()}
                  </AppText>
                </View>
                <AppText style={styles.memberChipName}>
                  {m.user.id === user?.id ? 'You' : m.user.name}
                </AppText>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Split Breakdown */}
      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>
          💰 Split Breakdown ({expense.shares.length} people)
        </AppText>
      </View>

      {expense.shares.map((share: any) => {
        const isCreator = share.userId === expense.createdById;
        const isMe = share.userId === user?.id;
        const isSettled = share.status === 'settled';

        return (
          <View key={share.id} style={styles.shareCard}>
            <View style={styles.shareAvatar}>
              <AppText style={styles.shareAvatarText}>
                {share.user.name.charAt(0).toUpperCase()}
              </AppText>
            </View>
            <View style={styles.shareInfo}>
              <AppText style={styles.shareName}>
                {share.user.name}
                {isMe ? ' (You)' : ''}
              </AppText>
              <AppText style={styles.shareEmail}>{share.user.email}</AppText>
              <View style={styles.shareAmounts}>
                <AppText style={styles.shareAmountLabel}>
                  Share:{' '}
                  <AppText style={styles.shareAmountValue}>
                    ₹{parseFloat(share.shareAmount).toFixed(2)}
                  </AppText>
                </AppText>
                {isCreator && (
                  <AppText style={styles.paidBadge}>
                    💳 Paid ₹{parseFloat(expense.totalAmount).toFixed(2)}
                  </AppText>
                )}
              </View>
            </View>
            <View
              style={[
                styles.statusBadge,
                isSettled ? styles.statusSettled : styles.statusOwed,
              ]}
            >
              <AppText
                style={[
                  styles.statusText,
                  isSettled ? styles.statusTextSettled : styles.statusTextOwed,
                ]}
              >
                {isSettled ? '✅ Settled' : '🔴 Owes'}
              </AppText>
            </View>
          </View>
        );
      })}

      {/* Attachments Section */}
      <View style={styles.section}>
        <AppText style={styles.sectionTitle}>
          📎 Bills & Receipts ({attachments.length})
        </AppText>

        {attachments.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.attachmentsList}
          >
            {attachments.map((att: any) => {
              const isImage = att.contentType?.startsWith('image/');
              return (
                <TouchableOpacity
                  key={att.id}
                  style={styles.attachmentCard}
                  onPress={() => openAttachment(att.url)}
                >
                  {isImage ? (
                    <Image
                      source={{ uri: att.url }}
                      style={styles.attachmentImage}
                    />
                  ) : (
                    <View style={styles.attachmentPlaceholder}>
                      <AppText style={styles.attachmentPlaceholderIcon}>📄</AppText>
                    </View>
                  )}
                  <AppText style={styles.attachmentFilename} numberOfLines={1}>
                    {att.filename || 'Bill'}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : (
          <View style={styles.emptyAttachments}>
            <AppText style={styles.emptyAttachmentsIcon}>📷</AppText>
            <AppText style={styles.emptyAttachmentsText}>
              No bills uploaded yet
            </AppText>
          </View>
        )}

        {/* Upload Button */}
        <TouchableOpacity
          style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
          onPress={openExpenseImagePicker}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <AppText style={styles.uploadBtnIcon}>📷</AppText>
              <AppText style={styles.uploadBtnText}>Add Bill / Receipt</AppText>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
    {ExpenseImagePreviewModal}
    </>
  );
};

export default ExpenseDetail;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#ef4444' },
  listContent: { paddingBottom: 40 },

  // Header
  header: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerIcon: { marginBottom: 12 },
  headerIconText: { fontSize: 40 },
  headerNote: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'center',
  },
  headerAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#10b981',
    marginTop: 8,
  },
  headerCurrency: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 2,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  headerMetaText: { fontSize: 13, color: '#64748b' },
  headerMetaBold: { fontWeight: '700', color: '#475569' },
  headerDot: { marginHorizontal: 8, color: '#cbd5e1', fontSize: 13 },
  groupBadge: {
    marginTop: 12,
    backgroundColor: '#eef2ff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  groupBadgeText: { fontSize: 13, color: '#4f46e5', fontWeight: '600' },

  // Sections
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },

  // Group members
  membersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  memberChipAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  memberChipAvatarText: { fontSize: 12, fontWeight: '700', color: '#667eea' },
  memberChipName: { fontSize: 13, fontWeight: '600', color: '#475569' },

  // Shares
  shareCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  shareAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  shareAvatarText: { fontSize: 17, fontWeight: '700', color: '#667eea' },
  shareInfo: { flex: 1 },
  shareName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  shareEmail: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  shareAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  shareAmountLabel: { fontSize: 12, color: '#64748b' },
  shareAmountValue: { fontWeight: '700', color: '#1e293b' },
  paidBadge: {
    fontSize: 11,
    color: '#10b981',
    fontWeight: '600',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusSettled: { backgroundColor: '#f0fdf4' },
  statusOwed: { backgroundColor: '#fef2f2' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextSettled: { color: '#16a34a' },
  statusTextOwed: { color: '#dc2626' },

  // Attachments
  attachmentsList: { paddingVertical: 8, gap: 12 },
  attachmentCard: {
    width: 130,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  attachmentImage: { width: 130, height: 100, resizeMode: 'cover' },
  attachmentPlaceholder: {
    width: 130,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  attachmentPlaceholderIcon: { fontSize: 32 },
  attachmentFilename: {
    fontSize: 11,
    color: '#475569',
    padding: 8,
    fontWeight: '500',
  },
  emptyAttachments: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptyAttachmentsIcon: { fontSize: 32, marginBottom: 8 },
  emptyAttachmentsText: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
  },

  // Upload button
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
    shadowColor: '#667eea',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadBtnDisabled: { backgroundColor: '#94a3b8', shadowOpacity: 0 },
  uploadBtnIcon: { fontSize: 18 },
  uploadBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
