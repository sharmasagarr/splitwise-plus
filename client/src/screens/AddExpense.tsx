import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  FlatList,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  CREATE_EXPENSE,
  GET_GROUPS,
  GET_MY_BALANCES,
  SETTLE_EXPENSE,
  GET_RECENT_ACTIVITIES,
} from '../graphql';
import { useAppSelector } from '../store/hooks';

const AddExpense = () => {
  const { user } = useAppSelector(state => state.auth);
  const [activeTab, setActiveTab] = useState<'expense' | 'settle'>('expense');

  // ============ ADD EXPENSE ============
  const { data: groupsData, loading: loadingGroups } =
    useQuery<any>(GET_GROUPS);
  const [createExpense, { loading: creating }] = useMutation<any>(
    CREATE_EXPENSE,
    {
      refetchQueries: [
        { query: GET_MY_BALANCES },
        { query: GET_RECENT_ACTIVITIES },
      ],
      onCompleted: () => {
        Alert.alert('Success', 'Expense added successfully!');
        setDescription('');
        setAmount('');
        setSelectedGroupId('');
      },
      onError: (err: any) => {
        Alert.alert('Error', err.message);
      },
    },
  );
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const groups = groupsData?.getGroups || [];

  const handleCreate = () => {
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
    createExpense({
      variables: {
        groupId: selectedGroupId,
        description: description.trim(),
        amount: numericAmount,
        participants,
      },
    });
  };

  // ============ SETTLE EXPENSE ============
  const {
    data: balancesData,
    loading: loadingBalances,
    refetch: refetchBalances,
  } = useQuery<any>(GET_MY_BALANCES, { fetchPolicy: 'cache-and-network' });

  const [settleExpense, { loading: settling }] = useMutation<any>(
    SETTLE_EXPENSE,
    {
      refetchQueries: [
        { query: GET_MY_BALANCES },
        { query: GET_RECENT_ACTIVITIES },
      ],
      onCompleted: () => {
        Alert.alert('Success', 'Settlement recorded!');
        setSettleAmount('');
        setSelectedSettleUserId('');
        setSelectedPaymentMode('upi');
        refetchBalances();
      },
      onError: (err: any) => {
        Alert.alert('Error', err.message);
      },
    },
  );

  const [selectedSettleUserId, setSelectedSettleUserId] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState('upi');

  const oweList = balancesData?.getMyBalances?.oweList || [];
  const totalOwe = balancesData?.getMyBalances?.totalOwe || 0;

  const handleSettle = () => {
    const numericAmount = parseFloat(settleAmount);
    if (!selectedSettleUserId) {
      Alert.alert('Error', 'Please select who you are paying');
      return;
    }
    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert('Error', 'Amount must be greater than zero');
      return;
    }
    settleExpense({
      variables: {
        toUserId: selectedSettleUserId,
        amount: numericAmount,
        paymentMode: selectedPaymentMode,
      },
    });
  };

  if (loadingGroups || loadingBalances) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#667eea" size="large" />
      </View>
    );
  }

  // ============ RENDER ============
  return (
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
          <Text
            style={[
              styles.tabText,
              activeTab === 'expense' && styles.tabTextActive,
            ]}
          >
            Add Expense
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settle' && styles.tabActive]}
          onPress={() => setActiveTab('settle')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'settle' && styles.tabTextActive,
            ]}
          >
            Settle Up
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'expense' ? (
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.label}>Select Group</Text>
          {groups.length === 0 ? (
            <Text style={styles.errorText}>
              You need to join a group first.
            </Text>
          ) : (
            <View style={styles.groupSelection}>
              {groups.map((g: any) => (
                <TouchableOpacity
                  key={g.id}
                  style={[
                    styles.groupBtn,
                    selectedGroupId === g.id && styles.groupBtnSelected,
                  ]}
                  onPress={() => setSelectedGroupId(g.id)}
                >
                  <Text
                    style={[
                      styles.groupBtnText,
                      selectedGroupId === g.id && styles.groupBtnTextSelected,
                    ]}
                  >
                    {g.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={styles.input}
            placeholder="What was this for? (e.g. Dinner)"
            value={description}
            onChangeText={setDescription}
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholderTextColor="#999"
          />

          <TouchableOpacity
            style={[
              styles.submitBtn,
              (!selectedGroupId || creating) && styles.submitBtnDisabled,
            ]}
            onPress={handleCreate}
            disabled={!selectedGroupId || creating}
          >
            <Text style={styles.submitBtnText}>
              {creating ? 'Saving...' : 'Save Expense'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Summary card */}
          <View style={styles.settleCard}>
            <Text style={styles.settleCardTitle}>You Owe</Text>
            <Text style={styles.settleCardAmount}>₹{totalOwe.toFixed(2)}</Text>
          </View>

          {oweList.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🎉</Text>
              <Text style={styles.emptyTitle}>All Settled!</Text>
              <Text style={styles.emptySubtitle}>
                You don't owe anyone right now.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.label}>Select who to pay</Text>
              <FlatList
                data={oweList}
                keyExtractor={(item: any) => item.userId}
                scrollEnabled={false}
                renderItem={({ item }: any) => (
                  <TouchableOpacity
                    style={[
                      styles.userCard,
                      selectedSettleUserId === item.userId &&
                        styles.userCardSelected,
                    ]}
                    onPress={() => {
                      setSelectedSettleUserId(item.userId);
                      setSettleAmount(String(item.amount));
                    }}
                  >
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>
                        {item.userName?.charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.userName}</Text>
                      <Text style={styles.userAmount}>
                        ₹{item.amount.toFixed(2)}
                      </Text>
                    </View>
                    {selectedSettleUserId === item.userId && (
                      <Text style={styles.checkMark}>✓</Text>
                    )}
                  </TouchableOpacity>
                )}
              />

              {selectedSettleUserId ? (
                <>
                  <Text style={styles.label}>Amount to Settle</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    value={settleAmount}
                    onChangeText={setSettleAmount}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />

                  <Text style={styles.label}>Payment Mode</Text>
                  <View style={styles.paymentModes}>
                    {['upi', 'cash', 'bank', 'card'].map(mode => (
                      <TouchableOpacity
                        key={mode}
                        style={[
                          styles.modeBtn,
                          selectedPaymentMode === mode &&
                            styles.modeBtnSelected,
                        ]}
                        onPress={() => setSelectedPaymentMode(mode)}
                      >
                        <Text
                          style={[
                            styles.modeBtnText,
                            selectedPaymentMode === mode &&
                              styles.modeBtnTextSelected,
                          ]}
                        >
                          {mode.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.settleBtn,
                      settling && styles.submitBtnDisabled,
                    ]}
                    onPress={handleSettle}
                    disabled={settling}
                  >
                    <Text style={styles.settleBtnText}>
                      {settling ? 'Settling...' : '✓ Settle Up'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </>
          )}
        </ScrollView>
      )}
    </KeyboardAvoidingView>
  );
};

export default AddExpense;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { padding: 24, paddingBottom: 60 },
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
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#667eea',
  },
  // Form
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
    marginTop: 16,
  },
  errorText: { color: '#ef4444', fontStyle: 'italic', marginBottom: 16 },
  groupSelection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  groupBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  groupBtnSelected: { backgroundColor: '#667eea', borderColor: '#4f46e5' },
  groupBtnText: { color: '#475569', fontWeight: '600' },
  groupBtnTextSelected: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#1e293b',
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
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
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
  userCardSelected: {
    borderColor: '#667eea',
    backgroundColor: '#eef2ff',
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
  checkMark: { fontSize: 20, color: '#667eea', fontWeight: '700' },
  paymentModes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  modeBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#e2e8f0',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  modeBtnSelected: { backgroundColor: '#667eea', borderColor: '#4f46e5' },
  modeBtnText: { color: '#475569', fontWeight: '600' },
  modeBtnTextSelected: { color: '#fff' },
  settleBtn: {
    backgroundColor: '#667eea',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#667eea',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  settleBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
