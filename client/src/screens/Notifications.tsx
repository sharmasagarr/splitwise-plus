import React from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import AppText from '../components/AppText';
import { useGetMyNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../services';
import { lightTheme } from '../utility/themeColors';

interface NotificationItem {
  id: string;
  type: string;
  payload: string;
  read: boolean;
  createdAt: string;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'expense_added':
      return '💸';
    case 'settlement_received':
      return '✅';
    default:
      return '🔔';
  }
}

function timeAgo(dateStr: string) {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Notifications() {
  const theme = lightTheme;

  const { data, loading, refetch } = useGetMyNotifications();

  const [markRead] = useMarkNotificationRead();
  const [markAllRead] = useMarkAllNotificationsRead();

  const notifications: NotificationItem[] = data?.getMyNotifications ?? [];

  const unreadCount = notifications.filter(n => !n.read).length;

  const handlePress = async (item: NotificationItem) => {
    if (!item.read) {
      await markRead({
        variables: { id: item.id },
        optimisticResponse: {
          markNotificationRead: {
            __typename: 'Notification',
            id: item.id,
            read: true,
          },
        },
      });
      refetch();
    }
  };

  const handleMarkAllRead = async () => {
    await markAllRead();
    refetch();
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    let parsed: { title?: string; body?: string } = {};
    try {
      parsed = JSON.parse(item.payload);
    } catch {
      parsed = { body: item.payload };
    }

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          item.read ? styles.itemReadBg : getUnreadBg(theme),
        ]}
        onPress={() => handlePress(item)}
        activeOpacity={0.7}
      >
        <AppText style={styles.icon}>{getNotificationIcon(item.type)}</AppText>
        <View style={styles.content}>
          {parsed.title ? (
            <AppText
              style={[
                styles.title,
                { color: theme.text },
                item.read ? styles.titleRead : styles.titleUnread,
              ]}
            >
              {parsed.title}
            </AppText>
          ) : null}
          {parsed.body ? (
            <AppText
              style={[
                styles.body,
                { color: theme.text },
                item.read ? styles.bodyRead : styles.bodyUnread,
              ]}
              numberOfLines={2}
            >
              {parsed.body}
            </AppText>
          ) : null}
          <AppText style={[styles.time, { color: theme.text }]}>
            {timeAgo(item.createdAt)}
          </AppText>
        </View>
        {!item.read && (
          <View
            style={[styles.unreadDot, { backgroundColor: theme.primary }]}
          />
        )}
      </TouchableOpacity>
    );
  };

  if (loading && !data) {
    return (
      <View style={[styles.center, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {unreadCount > 0 && (
        <TouchableOpacity
          style={[styles.markAllBtn, { borderBottomColor: theme.border }]}
          onPress={handleMarkAllRead}
        >
          <AppText style={[styles.markAllText, { color: theme.primary }]}>
            Mark all as read ({unreadCount})
          </AppText>
        </TouchableOpacity>
      )}
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        onRefresh={refetch}
        refreshing={loading}
        contentContainerStyle={
          notifications.length === 0 ? styles.emptyContainer : undefined
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <AppText style={styles.emptyIcon}>🔔</AppText>
            <AppText style={[styles.emptyText, { color: theme.text }]}>
              No notifications yet
            </AppText>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markAllBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    alignItems: 'flex-end',
  },
  markAllText: {
    fontSize: 14,
    fontFamily: 'GoogleSans-Medium',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderLeftWidth: 3,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontFamily: 'GoogleSans-Medium',
    marginBottom: 2,
  },
  body: {
    fontSize: 13,
    fontFamily: 'GoogleSans-Regular',
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    fontFamily: 'GoogleSans-Regular',
    opacity: 0.5,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'GoogleSans-Regular',
    opacity: 0.5,
  },
  itemReadBg: {
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
  },
  titleRead: {
    fontWeight: '400',
  },
  titleUnread: {
    fontWeight: '700',
  },
  bodyRead: {
    opacity: 0.6,
  },
  bodyUnread: {
    opacity: 0.85,
  },
});

const getUnreadBg = (theme: any) => ({
  backgroundColor: theme.primary + '08',
  borderLeftColor: theme.primary,
});
