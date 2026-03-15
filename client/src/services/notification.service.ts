import { useQuery, useMutation } from '@apollo/client/react';
import { GET_MY_NOTIFICATIONS } from '../graphql/queries';
import {
  MARK_NOTIFICATION_READ,
  MARK_ALL_NOTIFICATIONS_READ,
} from '../graphql/mutations';

// ─── Queries ───────────────────────────────────────────────

export const useGetMyNotifications = (options?: { fetchPolicy?: any }) => {
  return useQuery<any>(GET_MY_NOTIFICATIONS, {
    fetchPolicy: options?.fetchPolicy ?? 'cache-and-network',
  });
};

// ─── Mutations ─────────────────────────────────────────────

export const useMarkNotificationRead = () => {
  return useMutation(MARK_NOTIFICATION_READ);
};

export const useMarkAllNotificationsRead = () => {
  return useMutation(MARK_ALL_NOTIFICATIONS_READ);
};
