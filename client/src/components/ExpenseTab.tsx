import React, { useCallback, useState } from 'react';
import {
  ScrollView,
  View,
  TouchableWithoutFeedback,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Keyboard,
  StyleSheet,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import AppText from './AppText';
import AppTextInput from './AppTextInput';
import Icon from './Icon';
import { useGetGroups, useCreateExpense, uploadExpenseAttachment } from '../services';
import { useAppSelector } from '../store/hooks';
import { useImagePickerWithCrop } from './ImagePickerModal';

const ExpenseTab = () => {
  const { user } = useAppSelector(state => state.auth);

  // ============ HOOKS ============
  const { data: groupsData, loading: loadingGroups, refetch: refetchGroups } = useGetGroups();
  const [createExpense, { loading: creating }] = useCreateExpense();

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchGroups().catch(() => {});
    setRefreshing(false);
  }, [refetchGroups]);

  // ============ STATE ============
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupQuery, setGroupQuery] = useState('');
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [billUri, setBillUri] = useState<string | null>(null);
  const [uploadingBill, setUploadingBill] = useState(false);

  // Participant selection
  const [customParticipants, setCustomParticipants] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const groups = groupsData?.getGroups || [];

  const filteredGroups = groups.filter((g: any) =>
    g.name.toLowerCase().includes(groupQuery.trim().toLowerCase()),
  );

  const selectedGroup = groups.find((g: any) => g.id === selectedGroupId);
  const groupMembers: any[] = selectedGroup?.members?.map((m: any) => m.user) || [];

  // ============ HANDLERS ============
  const handleGroupQueryChange = (text: string) => {
    setGroupQuery(text);
    setShowGroupDropdown(true);

    const currentGroup = groups.find((g: any) => g.id === selectedGroupId);
    if (currentGroup && currentGroup.name !== text) {
      setSelectedGroupId('');
      setCustomParticipants(false);
      setSelectedParticipantIds([]);
    }
  };

  const handleSelectGroup = (group: any) => {
    setSelectedGroupId(group.id);
    setGroupQuery(group.name);
    setShowGroupDropdown(false);
    setCustomParticipants(false);
    setSelectedParticipantIds([]);
  };

  const toggleCustomParticipants = () => {
    const next = !customParticipants;
    setCustomParticipants(next);
    if (!next) {
      setSelectedParticipantIds([]);
    } else {
      // Pre-select current user
      if (user?.id) setSelectedParticipantIds([user.id]);
    }
  };

  const toggleParticipant = (memberId: string) => {
    // Current user is always included — prevent deselection
    if (memberId === user?.id) return;
    setSelectedParticipantIds(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId],
    );
  };

  const handleBillSelected = useCallback((uri: string) => {
    setBillUri(uri);
  }, []);

  const {
    handlePickImage: openBillPicker,
    ImagePreviewModal: BillImagePreviewModal,
  } = useImagePickerWithCrop({
    onImageSelected: handleBillSelected,
    cropShape: 'square',
  });

  const handleCreate = async () => {
    const numericAmount = parseFloat(amount);
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Description is required');
      return;
    }
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Validation Error', 'Amount must be greater than zero');
      return;
    }
    if (!selectedGroupId) {
      Alert.alert('Validation Error', 'Please select a group');
      return;
    }
    if (customParticipants && selectedParticipantIds.length === 0) {
      Alert.alert('Validation Error', 'Please select at least one participant');
      return;
    }

    const group = groups.find((g: any) => g.id === selectedGroupId);
    if (!group) return;

    let participants: string[];
    if (customParticipants) {
      participants = [...selectedParticipantIds];
      if (user?.id && !participants.includes(user.id)) {
        participants.push(user.id);
      }
    } else {
      participants = group.members.map((m: any) => m.user.id);
      if (user?.id && !participants.includes(user.id)) {
        participants.push(user.id);
      }
    }

    try {
      const result = await createExpense({
        variables: {
          groupId: selectedGroupId,
          description: description.trim(),
          amount: numericAmount,
          participants,
        },
      });

      const createdExpenseId = result?.data?.createExpense?.id;

      if (billUri && createdExpenseId) {
        setUploadingBill(true);
        await uploadExpenseAttachment(billUri, createdExpenseId);
      }

      setDescription('');
      setAmount('');
      setSelectedGroupId('');
      setGroupQuery('');
      setBillUri(null);
      setCustomParticipants(false);
      setSelectedParticipantIds([]);

      Alert.alert(
        'Success',
        billUri
          ? 'Expense added and bill uploaded successfully!'
          : 'Expense added successfully!',
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to add expense');
    } finally {
      setUploadingBill(false);
    }
  };

  const isFormValid =
    selectedGroupId !== '' &&
    description.trim().length > 0 &&
    parseFloat(amount) > 0 &&
    (!customParticipants || selectedParticipantIds.length > 0);

  // ============ RENDER ============
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.flex1}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onScrollBeginDrag={() => {
          setShowGroupDropdown(false);
          Keyboard.dismiss();
        }}
      >
        <TouchableWithoutFeedback onPress={() => {
          setShowGroupDropdown(false);
          Keyboard.dismiss();
        }}>
          <View style={styles.tabContentWrapper}>

            <AppText style={styles.label}>Select Group</AppText>

            {showGroupDropdown && (
              <TouchableWithoutFeedback onPress={() => setShowGroupDropdown(false)}>
                <View style={styles.dropdownBackdrop} />
              </TouchableWithoutFeedback>
            )}

            <View style={styles.dropdownInputWrapper}>
              <AppTextInput
                style={styles.dropdownInput}
                value={groupQuery}
                onChangeText={handleGroupQueryChange}
                onFocus={() => {
                  if (!loadingGroups && groups.length > 0) {
                    setShowGroupDropdown(true);
                  }
                }}
                placeholder={
                  loadingGroups
                    ? 'Loading groups...'
                    : groups.length > 0
                    ? 'Search group'
                    : 'No groups available'
                }
                editable={!loadingGroups && groups.length > 0}
                placeholderTextColor="#94a3b8"
              />

              {loadingGroups ? (
                <View style={styles.dropdownRightIcon}>
                  <ActivityIndicator size="small" color="#667eea" />
                </View>
              ) : (
                <View style={styles.dropdownRightIcon}>
                  <Icon name="DownArrow" width={16} height={16} color="#64748b" />
                </View>
              )}

              {!loadingGroups && showGroupDropdown && groups.length > 0 && (
                <View style={styles.groupDropdownList}>
                  {filteredGroups.length > 0 ? (
                    <ScrollView
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                      style={styles.groupDropdownScroll}
                    >
                      {filteredGroups.map((group: any) => {
                        const isSelected = selectedGroupId === group.id;
                        return (
                          <TouchableOpacity
                            key={group.id}
                            style={[
                              styles.groupOption,
                              isSelected && styles.groupOptionSelected,
                            ]}
                            onPress={() => handleSelectGroup(group)}
                          >
                            <AppText
                              style={[
                                styles.groupOptionText,
                                isSelected && styles.groupOptionTextSelected,
                              ]}
                            >
                              {group.name}
                            </AppText>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  ) : (
                    <AppText style={styles.noGroupFoundText}>No group found</AppText>
                  )}
                </View>
              )}
            </View>

            {!loadingGroups && groups.length === 0 && (
              <AppText style={styles.errorText}>
                You need to join a group first.
              </AppText>
            )}

            {/* ── Custom Participants Toggle ── */}
            {selectedGroupId ? (
              <View style={styles.participantToggleRow}>
                <TouchableOpacity
                  style={styles.checkRow}
                  onPress={toggleCustomParticipants}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, customParticipants && styles.checkboxChecked]}>
                    {customParticipants && <AppText style={styles.checkboxTick}>✓</AppText>}
                  </View>
                  <AppText style={styles.checkLabel}>
                    Not everyone is included in this expense
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.infoBtn}
                  onPress={() => setShowInfoModal(true)}
                  activeOpacity={0.7}
                >
                  <AppText style={styles.infoBtnText}>i</AppText>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* ── Member Chips ── */}
            {customParticipants && groupMembers.length > 0 && (
              <View style={styles.participantsContainer}>
                <AppText style={styles.participantsHint}>
                  Tap to select participants (you're always included)
                </AppText>
                <View style={styles.chipsWrap}>
                  {groupMembers.map((member: any) => {
                    const isCurrentUser = member.id === user?.id;
                    const isSelected = selectedParticipantIds.includes(member.id);
                    return (
                      <TouchableOpacity
                        key={member.id}
                        style={[
                          styles.chip,
                          isSelected && styles.chipSelected,
                          isCurrentUser && styles.chipYou,
                        ]}
                        onPress={() => toggleParticipant(member.id)}
                        activeOpacity={isCurrentUser ? 1 : 0.7}
                      >
                        <View style={styles.chipAvatarWrap}>
                          <View style={[styles.chipAvatar, isSelected && styles.chipAvatarSelected]}>
                            {!isSelected && (
                              <AppText style={[styles.chipAvatarText, isSelected && styles.chipAvatarTextSelected]}>
                                {(member.name || member.username)?.charAt(0).toUpperCase() || '?'}
                              </AppText>
                            )}
                          </View>
                          {isSelected && (
                            <View style={styles.chipAvatarCheck}>
                              <AppText style={styles.chipAvatarCheckText}>✓</AppText>
                            </View>
                          )}
                        </View>
                        <AppText style={[styles.chipName, isSelected && styles.chipNameSelected]}>
                          {isCurrentUser ? 'You' : (member.name || member.username)}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <AppText style={styles.label}>Description</AppText>
            <AppTextInput
              style={styles.input}
              placeholder="What was this for? (e.g. Dinner)"
              value={description}
              onChangeText={setDescription}
              onFocus={() => setShowGroupDropdown(false)}
              placeholderTextColor="#999"
            />

            <AppText style={styles.label}>Amount</AppText>
            <View style={styles.amountInputWrap}>
              <AppText style={styles.amountPrefix}>₹</AppText>
              <AppTextInput
                style={styles.amountInput}
                placeholder="0"
                value={amount}
                onChangeText={(text) => setAmount(text.replace(/[^0-9]/g, ''))}
                onFocus={() => setShowGroupDropdown(false)}
                keyboardType="number-pad"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.attachmentHeaderRow}>
              <AppText style={[styles.label, styles.labelNoMargin]}>
                Bill Attachment (Optional)
              </AppText>
              {billUri && (
                <TouchableOpacity
                  style={styles.billRemoveBtnInline}
                  onPress={() => setBillUri(null)}
                  disabled={creating || uploadingBill}
                >
                  <AppText style={styles.billRemoveText}>Remove</AppText>
                </TouchableOpacity>
              )}
            </View>

            {billUri ? (
              <View style={styles.attachmentCard}>
                <TouchableOpacity onPress={() => openBillPicker()}>
                  <Image source={{ uri: billUri }} style={styles.attachmentImage} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.attachmentCard, styles.attachmentPlaceholder]}
                onPress={openBillPicker}
                disabled={creating || uploadingBill}
              >
                <View style={styles.attachmentPlaceholderIcon}>
                  <Icon name="Bill" width={32} height={32} color="#94a3b8" />
                </View>
                <AppText style={styles.attachmentFilename} numberOfLines={1}>
                  Upload Bill
                </AppText>
                </TouchableOpacity>
              )}

            </View>
          </TouchableWithoutFeedback>
        </ScrollView>

      <View style={styles.stickyFooter}>
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!isFormValid || creating || uploadingBill) && styles.submitBtnDisabled,
          ]}
          onPress={handleCreate}
          disabled={!isFormValid || creating || uploadingBill}
        >
          {creating || uploadingBill ? (
            <View style={styles.submitLoadingRow}>
              <ActivityIndicator size="small" color="#fff" />
              <AppText style={styles.submitBtnText}>
                {uploadingBill ? 'Uploading bill...' : 'Saving...'}
              </AppText>
            </View>
          ) : (
            <AppText style={styles.submitBtnText}>Save Expense</AppText>
          )}
        </TouchableOpacity>
      </View>

      {BillImagePreviewModal}

      {/* ── Info Modal ── */}
      <Modal
        visible={showInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowInfoModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <View style={styles.modalIconWrap}>
                  <AppText style={styles.modalIcon}>💡</AppText>
                </View>
                <AppText style={styles.modalTitle}>Custom Participants</AppText>
                <AppText style={styles.modalBody}>
                  By default, all group members share this expense equally. Enable this option when only some members were part of the expense — for example, a meal where not everyone attended.
                  {'\n\n'}
                  You will always be included as a participant.
                </AppText>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setShowInfoModal(false)}
                >
                  <AppText style={styles.modalCloseBtnText}>Got it</AppText>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flex1: {
    flex: 1,
  },
  stickyFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  scroll: { paddingHorizontal: 24, paddingBottom: 40 },
  tabContentWrapper: { flex: 1 },
  label: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 8,
    marginTop: 16,
  },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 4 },
  dropdownBackdrop: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    zIndex: 999,
    backgroundColor: 'transparent',
  },
  dropdownInputWrapper: {
    position: 'relative',
    zIndex: 1000,
    elevation: 5,
  },
  dropdownInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 12,
    paddingRight: 42,
  },
  dropdownRightIcon: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownChevron: {
    fontSize: 16,
    color: '#64748b',
  },
  groupDropdownList: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    maxHeight: 190,
    overflow: 'hidden',
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  groupDropdownScroll: {
    maxHeight: 190,
  },
  groupOption: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  groupOptionSelected: {
    backgroundColor: '#eef2ff',
  },
  groupOptionText: {
    color: '#1e293b',
    fontSize: 15,
  },
  groupOptionTextSelected: {
    color: '#4f46e5',
  },
  noGroupFoundText: {
    color: '#94a3b8',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  // ── Participant toggle ──
  participantToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  checkboxTick: {
    color: '#fff',
    fontSize: 11,
  },
  checkLabel: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
    flexWrap: 'wrap',
  },
  infoBtn: {
    width: 20,
    height: 20,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#94a3b8',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  infoBtnText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    fontWeight: '700',
    lineHeight: 14,
  },

  // ── Member chips ──
  participantsContainer: {
    marginTop: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
  },
  participantsHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 12,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 6,
  },
  chipSelected: {
    borderColor: '#4f46e5',
    backgroundColor: '#eef2ff',
  },
  chipYou: {
    borderColor: '#4f46e5',
    backgroundColor: '#eef2ff',
    opacity: 0.8,
  },
  chipAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipAvatarSelected: {
    backgroundColor: '#c7d2fe',
  },
  chipAvatarText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
  },
  chipAvatarTextSelected: {
    color: '#4f46e5',
  },
  chipName: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '400',
  },
  chipNameSelected: {
    color: '#4f46e5',
    fontWeight: '500',
  },
  chipAvatarWrap: {
    position: 'relative',
  },
  chipAvatarCheck: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 13,
    backgroundColor: 'rgba(79, 70, 229, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipAvatarCheckText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Form ──
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    backgroundColor: '#fff',
    color: '#1e293b',
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
  },
  amountPrefix: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '600',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 13,
    color: '#1e293b',
  },
  attachmentCard: {
    width: '100%',
    marginBottom: 12,
  },
  attachmentPlaceholder: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#94a3b8',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  attachmentPlaceholderIcon: {
    marginBottom: 6,
  },
  attachmentImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  attachmentFilename: {
    fontSize: 13,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  attachmentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  labelNoMargin: {
    marginTop: 0,
    marginBottom: 0,
  },
  billRemoveBtnInline: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  billRemoveText: {
    color: '#dc2626',
    fontSize: 11,
  },
  submitBtn: {
    backgroundColor: '#10b981',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { backgroundColor: '#94a3b8', shadowOpacity: 0 },
  submitBtnText: { color: '#fff', fontSize: 15 },
  submitLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  // ── Info Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconWrap: {
    marginBottom: 12,
  },
  modalIcon: {
    fontSize: 36,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 10,
  },
  modalBody: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalCloseBtn: {
    backgroundColor: '#4f46e5',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  modalCloseBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default ExpenseTab;