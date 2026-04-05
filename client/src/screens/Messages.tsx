import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AppText from '../components/AppText';
import Icon from '../components/Icon';
import {
  useGetConversations,
  useGetGroups,
  useStartDirectConversation,
} from '../services';
import { useAppSelector } from '../store/hooks';
import type { RootStackParamList } from '../navigations/RootStack';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

type MessageTopTabParamList = {
  GroupChats: undefined;
  DirectMessages: undefined;
};

type ConversationItem = {
  id: string;
  imageUrl?: string | null;
  lastMessage?: {
    body?: string | null;
    createdAt: string;
    sender?: {
      id: string;
      name: string;
    } | null;
    senderId: string;
    type: string;
  } | null;
  participants?: Array<{
    userId: string;
    user?: {
      email?: string;
      id: string;
      imageUrl?: string | null;
      name: string;
      username?: string;
    } | null;
  }>;
  title?: string | null;
  type: string;
  updatedAt: string;
};

type GroupContact = {
  conversation?: ConversationItem;
  email?: string;
  id: string;
  imageUrl?: string | null;
  name: string;
  sharedGroups: string[];
  username?: string;
};

type ConversationListTabProps = {
  emptyMessage: string;
  loading: boolean;
  onOpenConversation: (item: ConversationItem) => void;
  onRefresh: () => void;
  rows: ConversationItem[];
  userId?: string;
  variant: 'group' | 'direct';
};

type DirectContactsTabProps = {
  contacts: GroupContact[];
  loading: boolean;
  onOpenContact: (contact: GroupContact) => void;
  onRefresh: () => void;
  userId?: string;
};

type InboxLabelProps = {
  color: string;
  count: number;
  focused: boolean;
  iconName: 'Groups' | 'Message';
  label: string;
};

const Tab = createMaterialTopTabNavigator<MessageTopTabParamList>();

const InboxTabLabel = ({
  color,
  count,
  focused,
  iconName,
  label,
}: InboxLabelProps) => (
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

const formatConversationTime = (value?: string) => {
  if (!value) return '';

  const numeric = Number(value);
  const date = Number.isFinite(numeric) ? new Date(numeric) : new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return date.toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
  });
};

const getDirectContactPreview = (
  contact: GroupContact,
) => {
  const message = contact.conversation?.lastMessage;
  if (!message?.body) {
    return `Tap to start a message`;
  }

  return message.body;
};

function ConversationListTab({
  emptyMessage,
  loading,
  onOpenConversation,
  onRefresh,
  rows,
  userId,
  variant,
}: ConversationListTabProps) {
  const getConversationTitle = useCallback(
    (conversation: ConversationItem) => {
      if (conversation.type === 'group') {
        return conversation.title || 'Group Chat';
      }

      const otherUser = conversation.participants?.find(
        participant => participant.userId !== userId,
      )?.user;

      return otherUser?.name || 'Chat';
    },
    [userId],
  );

  const getConversationPreview = useCallback(
    (conversation: ConversationItem) => {
      if (!conversation.lastMessage) return 'No messages yet';

      const message = conversation.lastMessage;
      const isMe = message.senderId === userId;
      const prefix =
        isMe
          ? 'You: '
          : variant === 'group'
            ? `${message.sender?.name || 'Someone'}: `
            : '';

      const body = message.body || '';
      return `${prefix}${body.length > 48 ? `${body.slice(0, 48)}...` : body}`;
    },
    [userId, variant],
  );

  const renderConversation = ({ item }: { item: ConversationItem }) => {
    const otherUser = item.participants?.find(
      participant => participant.userId !== userId,
    )?.user;

    return (
      <TouchableOpacity
        style={styles.convCard}
        activeOpacity={0.8}
        onPress={() => onOpenConversation(item)}
      >
        {variant === 'group' && item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.groupAvatarImage} />
        ) : variant === 'group' ? (
          <View style={styles.groupAvatar}>
            <Icon name="Groups" width={22} height={22} color="#667eea" />
          </View>
        ) : otherUser?.imageUrl ? (
          <Image source={{ uri: otherUser.imageUrl }} style={styles.directAvatar} />
        ) : (
          <View style={styles.directAvatarFallback}>
            <AppText style={styles.directAvatarText}>
              {(otherUser?.name || getConversationTitle(item))
                .charAt(0)
                .toUpperCase()}
            </AppText>
          </View>
        )}

        <View style={styles.convInfo}>
          <View style={styles.convHeader}>
            <AppText style={styles.convTitle} numberOfLines={1}>
              {getConversationTitle(item)}
            </AppText>
            <AppText style={styles.convTime}>
              {formatConversationTime(
                item.lastMessage?.createdAt || item.updatedAt,
              )}
            </AppText>
          </View>
          <AppText style={styles.convPreview} numberOfLines={1}>
            {getConversationPreview(item)}
          </AppText>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && rows.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <FlatList
      data={rows}
      keyExtractor={item => item.id}
      renderItem={renderConversation}
      refreshing={loading}
      onRefresh={onRefresh}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.listContent,
        rows.length === 0 && styles.listContentEmpty,
      ]}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <AppText style={styles.emptyText}>{emptyMessage}</AppText>
        </View>
      }
    />
  );
}

function DirectContactsTab({
  contacts,
  loading,
  onOpenContact,
  onRefresh,
}: DirectContactsTabProps) {
  if (loading && contacts.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <FlatList
      data={contacts}
      keyExtractor={item => item.id}
      refreshing={loading}
      onRefresh={onRefresh}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.listContent,
        contacts.length === 0 && styles.listContentEmpty,
      ]}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.convCard}
          activeOpacity={0.8}
          onPress={() => onOpenContact(item)}
        >
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.directAvatar} />
          ) : (
            <View style={styles.directAvatarFallback}>
              <AppText style={styles.directAvatarText}>
                {item.name.charAt(0).toUpperCase()}
              </AppText>
            </View>
          )}

          <View style={styles.convInfo}>
            <View style={styles.convHeader}>
              <AppText style={styles.convTitle} numberOfLines={1}>
                {item.name}
              </AppText>
              {item.conversation?.lastMessage ? (
                <AppText style={styles.convTime}>
                  {formatConversationTime(
                    item.conversation.lastMessage.createdAt ||
                      item.conversation.updatedAt,
                  )}
                </AppText>
              ) : null}
            </View>

            <AppText style={styles.convPreview} numberOfLines={1}>
              {getDirectContactPreview(item)}
            </AppText>
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <AppText style={styles.emptyText}>
            No group contacts yet. Join or create a group to message people.
          </AppText>
        </View>
      }
    />
  );
}

const Messages = () => {
  const navigation = useNavigation<NavProp>();
  const { user } = useAppSelector(state => state.auth);

  const {
    data: conversationsData,
    loading: loadingConversations,
    refetch: refetchConversations,
  } = useGetConversations();
  const {
    data: groupsData,
    loading: loadingGroups,
    refetch: refetchGroups,
  } = useGetGroups();

  const [startDM, { loading: startingDM }] = useStartDirectConversation({
    onCompleted: (result: any) => {
      const conversation = result.startDirectConversation;
      const otherUser = conversation.participants?.find(
        (participant: any) => participant.userId !== user?.id,
      )?.user;

      refetchConversations();
      navigation.navigate('ChatScreen', {
        conversationId: conversation.id,
        title: otherUser?.name || 'Chat',
        type: 'direct',
      });
    },
    onError: (err: any) => Alert.alert('Error', err.message),
  });

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([refetchConversations(), refetchGroups()]);
  }, [refetchConversations, refetchGroups]);

  useFocusEffect(
    useCallback(() => {
      refreshAll().catch(() => {});
    }, [refreshAll]),
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: undefined,
    });
  }, [navigation]);

  const conversations = useMemo<ConversationItem[]>(
    () => conversationsData?.getConversations ?? [],
    [conversationsData?.getConversations],
  );
  const groups = useMemo(() => groupsData?.getGroups ?? [], [groupsData?.getGroups]);

  const groupChats = useMemo(
    () => conversations.filter(conversation => conversation.type === 'group'),
    [conversations],
  );
  const directChats = useMemo(
    () => conversations.filter(conversation => conversation.type === 'direct'),
    [conversations],
  );

  const directContacts = useMemo<GroupContact[]>(() => {
    const directConversationMap = new Map<string, ConversationItem>();

    directChats.forEach(conversation => {
      const otherUser = conversation.participants?.find(
        participant => participant.userId !== user?.id,
      )?.user;

      if (otherUser?.id) {
        directConversationMap.set(otherUser.id, conversation);
      }
    });

    const contactsMap = new Map<string, GroupContact>();

    groups.forEach((group: any) => {
      group.members?.forEach((member: any) => {
        const memberUser = member.user;
        if (!memberUser || memberUser.id === user?.id) return;

        const existing = contactsMap.get(memberUser.id);
        if (existing) {
          if (group.name && !existing.sharedGroups.includes(group.name)) {
            existing.sharedGroups.push(group.name);
          }
          return;
        }

        contactsMap.set(memberUser.id, {
          id: memberUser.id,
          name: memberUser.name,
          username: memberUser.username,
          email: memberUser.email,
          imageUrl: memberUser.imageUrl,
          sharedGroups: group.name ? [group.name] : [],
          conversation: directConversationMap.get(memberUser.id),
        });
      });
    });

    return Array.from(contactsMap.values()).sort((a, b) => {
      const aTime = Number(
        a.conversation?.lastMessage?.createdAt || a.conversation?.updatedAt || 0,
      );
      const bTime = Number(
        b.conversation?.lastMessage?.createdAt || b.conversation?.updatedAt || 0,
      );

      if (aTime !== bTime) return bTime - aTime;

      return a.name.localeCompare(b.name);
    });
  }, [directChats, groups, user?.id]);

  const openConversation = useCallback(
    (conversation: ConversationItem) => {
      const otherUser = conversation.participants?.find(
        participant => participant.userId !== user?.id,
      )?.user;

      navigation.navigate('ChatScreen', {
        conversationId: conversation.id,
        title:
          conversation.type === 'group'
            ? conversation.title || 'Group Chat'
            : otherUser?.name || 'Chat',
        type: conversation.type,
      });
    },
    [navigation, user?.id],
  );

  const openDirectContact = useCallback(
    (contact: GroupContact) => {
      if (contact.conversation) {
        openConversation(contact.conversation);
        return;
      }

      startDM({ variables: { userId: contact.id } });
    },
    [openConversation, startDM],
  );

  const renderGroupChatsLabel = useCallback(
    ({ color, focused }: { color: string; focused: boolean }) => (
      <InboxTabLabel
        color={color}
        count={groupChats.length}
        focused={focused}
        iconName="Groups"
        label="Groups"
      />
    ),
    [groupChats.length],
  );

  const renderDirectChatsLabel = useCallback(
    ({ color, focused }: { color: string; focused: boolean }) => (
      <InboxTabLabel
        color={color}
        count={directContacts.length}
        focused={focused}
        iconName="Message"
        label="Direct"
      />
    ),
    [directContacts.length],
  );

  return (
    <View style={styles.container}>
      <Tab.Navigator
        initialRouteName="GroupChats"
        screenOptions={{
          tabBarActiveTintColor: '#4f46e5',
          tabBarInactiveTintColor: '#64748b',
          tabBarIndicatorStyle: styles.tabBarIndicator,
          tabBarItemStyle: styles.tabBarItem,
          tabBarStyle: styles.tabBar,
          tabBarPressColor: 'transparent',
          sceneStyle: styles.tabScene,
          lazy: true,
        }}
      >
        <Tab.Screen
          name="GroupChats"
          options={{
            tabBarLabel: renderGroupChatsLabel,
          }}
        >
          {() => (
            <ConversationListTab
              emptyMessage="No group chats yet. Create a group to start chatting."
              loading={loadingConversations && groupChats.length === 0}
              onOpenConversation={openConversation}
              onRefresh={refreshAll}
              rows={groupChats}
              userId={user?.id}
              variant="group"
            />
          )}
        </Tab.Screen>

        <Tab.Screen
          name="DirectMessages"
          options={{
            tabBarLabel: renderDirectChatsLabel,
          }}
        >
          {() => (
            <DirectContactsTab
              contacts={directContacts}
              loading={
                (loadingConversations || loadingGroups || startingDM) &&
                directContacts.length === 0
              }
              onOpenContact={openDirectContact}
              onRefresh={refreshAll}
              userId={user?.id}
            />
          )}
        </Tab.Screen>
      </Tab.Navigator>
    </View>
  );
};

export default Messages;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#f8fafc',
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
    // padding: 16,
    // paddingBottom: 28,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  groupAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  groupAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e2e8f0',
    marginRight: 14,
  },
  directAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#e2e8f0',
    marginRight: 14,
  },
  directAvatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  directAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4338ca',
  },
  convInfo: {
    flex: 1,
  },
  convHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  convTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  convTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  convPreview: {
    fontSize: 13,
    color: '#64748b',
  },
  contactMeta: {
    fontSize: 11,
    color: '#4f46e5',
    marginBottom: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
