import { gql } from '@apollo/client';

export const REGISTER_FCM_TOKEN = gql`
  mutation RegisterFcmToken($token: String!) {
    registerFcmToken(token: $token)
  }
`;

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($id: ID!) {
    markNotificationRead(id: $id) {
      id
      read
    }
  }
`;

export const MARK_ALL_NOTIFICATIONS_READ = gql`
  mutation MarkAllNotificationsRead {
    markAllNotificationsRead
  }
`;
