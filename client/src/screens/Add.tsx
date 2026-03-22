import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppText from '../components/AppText';
import {
  useGetGroups,
  useGetMyBalances,
  useCreateExpense,
  uploadExpenseAttachment,
} from '../services';
import { useAppSelector } from '../store/hooks';
import { useImagePickerWithCrop } from '../components/ImagePickerModal';
import { RootStackParamList } from '../navigations/RootStack';
import ExpenseTab from '../components/ExpenseTab';
import SettleTab from '../components/SettleTab';

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
          <ExpenseTab
            styles={styles}
            showGroupDropdown={showGroupDropdown}
            setShowGroupDropdown={setShowGroupDropdown}
            loadingGroups={loadingGroups}
            groups={groups}
            filteredGroups={filteredGroups}
            selectedGroupId={selectedGroupId}
            setSelectedGroupId={setSelectedGroupId}
            groupQuery={groupQuery}
            setGroupQuery={setGroupQuery}
            handleGroupQueryChange={handleGroupQueryChange}
            handleSelectGroup={handleSelectGroup}
            description={description}
            setDescription={setDescription}
            amount={amount}
            setAmount={setAmount}
            billUri={billUri}
            setBillUri={setBillUri}
            openBillPicker={openBillPicker}
            creating={creating}
            uploadingBill={uploadingBill}
            handleCreate={handleCreate}
          />
        ) : (
          <SettleTab
            styles={styles}
            loadingBalances={loadingBalances}
            totalOwe={totalOwe}
            oweList={oweList}
            navigation={navigation}
          />
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
