import { useQuery, useMutation } from '@apollo/client/react';
import { Alert } from 'react-native';
import {
  GET_MESSAGES,
  GET_CONVERSATIONS,
  SEND_MESSAGE,
  ADD_REACTION,
  REMOVE_REACTION,
  START_DIRECT_CONVERSATION,
} from '../graphql';

// ─── Queries ───────────────────────────────────────────────

export const useGetMessages = (
  conversationId: string,
  options?: { limit?: number; pollInterval?: number; skip?: boolean },
) => {
  return useQuery<any>(GET_MESSAGES, {
    variables: { conversationId, limit: options?.limit ?? 50 },
    skip: options?.skip,
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
    notifyOnNetworkStatusChange: false,
    returnPartialData: true,
    pollInterval: options?.pollInterval ?? 2000,
  });
};

export const useGetConversations = (options?: {
  fetchPolicy?: any;
  pollInterval?: number;
}) => {
  return useQuery<any>(GET_CONVERSATIONS, {
    fetchPolicy: options?.fetchPolicy ?? 'cache-and-network',
    pollInterval: options?.pollInterval,
    notifyOnNetworkStatusChange: true,
    returnPartialData: true,
  });
};

// ─── Mutations ─────────────────────────────────────────────

export const useSendMessage = (callbacks?: {
  onCompleted?: (data: any) => void;
  onError?: (err: any) => void;
}) => {
  return useMutation<any>(SEND_MESSAGE, {
    onCompleted: callbacks?.onCompleted,
    onError: callbacks?.onError ?? ((err: any) => Alert.alert('Error', err.message)),
  });
};

export const useAddReaction = (callbacks?: {
  onCompleted?: () => void;
  onError?: (err: any) => void;
}) => {
  return useMutation<any>(ADD_REACTION, {
    onCompleted: callbacks?.onCompleted,
    onError: callbacks?.onError ?? ((err: any) => Alert.alert('Error', err.message)),
  });
};

export const useRemoveReaction = (callbacks?: {
  onCompleted?: () => void;
  onError?: (err: any) => void;
}) => {
  return useMutation<any>(REMOVE_REACTION, {
    onCompleted: callbacks?.onCompleted,
    onError: callbacks?.onError ?? ((err: any) => Alert.alert('Error', err.message)),
  });
};

export const useStartDirectConversation = (callbacks?: {
  onCompleted?: (data: any) => void;
  onError?: (err: any) => void;
}) => {
  return useMutation<any>(START_DIRECT_CONVERSATION, {
    onCompleted: callbacks?.onCompleted,
    onError: callbacks?.onError ?? ((err: any) => Alert.alert('Error', err.message)),
  });
};
