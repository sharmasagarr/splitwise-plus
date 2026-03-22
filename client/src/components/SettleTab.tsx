import React from 'react';
import {
  ScrollView,
  View,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppText from './AppText';
import { useGetMyBalances } from '../services';

const SettleTab = () => {
  const navigation = useNavigation<any>();

  // ============ HOOKS ============
  const {
    data: balancesData,
    loading: loadingBalances,
  } = useGetMyBalances();

  const oweList = balancesData?.getMyBalances?.oweList || [];
  const totalOwe = balancesData?.getMyBalances?.totalOwe || 0;

  // ============ RENDER ============
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
    >
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
                style={[styles.userCard]}
                onPress={() =>
                  navigation.navigate('SettleUserShares', {
                    toUserId: item.userId,
                    toUserName: item.userName,
                    totalAmount: item.amount,
                  })
                }
              >
                {item.imageUrl ? (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={styles.userAvatar}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.userAvatar}>
                    <AppText style={styles.userAvatarText}>
                      {item.name?.charAt(0).toUpperCase() || '?'}
                    </AppText>
                  </View>
                )}
                <View style={styles.userInfo}>
                  <AppText style={styles.displayName}>{item.name}</AppText>
                  <AppText style={styles.userName}>@{item.username}</AppText>
                </View>
                <View style={styles.oweBalanceRow}>
                  <AppText style={styles.userAmount}>
                    ₹{item.amount.toFixed(2)}
                  </AppText>
                  <AppText style={styles.rightArrow}>›</AppText>
                </View>
              </TouchableOpacity>
            )}
          />
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  oweBalanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
  },
  rightArrow: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 2,
  },
  scroll: { padding: 24, paddingBottom: 60 },
  settleCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  settleCardTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: 4,
  },
  settleCardAmount: {
    fontSize: 32,
    fontWeight: '700',
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
  label: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 8,
    marginTop: 16,
  },
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
  userAvatarText: { fontSize: 18, fontWeight: '400', color: '#667eea' },
  userInfo: { flex: 1, flexDirection: 'column', justifyContent: 'center' },
  displayName: { fontSize: 13, fontWeight: '400', color: '#222' },
  userName: { fontSize: 10, color: '#888', marginTop: 2 },
  userAmount: {
    fontSize: 13,
    color: '#dc2626',
    fontWeight: '600',
    marginTop: 2,
  },
  shareDetailsCta: { color: '#4f46e5', fontWeight: '700', fontSize: 13 },
});

export default SettleTab;