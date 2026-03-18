import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  FlatList,
  Image,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppText from '../components/AppText';
import AppTextInput from '../components/AppTextInput';
import {
  useGetGroups,
  useGetMyBalances,
  useCreateExpense,
  uploadExpenseAttachment,
} from '../services';
import { useAppSelector } from '../store/hooks';
import { useImagePickerWithCrop } from '../components/ImagePickerModal';
import Icon from '../components/Icon';
import { RootStackParamList } from '../navigations/RootStack';

const AddExpense = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAppSelector(state => state.auth);
  const [activeTab, setActiveTab] = useState<'expense' | 'settle'>('expense');

  // ============ ADD EXPENSE ============
  const { data: groupsData, loading: loadingGroups } = useGetGroups();
  const [createExpense, { loading: creating }] = useCreateExpense();
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [groupQuery, setGroupQuery] = useState('');
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [billUri, setBillUri] = useState<string | null>(null);
  const [uploadingBill, setUploadingBill] = useState(false);
  const groups = groupsData?.getGroups || [];

  const filteredGroups = groups.filter((g: any) =>
    g.name.toLowerCase().includes(groupQuery.trim().toLowerCase()),
  );

  const handleGroupQueryChange = (text: string) => {
    setGroupQuery(text);
    setShowGroupDropdown(true);

    const selectedGroup = groups.find((g: any) => g.id === selectedGroupId);
    if (selectedGroup && selectedGroup.name !== text) {
      setSelectedGroupId('');
    }
  };

  const handleSelectGroup = (group: any) => {
    setSelectedGroupId(group.id);
    setGroupQuery(group.name);
    setShowGroupDropdown(false);
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
    const group = groups.find((g: any) => g.id === selectedGroupId);
    if (!group) return;

    const participants = group.members.map((m: any) => m.user.id);
    if (!participants.includes(user?.id)) {
      participants.push(user?.id);
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

  // ============ SETTLE EXPENSE ============
  const {
    data: balancesData,
    loading: loadingBalances,
  } = useGetMyBalances();

  const oweList = balancesData?.getMyBalances?.oweList || [];
  const totalOwe = balancesData?.getMyBalances?.totalOwe || 0;

  // ============ RENDER ============
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Tab Switcher */}
        <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'expense' && styles.tabActive]}
          onPress={() => setActiveTab('expense')}
        >
          <AppText
            style={[
              styles.tabText,
              activeTab === 'expense' && styles.tabTextActive,
            ]}
          >
            Add Expense
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settle' && styles.tabActive]}
          onPress={() => setActiveTab('settle')}
        >
          <AppText
            style={[
              styles.tabText,
              activeTab === 'settle' && styles.tabTextActive,
            ]}
          >
            Settle Up
          </AppText>
        </TouchableOpacity>
        </View>

        {activeTab === 'expense' ? (
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
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
                
                {/* Invisible backdrop to catch clicks outside the dropdown */}
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
            <AppTextInput
              style={styles.input}
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              onFocus={() => setShowGroupDropdown(false)}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />

            <AppText style={styles.label}>Bill Attachment (Optional)</AppText>
            {billUri ? (
              <View style={styles.billPreviewContainer}>
                <Image source={{ uri: billUri }} style={styles.billPreviewImage} />
                <View style={styles.billPreviewActions}>
                  <TouchableOpacity
                    style={styles.billActionBtn}
                    onPress={openBillPicker}
                    disabled={creating || uploadingBill}
                  >
                    <AppText style={styles.billActionText}>Change</AppText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.billActionBtn, styles.billRemoveBtn]}
                    onPress={() => setBillUri(null)}
                    disabled={creating || uploadingBill}
                  >
                    <AppText style={styles.billRemoveText}>Remove</AppText>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.billUploadBtn}
                onPress={openBillPicker}
                disabled={creating || uploadingBill}
              >
                <AppText style={styles.billUploadBtnText}>Upload Bill</AppText>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.submitBtn,
                (!selectedGroupId || creating || uploadingBill) &&
                  styles.submitBtnDisabled,
              ]}
              onPress={handleCreate}
              disabled={!selectedGroupId || creating || uploadingBill}
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
            </TouchableWithoutFeedback>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            {/* Summary card */}
            <View style={styles.settleCard}>
              <AppText style={styles.settleCardTitle}>You Owe</AppText>
              {loadingBalances ? (
                <ActivityIndicator size="small" color="#dc2626" />
              ) : (
                <AppText style={styles.settleCardAmount}>
                  ₹{totalOwe.toFixed(2)}
                </AppText>
              )}
            </View>

            {loadingBalances ? (
              <View style={styles.balanceLoaderContainer}>
                <ActivityIndicator size="small" color="#667eea" />
                <AppText style={styles.balanceLoaderText}>
                  Loading balances...
                </AppText>
              </View>
            ) : oweList.length === 0 ? (
              <View style={styles.emptyState}>
                <AppText style={styles.emptyIcon}>🎉</AppText>
                <AppText style={styles.emptyTitle}>All Settled!</AppText>
                <AppText style={styles.emptySubtitle}>
                  You don't owe anyone right now.
                </AppText>
              </View>
            ) : (
              <>
                <AppText style={styles.label}>Select who to pay</AppText>
                <FlatList
                  data={oweList}
                  keyExtractor={(item: any) => item.userId}
                  scrollEnabled={false}
                  renderItem={({ item }: any) => (
                    <TouchableOpacity
                      style={[
                        styles.userCard,
                      ]}
                      onPress={() =>
                        navigation.navigate('SettleUserShares', {
                          toUserId: item.userId,
                          toUserName: item.userName,
                          totalAmount: item.amount,
                        })
                      }
                    >
                      <View style={styles.userAvatar}>
                        <AppText style={styles.userAvatarText}>
                          {item.userName?.charAt(0).toUpperCase() || '?'}
                        </AppText>
                      </View>
                      <View style={styles.userInfo}>
                        <AppText style={styles.userName}>{item.userName}</AppText>
                        <AppText style={styles.userAmount}>
                          ₹{item.amount.toFixed(2)}
                        </AppText>
                      </View>
                      <AppText style={styles.shareDetailsCta}>View</AppText>
                    </TouchableOpacity>
                  )}
                />
              </>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
      {BillImagePreviewModal}
    </SafeAreaView>
  );
};

export default AddExpense;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 24, paddingBottom: 60 },
  tabContentWrapper: { flex: 1 },
  // Tab switcher
  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#667eea',
  },
  tabText: {
    fontSize: 15,
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#667eea',
  },
  // Form
  label: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 8,
    marginTop: 16,
  },
  errorText: { color: '#ef4444', fontStyle: 'italic', marginBottom: 16 },
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
    marginTop: -8, // Half of icon height to perfectly center it
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownChevron: {
    fontSize: 16,
    color: '#64748b',
  },
  groupDropdownList: {
    position: 'absolute',
    top: 52, // Below the input
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
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#1e293b',
  },
  billUploadBtn: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#94a3b8',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  billUploadBtnText: {
    color: '#475569',
    fontSize: 14,
  },
  billPreviewContainer: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 10,
  },
  billPreviewImage: {
    width: '100%',
    height: 170,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  billPreviewActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 10,
  },
  billActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#eef2ff',
  },
  billActionText: {
    color: '#4f46e5',
    fontSize: 13,
  },
  billRemoveBtn: {
    backgroundColor: '#fee2e2',
  },
  billRemoveText: {
    color: '#dc2626',
    fontSize: 13,
  },
  submitBtn: {
    backgroundColor: '#10b981',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
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
  // Settle tab
  settleCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  settleCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 4,
  },
  settleCardAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#dc2626',
  },
  balanceLoaderContainer: {
    marginTop: 20,
    alignItems: 'center',
    gap: 8,
  },
  balanceLoaderText: {
    color: '#64748b',
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  emptySubtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: { fontSize: 18, fontWeight: '700', color: '#667eea' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  userAmount: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '600',
    marginTop: 2,
  },
  shareDetailsCta: { color: '#4f46e5', fontWeight: '700', fontSize: 13 },
});
