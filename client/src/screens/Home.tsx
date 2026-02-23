import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '../store/hooks';
import ProfileCard from '../components/ProfileCard';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  GET_RECENT_ACTIVITIES,
  GET_GROUPS,
  GET_MY_INVITES,
  GET_MY_BALANCES,
  SETTLE_EXPENSE,
  RESPOND_TO_INVITE,
} from '../graphql';

const Home: React.FC = () => {
  const { user } = useAppSelector(state => state.auth);
  const { data, loading, refetch } = useQuery<any>(GET_RECENT_ACTIVITIES, {
    fetchPolicy: 'cache-and-network',
  });

  const { data: groupsData } = useQuery<any>(GET_GROUPS, {
    fetchPolicy: 'cache-and-network',
  });

  const { data: invitesData, refetch: refetchInvites } = useQuery<any>(
    GET_MY_INVITES,
    {
      fetchPolicy: 'cache-and-network',
    },
  );

  const [settleExpense, { loading: settling }] = useMutation<any>(
    SETTLE_EXPENSE,
    {
      onCompleted: () => {
        Alert.alert('Success', 'Expense settled successfully!');
        setModalVisible(false);
        setAmount('');
        refetch();
      },
      onError: (err: any) => {
        Alert.alert('Error', err.message);
      },
    },
  );

  const [respondToInvite] = useMutation<any>(RESPOND_TO_INVITE, {
    onCompleted: () => {
      refetchInvites();
      Alert.alert('Success', 'Invitation updated!');
    },
    onError: (err: any) => {
      Alert.alert('Error', err.message);
    },
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash');

  const activities = data?.getRecentActivities || [];
  const groups = groupsData?.getGroups || [];
  const invites = invitesData?.getMyInvites || [];

  // Fetch server-computed balances
  const { data: balancesData } = useQuery<any>(GET_MY_BALANCES, {
    fetchPolicy: 'cache-and-network',
  });
  const totalOwe = balancesData?.getMyBalances?.totalOwe || 0;
  const totalOwed = balancesData?.getMyBalances?.totalOwed || 0;

  // Show loading state while user data is being fetched
  if (!user) {
    return (
      <SafeAreaView style={styles.center}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      </SafeAreaView>
    );
  }

  const handleSettle = () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Validation Error', 'Amount must be greater than zero');
      return;
    }
    const validModes = ['cash', 'upi', 'bank', 'card'];
    if (!validModes.includes(paymentMode.toLowerCase())) {
      Alert.alert(
        'Validation Error',
        'Invalid payment mode. Use cash, upi, bank, or card.',
      );
      return;
    }
    settleExpense({
      variables: {
        toUserId: selectedUserId,
        amount: numAmount,
        paymentMode: paymentMode.toLowerCase(),
      },
    });
  };

  const openSettleModal = (toUserId: string, defaultAmount: number) => {
    setSelectedUserId(toUserId);
    setAmount(defaultAmount.toString());
    setModalVisible(true);
  };

  const handleAcceptInvite = (inviteId: string) => {
    respondToInvite({ variables: { inviteId, accept: true } });
  };

  const handleRejectInvite = (inviteId: string) => {
    Alert.alert('Reject Invite', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () =>
          respondToInvite({ variables: { inviteId, accept: false } }),
      },
    ]);
  };

  const renderActivity = ({ item }: { item: any }) => {
    const myShare = item.shares?.find((s: any) => s.user?.id === user.id);
    const payer = item.createdBy;
    const isPayer = payer.id === user.id;

    const description = isPayer
      ? `You paid ₹${item.totalAmount} for ${item.note}`
      : `${payer.name} paid ₹${item.totalAmount} for ${item.note}`;

    const owedText = isPayer
      ? `You are owed ₹${item.totalAmount - (myShare?.shareAmount || 0)}`
      : `You owe ₹${myShare?.shareAmount || 0}`;

    return (
      <View style={styles.activityCard}>
        <View style={styles.activityContent}>
          <Text style={styles.activityDesc}>{description}</Text>
          <Text
            style={[
              styles.activityOwed,
              isPayer ? styles.activityOwedGreen : styles.activityOwedRed,
            ]}
          >
            {owedText}
          </Text>
          <Text style={styles.activityDate}>
            {new Date(Number(item.createdAt)).toLocaleDateString()}
          </Text>
        </View>
        {!isPayer && myShare?.status === 'owed' && (
          <TouchableOpacity
            style={styles.settleBtn}
            onPress={() => openSettleModal(payer.id, myShare.shareAmount)}
          >
            <Text style={styles.settleText}>Settle</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const listHeader = (
    <View style={styles.content}>
      <ProfileCard
        name={user.name}
        email={user.email}
        imageUrl={user.imageUrl}
        groupsCount={groups.length}
        amountOwe={`₹${totalOwe.toFixed(0)}`}
        amountOwed={`₹${totalOwed.toFixed(0)}`}
      />

      {/* Spending Chart */}
      {activities.length > 0 &&
        (() => {
          // Build last 7 days spending data
          const days: { label: string; amount: number }[] = [];
          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dayLabel = d.toLocaleDateString([], { weekday: 'short' });
            const dayStr = d.toDateString();
            let dayTotal = 0;
            activities.forEach((exp: any) => {
              const expDate = new Date(Number(exp.createdAt));
              if (expDate.toDateString() === dayStr) {
                const myShare = exp.shares?.find(
                  (s: any) => s.userId === user.id,
                );
                if (myShare) dayTotal += parseFloat(myShare.shareAmount) || 0;
              }
            });
            days.push({ label: dayLabel, amount: dayTotal });
          }
          const maxAmount = Math.max(...days.map(d => d.amount), 1);

          return (
            <View style={styles.chartContainer}>
              <Text style={styles.chartTitle}>📊 Spending (Last 7 Days)</Text>
              <View style={styles.chartBars}>
                {days.map((day, idx) => (
                  <View key={idx} style={styles.chartBarCol}>
                    <View style={styles.chartBarTrack}>
                      <View
                        style={[
                          styles.chartBar,
                          {
                            height: `${Math.max(
                              (day.amount / maxAmount) * 100,
                              4,
                            )}%`,
                          },
                        ]}
                      />
                    </View>
                    {day.amount > 0 && (
                      <Text style={styles.chartBarAmount}>
                        ₹{day.amount.toFixed(0)}
                      </Text>
                    )}
                    <Text style={styles.chartBarLabel}>{day.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })()}

      {/* Pending Invitations */}
      {invites.length > 0 && (
        <View style={styles.invitesSection}>
          <Text style={styles.invitesSectionTitle}>
            📬 Pending Invitations ({invites.length})
          </Text>
          {invites.map((invite: any) => (
            <View key={invite.id} style={styles.inviteCard}>
              <View style={styles.inviteInfo}>
                <Text style={styles.inviteGroupName}>
                  {invite.group?.name || 'Unknown Group'}
                </Text>
                <Text style={styles.inviteMembers}>
                  {invite.group?.members?.length || 0} members
                </Text>
              </View>
              <View style={styles.inviteActions}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  onPress={() => handleAcceptInvite(invite.id)}
                >
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleRejectInvite(invite.id)}
                >
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {activities.length === 0 && !loading && (
        <View style={styles.placeholderSection}>
          <Text style={styles.placeholderText}>
            No recent activities found.
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={activities}
        keyExtractor={(item: any) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => {
              refetch();
              refetchInvites();
            }}
          />
        }
        ListHeaderComponent={listHeader}
        renderItem={renderActivity}
        contentContainerStyle={styles.listContainer}
      />

      <Modal visible={modalVisible} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Settle Expense</Text>

            <Text style={styles.label}>Amount to Pay</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />

            <Text style={styles.label}>
              Payment Mode (cash, upi, bank, card)
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. upi"
              value={paymentMode}
              onChangeText={setPaymentMode}
              autoCapitalize="none"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.btn, styles.btnCancel]}
                onPress={() => setModalVisible(false)}
                disabled={settling}
              >
                <Text style={styles.btnTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnCreate]}
                onPress={handleSettle}
                disabled={settling}
              >
                <Text style={styles.btnTextCreate}>
                  {settling ? 'Settling...' : 'Settle Now'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { paddingHorizontal: 15, paddingTop: 10 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginVertical: 16,
    paddingHorizontal: 15,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    alignItems: 'center',
  },
  activityDesc: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
    marginBottom: 4,
  },
  activityOwed: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  activityDate: { fontSize: 12, color: '#94a3b8' },
  activityOwedGreen: { color: '#10b981' },
  activityOwedRed: { color: '#ef4444' },
  activityContent: { flex: 1 },
  settleBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  settleText: { color: '#fff', fontWeight: 'bold' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingContainer: { alignItems: 'center', padding: 32 },
  placeholderSection: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
    marginHorizontal: 15,
  },
  placeholderText: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic' },
  // Invitations
  invitesSection: {
    marginTop: 16,
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  invitesSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 12,
  },
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  inviteInfo: { flex: 1 },
  inviteGroupName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  inviteMembers: { fontSize: 12, color: '#64748b', marginTop: 2 },
  inviteActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  rejectBtn: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  rejectBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 13 },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
    color: '#1e293b',
  },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  btn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  btnCancel: { backgroundColor: '#f1f5f9' },
  btnCreate: { backgroundColor: '#10b981' },
  btnTextCancel: { color: '#475569', fontWeight: '700', fontSize: 15 },
  btnTextCreate: { color: '#fff', fontWeight: '700', fontSize: 15 },
  listContainer: { paddingBottom: 40 },
  // Spending chart
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 120,
  },
  chartBarCol: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  chartBarTrack: {
    width: '100%',
    height: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  chartBar: {
    width: '65%',
    backgroundColor: '#667eea',
    borderRadius: 4,
    minHeight: 4,
  },
  chartBarAmount: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '600',
    marginTop: 4,
  },
  chartBarLabel: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
    marginTop: 2,
  },
});

export default Home;
