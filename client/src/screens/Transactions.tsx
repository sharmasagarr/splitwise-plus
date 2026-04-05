import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '../components/AppText';
import { useGetMyTransactions } from '../services';

type TransactionItem = {
  id: string;
  type: string;
  direction: string;
  amount: number;
  currency: string;
  note?: string | null;
  paymentMethodId?: string | null;
  createdAt: string;
};

const formatAmount = (value: number, currency: string, direction: string) => {
  const symbol = currency === 'INR' ? 'Rs' : currency;
  const prefix = direction === 'credit' ? '+' : '-';
  return `${prefix} ${symbol} ${Number(value || 0).toFixed(2)}`;
};

const formatTitle = (type: string) => {
  const words = String(type || '')
    .split('_')
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1));
  return words.join(' ') || 'Transaction';
};

export default function Transactions() {
  const { data, loading, refetch } = useGetMyTransactions({
    limit: 150,
  });

  const transactions: TransactionItem[] = useMemo(
    () => data?.getMyTransactions ?? [],
    [data?.getMyTransactions],
  );

  const visibleTransactions = useMemo(
    () =>
      transactions.filter(
        row =>
          row.type !== 'expense_share_receivable' &&
          row.type !== 'expense_share_owed',
      ),
    [transactions],
  );

  const totals = useMemo(() => {
    let credit = 0;
    let debit = 0;

    for (const row of visibleTransactions) {
      const amount = Number(row.amount) || 0;
      if (row.direction === 'credit') {
        credit += amount;
      } else {
        debit += amount;
      }
    }

    return { credit, debit };
  }, [visibleTransactions]);

  const renderItem = ({ item }: { item: TransactionItem }) => {
    const isCredit = item.direction === 'credit';

    return (
      <View style={styles.txCard}>
        <View style={styles.txHeader}>
          <AppText style={styles.txType}>{formatTitle(item.type)}</AppText>
          <View style={[styles.badge, isCredit ? styles.creditBadge : styles.debitBadge]}>
            <AppText style={[styles.badgeText, isCredit ? styles.creditText : styles.debitText]}>
              {isCredit ? 'Credit' : 'Debit'}
            </AppText>
          </View>
        </View>

        <AppText style={[styles.txAmount, isCredit ? styles.creditValue : styles.debitValue]}>
          {formatAmount(item.amount, item.currency, item.direction)}
        </AppText>

        {item.note ? <AppText style={styles.txNote}>{item.note}</AppText> : null}

        <View style={styles.txMetaRow}>
          <AppText style={styles.txDate}>
            {new Date(item.createdAt).toLocaleString()}
          </AppText>
          <AppText style={styles.txMetaRight}>
            {item.paymentMethodId ? item.paymentMethodId.toUpperCase() : 'Recorded'}
          </AppText>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.headerCard}>
        <AppText style={styles.title}>All Transactions</AppText>

        <View style={styles.totalsRow}>
          <View style={styles.totalPill}>
            <AppText style={styles.totalLabel}>Inflow</AppText>
            <AppText style={[styles.totalValue, styles.creditValue]}>
              + Rs {totals.credit.toFixed(2)}
            </AppText>
          </View>
          <View style={styles.totalPill}>
            <AppText style={styles.totalLabel}>Outflow</AppText>
            <AppText style={[styles.totalValue, styles.debitValue]}>
              - Rs {totals.debit.toFixed(2)}
            </AppText>
          </View>
        </View>
      </View>

      {loading && transactions.length === 0 ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="small" color="#0ea5e9" />
          <AppText style={styles.loaderText}>Loading transactions...</AppText>
        </View>
      ) : (
        <FlatList
          data={visibleTransactions}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={() => refetch()} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <AppText style={styles.emptyTitle}>No transactions yet</AppText>
              <AppText style={styles.emptySubtitle}>
                Expense and settlement records will appear here.
              </AppText>
              <TouchableOpacity style={styles.refreshBtn} onPress={() => refetch()}>
                <AppText style={styles.refreshBtnText}>Refresh</AppText>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f7fb',
  },
  headerCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 10,
    backgroundColor: '#0f172a',
    borderRadius: 18,
    padding: 16,
  },
  title: {
    color: '#e2e8f0',
    fontSize: 20,
    fontWeight: '800',
  },
  totalsRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  totalPill: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: '#111827',
  },
  totalLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
  totalValue: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 22,
  },
  txCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  txHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  txType: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  creditBadge: {
    backgroundColor: '#dcfce7',
  },
  debitBadge: {
    backgroundColor: '#fee2e2',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  creditText: {
    color: '#166534',
  },
  debitText: {
    color: '#b91c1c',
  },
  txAmount: {
    marginTop: 8,
    fontSize: 17,
    fontWeight: '800',
  },
  creditValue: {
    color: '#16a34a',
  },
  debitValue: {
    color: '#dc2626',
  },
  txNote: {
    marginTop: 6,
    color: '#334155',
    fontSize: 12,
  },
  txMetaRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  txDate: {
    color: '#64748b',
    fontSize: 11,
  },
  txMetaRight: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
  },
  loaderWrap: {
    alignItems: 'center',
    marginTop: 50,
  },
  loaderText: {
    marginTop: 8,
    color: '#64748b',
  },
  emptyWrap: {
    marginTop: 30,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 24,
    paddingHorizontal: 18,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    marginTop: 6,
    color: '#64748b',
    textAlign: 'center',
    fontSize: 12,
  },
  refreshBtn: {
    marginTop: 14,
    backgroundColor: '#e0f2fe',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  refreshBtnText: {
    color: '#0369a1',
    fontWeight: '700',
  },
});
