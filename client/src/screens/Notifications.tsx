import React, { useCallback, useLayoutEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AppText from '../components/AppText';
import { useGetMyNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../services';
import { lightTheme } from '../utility/themeColors';
import Icon from '../components/Icon';

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
      return <Icon name="Rupee" width={22} height={22} color="#047faf" style={styles.icon} />;
    case 'settlement_received':
      return <Icon name="CheckBadge" width={24} height={24} color="#20af04" style={styles.icon} />;
    case 'user_joined_group':
      return <Icon name="UserCheck" width={22} height={22} color="#047faf" style={styles.icon} />;
    case 'group_invitation':
      return <Icon name="Invitation" width={22} height={22} color="#047faf" style={styles.icon} />;
    default:
      return <Icon name="Bell" width={22} height={22} color="#534f4e" style={styles.icon} />;
  }
}

function parseTimestamp(value: string) {
  const raw = String(value ?? '').trim();
  if (!raw) return NaN;

  // Handle unix timestamps that may come as strings.
  if (/^\d+$/.test(raw)) {
    const numeric = Number(raw);
    if (!Number.isNaN(numeric)) {
      // 10 digits usually means seconds; 13 means milliseconds.
      return raw.length <= 10 ? numeric * 1000 : numeric;
    }
  }

  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) return parsed;

  // Some backends send 'YYYY-MM-DD HH:mm:ss' without timezone.
  const normalized = Date.parse(raw.replace(' ', 'T'));
  return normalized;
}

function timeAgo(dateStr: string) {
  const timestamp = parseTimestamp(dateStr);
  if (Number.isNaN(timestamp)) return 'Recently';

  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const mins = Math.floor(seconds / 60);
  if (mins < 60) return mins === 1 ? '1 min ago' : `${mins} mins ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;

  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}

export default function Notifications() {
  const theme = lightTheme;
  const navigation = useNavigation<any>();

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

  const handleMarkAllRead = useCallback(async () => {
    await markAllRead();
    refetch();
  }, [markAllRead, refetch]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight:
        unreadCount > 0
          ? () => (
              <TouchableOpacity
                style={[styles.headerMarkAllBtn, { borderColor: theme.primary + '33' }]}
                onPress={handleMarkAllRead}
                activeOpacity={0.8}
              >
                <AppText style={[styles.headerMarkAllText, { color: theme.primary }]}> 
                  Mark all read ({unreadCount})
                </AppText>
              </TouchableOpacity>
            )
          : undefined,
    });
  }, [navigation, unreadCount, handleMarkAllRead, theme.primary]);

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

        {getNotificationIcon(item.type)}
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
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        onRefresh={refetch}
        refreshing={loading}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={
          notifications.length === 0
            ? styles.emptyContainer
            : styles.listContent
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
  headerMarkAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: '#ffffff',
  },
  headerMarkAllText: {
    fontSize: 10,
    fontFamily: 'GoogleSans-Medium',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 14,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 4,
    marginVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    backgroundColor: '#ffffff',
  },
  icon: {
    marginRight: 10,
    marginTop: 2,
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
    opacity: 0.55,
    marginTop: 6,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    marginLeft: 8,
    marginTop: 8,
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
  backgroundColor: theme.primary + '10',
  borderColor: theme.primary + '35',
});
