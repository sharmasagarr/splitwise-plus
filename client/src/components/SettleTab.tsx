import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppText from './AppText';
import Icon from './Icon';
import { useGetMyBalances } from '../services';
import { RootStackParamList } from '../navigations/RootStack';

type BalanceUser = {
  amount: number;
  imageUrl?: string | null;
  name: string;
  upiId?: string | null;
  userId: string;
  username: string;
};

type TabListProps = {
  emptySubtitle: string;
  emptyTitle: string;
  loading: boolean;
  onPressItem: (item: BalanceUser) => void;
  onRefresh: () => void;
  refreshing: boolean;
  rows: BalanceUser[];
  sectionLabel: string;
  type: 'owe' | 'owed';
};

type LabelProps = {
  color: string;
  count: number;
  focused: boolean;
  iconName: 'Wallet' | 'MoneyWallet';
  label: string;
};

type TabBarLabelRenderProps = {
  color: string;
  focused: boolean;
};

const Tab = createMaterialTopTabNavigator();

const formatMoney = (value: number) => `\u20B9${Number(value || 0).toFixed(2)}`;

const SettleTabLabel = ({
  color,
  count,
  focused,
  iconName,
  label,
}: LabelProps) => (
  <View style={styles.tabLabelRow}>
    <Icon name={iconName} width={15} height={15} color={color} />
    <AppText style={[styles.tabLabelText, { color }]}>{label}</AppText>
    <View style={[styles.tabCountPill, focused && styles.tabCountPillActive]}>
      <AppText
        style={[
          styles.tabCountText,
          { color },
          focused && styles.tabCountTextActive,
        ]}
      >
        {count}
      </AppText>
    </View>
  </View>
);

function BalanceListTab({
  emptySubtitle,
  emptyTitle,
  loading,
  onPressItem,
  onRefresh,
  refreshing,
  rows,
  sectionLabel,
  type,
}: TabListProps) {
  if (loading && rows.length === 0) {
    return (
      <View style={styles.stateWrap}>
        <ActivityIndicator size="small" color="#4f46e5" />
        <AppText style={styles.stateText}>Loading balances...</AppText>
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={item => item.userId}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={[
        styles.listContent,
        rows.length === 0 && styles.listContentEmpty,
      ]}
      ListHeaderComponent={
        rows.length > 0 ? (
          <AppText style={styles.sectionLabel}>{sectionLabel}</AppText>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <AppText style={styles.emptyIcon}>{type === 'owe' ? '💸' : '💰'}</AppText>
          <AppText style={styles.emptyTitle}>{emptyTitle}</AppText>
          <AppText style={styles.emptySubtitle}>{emptySubtitle}</AppText>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.userCard}
          onPress={() => onPressItem(item)}
          activeOpacity={0.88}
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

          <View style={styles.amountWrap}>
            <AppText
              style={[
                styles.userAmount,
                type === 'owe' ? styles.userAmountOwe : styles.userAmountOwed,
              ]}
            >
              {formatMoney(item.amount)}
            </AppText>
            <AppText style={styles.rightArrow}>›</AppText>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const SettleTab = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    data: balancesData,
    loading: loadingBalances,
    refetch,
  } = useGetMyBalances();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch().catch(() => {});
    setRefreshing(false);
  }, [refetch]);

  const oweList: BalanceUser[] = balancesData?.getMyBalances?.oweList || [];
  const owedList: BalanceUser[] = balancesData?.getMyBalances?.owedList || [];
  const totalOwe = balancesData?.getMyBalances?.totalOwe || 0;
  const totalOwed = balancesData?.getMyBalances?.totalOwed || 0;

  const renderOweTabLabel = React.useCallback(
    ({ color, focused }: TabBarLabelRenderProps) => (
      <SettleTabLabel
        color={color}
        count={oweList.length}
        focused={focused}
        iconName="Wallet"
        label="Owe"
      />
    ),
    [oweList.length],
  );

  const renderOwedTabLabel = React.useCallback(
    ({ color, focused }: TabBarLabelRenderProps) => (
      <SettleTabLabel
        color={color}
        count={owedList.length}
        focused={focused}
        iconName="MoneyWallet"
        label="Owed"
      />
    ),
    [owedList.length],
  );

  return (
    <View style={styles.container}>
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, styles.summaryCardDanger]}>
          <AppText style={[styles.summaryLabel, styles.summaryLabelDanger]}>
            You Owe
          </AppText>
          {loadingBalances ? (
            <ActivityIndicator size="small" color="#dc2626" />
          ) : (
            <AppText style={[styles.summaryValue, styles.summaryValueDanger]}>
              {formatMoney(totalOwe)}
            </AppText>
          )}
        </View>

        <View style={[styles.summaryCard, styles.summaryCardSuccess]}>
          <AppText style={[styles.summaryLabel, styles.summaryLabelSuccess]}>
            You Are Owed
          </AppText>
          {loadingBalances ? (
            <ActivityIndicator size="small" color="#15803d" />
          ) : (
            <AppText style={[styles.summaryValue, styles.summaryValueSuccess]}>
              {formatMoney(totalOwed)}
            </AppText>
          )}
        </View>
      </View>

      <View style={styles.tabsWrap}>
        <Tab.Navigator
          initialRouteName="OweTab"
          screenOptions={{
            tabBarActiveTintColor: '#4f46e5',
            tabBarInactiveTintColor: '#64748b',
            tabBarIndicatorStyle: styles.tabBarIndicator,
            tabBarItemStyle: styles.tabBarItem,
            tabBarStyle: styles.tabBar,
            tabBarPressColor: 'transparent',
            sceneStyle: styles.tabScene,
          }}
        >
          <Tab.Screen
            name="OweTab"
            options={{
              tabBarLabel: renderOweTabLabel,
            }}
          >
            {() => (
              <BalanceListTab
                rows={oweList}
                loading={loadingBalances}
                refreshing={refreshing}
                onRefresh={onRefresh}
                type="owe"
                sectionLabel="Select who to pay"
                emptyTitle="All Settled!"
                emptySubtitle="You don't owe anyone right now."
                onPressItem={item =>
                  navigation.navigate('SettleUserShares', {
                    toUserId: item.userId,
                    toUserName: item.name,
                    totalAmount: item.amount,
                  })
                }
              />
            )}
          </Tab.Screen>

          <Tab.Screen
            name="OwedTab"
            options={{
              tabBarLabel: renderOwedTabLabel,
            }}
          >
            {() => (
              <BalanceListTab
                rows={owedList}
                loading={loadingBalances}
                refreshing={refreshing}
                onRefresh={onRefresh}
                type="owed"
                sectionLabel="Select who to remind"
                emptyTitle="Nothing Pending"
                emptySubtitle="Nobody owes you anything right now."
                onPressItem={item =>
                  navigation.navigate('OwedUserShares', {
                    fromUserId: item.userId,
                    fromUserName: item.name,
                    totalAmount: item.amount,
                  })
                }
              />
            )}
          </Tab.Screen>
        </Tab.Navigator>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  summaryCardDanger: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  summaryCardSuccess: {
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0',
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  summaryLabelDanger: {
    color: '#dc2626',
  },
  summaryLabelSuccess: {
    color: '#15803d',
  },
  summaryValue: {
    marginTop: 6,
    fontSize: 24,
    fontWeight: '800',
  },
  summaryValueDanger: {
    color: '#b91c1c',
  },
  summaryValueSuccess: {
    color: '#166534',
  },
  tabsWrap: {
    flex: 1,
    marginTop: 14,
  },
  tabBar: {
    backgroundColor: '#ffffff',
    minHeight: 48,
    elevation: 0,
    shadowOpacity: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabBarItem: {
    padding: 0,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarIndicator: {
    backgroundColor: '#4f46e5',
    height: 3,
    borderRadius: 999,
  },
  tabScene: {
    backgroundColor: '#ffffff',
  },
  tabLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabLabelText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 14,
  },
  tabCountPill: {
    minWidth: 22,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  tabCountPillActive: {
    backgroundColor: '#eef2ff',
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 12,
  },
  tabCountTextActive: {
    color: '#4f46e5',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 10,
    fontWeight: '700',
  },
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  stateText: {
    marginTop: 8,
    color: '#64748b',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 42,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptySubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  userAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#667eea',
  },
  userInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  userName: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 3,
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 10,
  },
  userAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  userAmountOwe: {
    color: '#dc2626',
  },
  userAmountOwed: {
    color: '#15803d',
  },
  rightArrow: {
    fontSize: 15,
    color: '#64748b',
  },
});

export default SettleTab;
