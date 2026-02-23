import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import {
  GET_CONVERSATIONS,
  SEARCH_USERS,
  START_DIRECT_CONVERSATION,
} from '../graphql';
import { useAppSelector } from '../store/hooks';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigations/RootStack';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

const Messages = () => {
  const navigation = useNavigation<NavProp>();
  const { user } = useAppSelector(state => state.auth);

  const { data, loading, refetch } = useQuery<any>(GET_CONVERSATIONS, {
    fetchPolicy: 'cache-and-network',
  });

  const [activeTab, setActiveTab] = useState<'group' | 'direct'>('group');
  const [dmModalVisible, setDmModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [searchUsers, { data: searchData, loading: searching }] =
    useLazyQuery<any>(SEARCH_USERS);

  const [startDM, { loading: startingDM }] = useMutation<any>(
    START_DIRECT_CONVERSATION,
    {
      onCompleted: (result: any) => {
        setDmModalVisible(false);
        setSearchQuery('');
        refetch();
        const conv = result.startDirectConversation;
        const otherUser = conv.participants?.find(
          (p: any) => p.userId !== user?.id,
        )?.user;
        navigation.navigate('ChatScreen', {
          conversationId: conv.id,
          title: otherUser?.name || 'Chat',
          type: 'direct',
        });
      },
      onError: (err: any) => Alert.alert('Error', err.message),
    },
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      // eslint-disable-next-line react/no-unstable-nested-components
      headerRight: () =>
        activeTab === 'direct' ? (
          <TouchableOpacity
            style={styles.newDmBtn}
            onPress={() => setDmModalVisible(true)}
          >
            <Text style={styles.newDmBtnText}>+ New</Text>
          </TouchableOpacity>
        ) : null,
    });
  }, [navigation, activeTab]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (text.trim().length >= 2) {
      searchUsers({ variables: { query: text.trim() } });
    }
  };

  const handleStartDM = (otherUserId: string) => {
    startDM({ variables: { userId: otherUserId } });
  };

  const conversations = data?.getConversations || [];
  const groupChats = conversations.filter((c: any) => c.type === 'group');
  const directChats = conversations.filter((c: any) => c.type === 'direct');
  const searchResults = searchData?.searchUsers || [];

  const activeData = activeTab === 'group' ? groupChats : directChats;

  const getConversationTitle = (conv: any) => {
    if (conv.type === 'group') return conv.title || 'Group Chat';
    const other = conv.participants?.find(
      (p: any) => p.userId !== user?.id,
    )?.user;
    return other?.name || 'Chat';
  };

  const getLastMessagePreview = (conv: any) => {
    if (!conv.lastMessage) return 'No messages yet';
    const msg = conv.lastMessage;
    const isMe = msg.senderId === user?.id;
    const prefix = isMe ? 'You: ' : `${msg.sender?.name}: `;
    if (msg.type === 'payment_reminder') return `${prefix}💰 Payment Reminder`;
    const body = msg.body || '';
    return `${prefix}${
      body.length > 40 ? body.substring(0, 40) + '...' : body
    }`;
  };

  const formatTime = (ts: string) => {
    const d = new Date(Number(ts));
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderConversation = ({ item }: any) => (
    <TouchableOpacity
      style={styles.convCard}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate('ChatScreen', {
          conversationId: item.id,
          title: getConversationTitle(item),
          type: item.type,
        })
      }
    >
      <View style={styles.convAvatar}>
        <Text style={styles.convAvatarText}>
          {item.type === 'group'
            ? '👥'
            : getConversationTitle(item).charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.convInfo}>
        <View style={styles.convHeader}>
          <Text style={styles.convTitle} numberOfLines={1}>
            {getConversationTitle(item)}
          </Text>
          {item.lastMessage && (
            <Text style={styles.convTime}>
              {formatTime(item.lastMessage.createdAt)}
            </Text>
          )}
        </View>
        <Text style={styles.convPreview} numberOfLines={1}>
          {getLastMessagePreview(item)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'group' && styles.tabActive]}
          onPress={() => setActiveTab('group')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'group' && styles.tabTextActive,
            ]}
          >
            Group Chats ({groupChats.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'direct' && styles.tabActive]}
          onPress={() => setActiveTab('direct')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'direct' && styles.tabTextActive,
            ]}
          >
            Direct ({directChats.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeData}
        keyExtractor={(item: any) => item.id}
        renderItem={renderConversation}
        refreshing={loading}
        onRefresh={refetch}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'group'
                ? 'No group chats yet. Create a group to start chatting!'
                : 'No direct messages yet.'}
            </Text>
          </View>
        }
      />

      {/* New DM Modal */}
      <Modal visible={dmModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Message</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Search user by email..."
              value={searchQuery}
              onChangeText={handleSearch}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholderTextColor="#94a3b8"
            />

            {searching && (
              <ActivityIndicator
                size="small"
                color="#667eea"
                style={styles.searchLoader}
              />
            )}

            {searchResults.map((u: any) => (
              <TouchableOpacity
                key={u.id}
                style={styles.searchItem}
                onPress={() => handleStartDM(u.id)}
                disabled={startingDM}
              >
                <View style={styles.searchAvatar}>
                  <Text style={styles.searchAvatarText}>
                    {u.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.searchInfo}>
                  <Text style={styles.searchName}>{u.name}</Text>
                  <Text style={styles.searchEmail}>{u.email}</Text>
                </View>
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setDmModalVisible(false);
                setSearchQuery('');
              }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Messages;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingBottom: 40 },
  // Tabs
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#667eea',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  tabTextActive: {
    color: '#667eea',
  },
  // Header
  newDmBtn: {
    backgroundColor: '#667eea',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  newDmBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  // Conv cards
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  convAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  convAvatarText: { fontSize: 20, fontWeight: '700', color: '#667eea' },
  convInfo: { flex: 1 },
  convHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  convTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  convTime: { fontSize: 12, color: '#94a3b8' },
  convPreview: { fontSize: 14, color: '#64748b' },
  emptyContainer: { padding: 30, alignItems: 'center' },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 16,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#f8fafc',
    color: '#1e293b',
    marginBottom: 12,
  },
  searchLoader: { marginBottom: 12 },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchAvatarText: { fontSize: 16, fontWeight: '700', color: '#667eea' },
  searchInfo: { flex: 1 },
  searchName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  searchEmail: { fontSize: 13, color: '#64748b' },
  cancelBtn: {
    marginTop: 16,
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
  },
  cancelBtnText: { color: '#475569', fontWeight: '700', fontSize: 15 },
});
