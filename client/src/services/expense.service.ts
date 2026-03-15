import { useQuery, useMutation } from '@apollo/client/react';
import { Alert } from 'react-native';
import {
  CREATE_EXPENSE,
  GET_EXPENSE_DETAIL,
  GET_MY_BALANCES,
  GET_RECENT_ACTIVITIES,
  SETTLE_EXPENSE,
} from '../graphql';

// ─── Queries ───────────────────────────────────────────────

export const useGetMyBalances = (options?: { fetchPolicy?: any }) => {
  return useQuery<any>(GET_MY_BALANCES, {
    fetchPolicy: options?.fetchPolicy ?? 'cache-and-network',
  });
};

export const useGetRecentActivities = (options?: { fetchPolicy?: any }) => {
  return useQuery<any>(GET_RECENT_ACTIVITIES, {
    fetchPolicy: options?.fetchPolicy ?? 'cache-and-network',
  });
};

export const useGetExpenseDetail = (expenseId: string) => {
  return useQuery<any>(GET_EXPENSE_DETAIL, {
    variables: { expenseId },
    fetchPolicy: 'cache-and-network',
  });
};

// ─── Mutations ─────────────────────────────────────────────

export const useCreateExpense = (callbacks?: {
  onCompleted?: () => void;
  onError?: (err: any) => void;
}) => {
  return useMutation<any>(CREATE_EXPENSE, {
    refetchQueries: [
      { query: GET_MY_BALANCES },
      { query: GET_RECENT_ACTIVITIES },
    ],
    onCompleted: callbacks?.onCompleted,
    onError: callbacks?.onError ?? ((err: any) => Alert.alert('Error', err.message)),
  });
};

export const useSettleExpense = (callbacks?: {
  onCompleted?: () => void;
  onError?: (err: any) => void;
  refetchQueries?: any[];
}) => {
  return useMutation<any>(SETTLE_EXPENSE, {
    refetchQueries: callbacks?.refetchQueries ?? [
      { query: GET_MY_BALANCES },
      { query: GET_RECENT_ACTIVITIES },
    ],
    onCompleted: callbacks?.onCompleted,
    onError: callbacks?.onError ?? ((err: any) => Alert.alert('Error', err.message)),
  });
};
