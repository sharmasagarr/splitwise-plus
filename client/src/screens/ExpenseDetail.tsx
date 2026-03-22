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
import Icon from '../components/Icon';

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
    ImagePreviewModal: ExpenseImagePreviewModal,
  } = useImagePickerWithCrop({
    onImageSelected: handleUploadExpenseAttachmentDirect,
    cropShape: 'square',
  });

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
          {expense.currency === 'INR' ? '₹' : expense.currency || '₹'}
          {parseFloat(expense.totalAmount).toFixed(2)}
        </AppText>
        <View style={styles.headerMeta}>
          <AppText style={styles.headerMetaText}>
            Paid by{' '}
            <AppText style={styles.headerMetaBold}>
              {expense.createdBy.id === user?.id
                ? 'You'
                : expense.createdBy.name.split(' ')[0]}
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


      {/* Split Breakdown */}
      <View style={styles.section}>
        <Icon name="Rupee" width={18} height={18} color="#475569" />
        <AppText style={styles.sectionTitle}>
          Split Breakdown ({expense.shares.length} people)
        </AppText>
      </View>

      {expense.shares.map((share: any) => {
        const isCreator = share.userId === expense.createdById;
        const isMe = share.userId === user?.id;
        const isSettled = share.status === 'settled';

        return (
          <View
            key={share.id}
            style={[styles.shareCard, isSettled && styles.shareCardSettled]}
          >
            {isSettled && (
              <View style={styles.tiltedPaidBadge}>
                <AppText style={styles.tiltedPaidText}>PAID</AppText>
              </View>
            )}
            <View style={styles.shareAvatar}>
              {share.user.imageUrl ? (
                <Image
                  source={{ uri: share.user.imageUrl }}
                  style={styles.shareAvatarImage}
                  resizeMode="cover"
                />
              ) : (
                <AppText style={styles.shareAvatarText}>
                  {share.user.name.charAt(0).toUpperCase()}
                </AppText>
              )}
            </View>
            <View style={styles.shareInfo}>
              <AppText style={styles.shareName}>
                {isMe ? 'You' : share.user.name}
              </AppText>
              <AppText style={styles.shareUsername}>@{share.user.username}</AppText>
            </View>
            <View>
              <AppText style={styles.shareAmountLabel}>
                Share:{' '}
                <AppText style={styles.shareAmountValue}>
                  {expense.currency === 'INR' ? '₹' : expense.currency || '₹'}{parseFloat(share.shareAmount).toFixed(2)}
                </AppText>
              </AppText>
              {isCreator && (
                <AppText style={styles.paidBadge}>
                  💳 Paid {expense.currency === 'INR' ? '₹' : expense.currency || '₹'}{parseFloat(expense.totalAmount).toFixed(2)}
                </AppText>
              )}
            </View>
          </View>
        );
      })}

      {/* Attachments Section */}
      <View style={styles.section}>
        <Icon name="Attacment" width={18} height={18} color="#475569" />
        <AppText style={styles.sectionTitle}>
          Bills & Receipts ({attachments.length})
        </AppText>
      </View>
      <View style={styles.billsSection}>
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
            <Icon name="Bill" width={35} height={35} color="#94a3b8" style={styles.emptyAttachmentsIcon} />
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
              <Icon name="Bill" width={25} height={25} color="#fff" />
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
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  headerAmount: {
    fontSize: 36,
    fontWeight: '700',
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
  section: { 
    paddingHorizontal: 16, 
    paddingTop: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  billsSection: {
    paddingHorizontal: 16,
  },

  shareAvatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },

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
    overflow: 'hidden',
  },
  shareCardSettled: {
    borderColor: '#10b981',
    borderWidth: 1.5,
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
  shareAvatarText: { fontSize: 17, fontWeight: '500', color: '#667eea' },
  shareInfo: { flex: 1 },
  shareName: { fontSize: 15, fontWeight: '500', color: '#1e293b' },
  shareUsername: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
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
  tiltedPaidBadge: {
    position: 'absolute',
    top: 5,
    right: -22,
    backgroundColor: '#10b981',
    paddingVertical: 2,
    paddingHorizontal: 20,
    transform: [{ rotate: '45deg' }],
    zIndex: 10,
  },
  tiltedPaidText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 1,
  },

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
    padding: 10,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
    shadowColor: '#667eea',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadBtnDisabled: { backgroundColor: '#94a3b8', shadowOpacity: 0 },
  uploadBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
