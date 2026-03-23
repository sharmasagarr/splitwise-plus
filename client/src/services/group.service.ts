import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import { Alert } from 'react-native';
import {
  CREATE_GROUP,
  GET_GROUPS,
  GET_GROUP_DETAILS,
  GET_GROUP_EXPENSES,
  GET_MY_INVITES,
  INVITE_TO_GROUP,
  JOIN_GROUP,
  RESPOND_TO_INVITE,
  SEARCH_USERS,
} from '../graphql';

// ─── Queries ───────────────────────────────────────────────

export const useGetGroups = (options?: { fetchPolicy?: any }) => {
  return useQuery<any>(GET_GROUPS, {
    fetchPolicy: options?.fetchPolicy ?? 'cache-and-network',
  });
};

export const useGetGroupDetails = (groupId: string) => {
  return useQuery<any>(GET_GROUP_DETAILS, {
    variables: { id: groupId },
  });
};

export const useGetGroupExpenses = (groupId: string) => {
  return useQuery<any>(GET_GROUP_EXPENSES, {
    variables: { groupId },
  });
};

export const useGetMyInvites = (options?: { fetchPolicy?: any }) => {
  return useQuery<any>(GET_MY_INVITES, {
    fetchPolicy: options?.fetchPolicy ?? 'cache-and-network',
  });
};

// ─── Lazy Queries ──────────────────────────────────────────

export const useSearchUsers = () => {
  return useLazyQuery<any>(SEARCH_USERS);
};

// ─── Mutations ─────────────────────────────────────────────

export const useCreateGroup = (callbacks?: {
  onCompleted?: () => void;
  onError?: (err: any) => void;
}) => {
  return useMutation<any>(CREATE_GROUP, {
    onCompleted: callbacks?.onCompleted,
    onError: callbacks?.onError ?? ((err: any) => Alert.alert('Error', err.message)),
  });
};

export const useInviteToGroup = (callbacks?: {
  onCompleted?: () => void;
  onError?: (err: any) => void;
}) => {
  return useMutation<any>(INVITE_TO_GROUP, {
    onCompleted: callbacks?.onCompleted,
    onError: callbacks?.onError ?? ((err: any) => Alert.alert('Error', err.message)),
  });
};

export const useRespondToInvite = (callbacks?: {
  onCompleted?: () => void;
  onError?: (err: any) => void;
}) => {
  return useMutation<any>(RESPOND_TO_INVITE, {
    onCompleted: callbacks?.onCompleted,
    onError: callbacks?.onError ?? ((err: any) => Alert.alert('Error', err.message)),
  });
};

export const useJoinGroup = (callbacks?: {
  onCompleted?: () => void;
  onError?: (err: any) => void;
}) => {
  return useMutation<any>(JOIN_GROUP, {
    onCompleted: callbacks?.onCompleted,
    onError: callbacks?.onError ?? ((err: any) => Alert.alert('Error', err.message)),
  });
};
