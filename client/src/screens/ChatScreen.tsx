import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useQuery, useMutation } from '@apollo/client/react';
import {
  GET_MESSAGES,
  GET_CONVERSATIONS,
  SEND_MESSAGE,
  ADD_REACTION,
  REMOVE_REACTION,
} from '../graphql';
import { useAppSelector } from '../store/hooks';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigations/RootStack';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatScreen'>;

const QUICK_EMOJIS = [
  '😀',
  '😂',
  '❤️',
  '👍',
  '🎉',
  '🔥',
  '😢',
  '🙏',
  '💰',
  '✅',
];
const PAYMENT_REMINDER_TYPE = 'payment_reminder';

const ChatScreen: React.FC<Props> = ({ route, navigation }) => {
  const { conversationId, title, type } = route.params;
  const { user } = useAppSelector(state => state.auth);
  const flatListRef = useRef<FlatList>(null);

  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(
    null,
  );
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [selectedReminderUser, setSelectedReminderUser] = useState<any>(null);

  // Set header title to the conversation name
  useEffect(() => {
    navigation.setOptions({ headerTitle: title });
  }, [navigation, title]);

  const { data, loading, refetch, fetchMore } = useQuery<any>(GET_MESSAGES, {
    variables: { conversationId, limit: 50 },
    fetchPolicy: 'cache-and-network',
    pollInterval: 3000,
  });

  // Get conversation details for participants (used for group payment reminders)
  const { data: convData } = useQuery<any>(GET_CONVERSATIONS, {
    fetchPolicy: 'cache-first',
  });

  const currentConversation = convData?.getConversations?.find(
    (c: any) => c.id === conversationId,
  );
  const participants =
    currentConversation?.participants?.filter(
      (p: any) => p.userId !== user?.id,
    ) || [];

  const [sendMessage] = useMutation<any>(SEND_MESSAGE, {
    onCompleted: () => {
      refetch();
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        200,
      );
    },
  });

  const [addReaction] = useMutation<any>(ADD_REACTION, {
    onCompleted: () => refetch(),
  });

  const [removeReaction] = useMutation<any>(REMOVE_REACTION, {
    onCompleted: () => refetch(),
  });

  const messages = data?.getMessages || [];

  const handleSend = () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    setShowEmojiPicker(false);
    sendMessage({
      variables: { conversationId, body: text, type: 'text' },
      optimisticResponse: {
        sendMessage: {
          __typename: 'ChatMessage',
          id: `temp-${Date.now()}`,
          conversationId,
          seq: messages.length + 1,
          senderId: user?.id,
          type: 'text',
          body: text,
          metadata: null,
          createdAt: String(Date.now()),
          sender: {
            __typename: 'User',
            id: user?.id,
            name: user?.name || '',
            imageUrl: user?.imageUrl || null,
          },
          reactions: [],
        },
      },
    });
  };

  const handlePaymentReminderPress = () => {
    if (type === 'direct') {
      // For DM: show popup directly with the other user's balance
      const otherPart = participants[0];
      if (otherPart) {
        setSelectedReminderUser(otherPart.user);
        setReminderModalVisible(true);
      }
    } else {
      // For group: let user select a member first
      setReminderModalVisible(true);
      setSelectedReminderUser(null);
    }
  };

  const sendPaymentReminder = () => {
    const targetName = selectedReminderUser?.name || 'everyone';
    sendMessage({
      variables: {
        conversationId,
        body: `💰 Payment Reminder for ${targetName}: Please settle your pending dues!`,
        type: PAYMENT_REMINDER_TYPE,
        metadata: JSON.stringify({
          reminderType: 'payment',
          targetUserId: selectedReminderUser?.id,
        }),
      },
    });
    setReminderModalVisible(false);
    setSelectedReminderUser(null);
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

  const handleReaction = (messageId: string, emoji: string) => {
    const msg = messages.find((m: any) => m.id === messageId);
    const existingReaction = msg?.reactions?.find(
      (r: any) => r.userId === user?.id && r.reaction === emoji,
    );
    if (existingReaction) {
      removeReaction({ variables: { messageId, reaction: emoji } });
    } else {
      addReaction({ variables: { messageId, reaction: emoji } });
    }
    setSelectedMessageId(null);
  };

  const handleLoadEarlier = () => {
    if (messages.length > 0) {
      const firstSeq = messages[0]?.seq;
      fetchMore({
        variables: { conversationId, limit: 30, before: firstSeq },
        updateQuery: (prev: any, { fetchMoreResult }: any) => {
          if (!fetchMoreResult) return prev;
          return {
            getMessages: [...fetchMoreResult.getMessages, ...prev.getMessages],
          };
        },
      });
    }
  };

  const formatTime = (ts: string) => {
    return new Date(Number(ts)).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const groupReactions = (reactions: any[]) => {
    const map: Record<string, number> = {};
    reactions.forEach((r: any) => {
      map[r.reaction] = (map[r.reaction] || 0) + 1;
    });
    return Object.entries(map).map(([reaction, count]) => ({
      reaction,
      count,
    }));
  };

  const renderMessage = ({ item }: { item: any }) => {
    const isMe = item.senderId === user?.id;
    const isPaymentReminder = item.type === PAYMENT_REMINDER_TYPE;
    const isSelected = selectedMessageId === item.id;

    if (isPaymentReminder) {
      return (
        <View style={styles.reminderContainer}>
          <View style={styles.reminderCard}>
            <Text style={styles.reminderIcon}>💰</Text>
            <View style={styles.reminderContent}>
              <Text style={styles.reminderTitle}>Payment Reminder</Text>
              <Text style={styles.reminderBody}>
                {isMe ? 'You sent' : item.sender?.name + ' sent'} a payment
                reminder
              </Text>
            </View>
            <Text style={styles.reminderTime}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
        </View>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onLongPress={() => setSelectedMessageId(isSelected ? null : item.id)}
        style={[
          styles.bubbleWrapper,
          isMe ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft,
        ]}
      >
        {!isMe && <Text style={styles.senderName}>{item.sender?.name}</Text>}
        <View
          style={[
            styles.bubble,
            isMe ? styles.bubbleSent : styles.bubbleReceived,
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              isMe ? styles.bubbleTextSent : styles.bubbleTextReceived,
            ]}
          >
            {item.body}
          </Text>
          <Text
            style={[
              styles.bubbleTime,
              isMe ? styles.bubbleTimeSent : styles.bubbleTimeReceived,
            ]}
          >
            {formatTime(item.createdAt)}
          </Text>
        </View>

        {item.reactions && item.reactions.length > 0 && (
          <View style={styles.reactionsRow}>
            {groupReactions(item.reactions).map((r: any) => (
              <TouchableOpacity
                key={r.reaction}
                style={styles.reactionBadge}
                onPress={() => handleReaction(item.id, r.reaction)}
              >
                <Text style={styles.reactionText}>
                  {r.reaction} {r.count > 1 ? r.count : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {isSelected && (
          <View style={styles.quickReactions}>
            {['❤️', '👍', '😂', '😢', '🔥'].map(emoji => (
              <TouchableOpacity
                key={emoji}
                onPress={() => handleReaction(item.id, emoji)}
                style={styles.quickReactionBtn}
              >
                <Text style={styles.quickReactionText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {loading && messages.length === 0 && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item: any) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: false })
        }
        ListHeaderComponent={
          messages.length >= 50 ? (
            <TouchableOpacity
              style={styles.loadMoreBtn}
              onPress={handleLoadEarlier}
            >
              <Text style={styles.loadMoreText}>Load earlier messages</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <View style={styles.emojiPicker}>
          {QUICK_EMOJIS.map(emoji => (
            <TouchableOpacity
              key={emoji}
              onPress={() => handleEmojiSelect(emoji)}
              style={styles.emojiBtn}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TouchableOpacity
          style={styles.emojiToggle}
          onPress={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          <Text style={styles.emojiToggleText}>😊</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reminderIconBtn}
          onPress={handlePaymentReminderPress}
        >
          <Text style={styles.reminderBtnText}>💰</Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={inputText}
          onChangeText={setInputText}
          placeholderTextColor="#94a3b8"
          multiline
          onFocus={() => setShowEmojiPicker(false)}
        />

        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim()}
        >
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>

      {/* Payment Reminder Modal */}
      <Modal visible={reminderModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💰 Payment Reminder</Text>

            {type === 'group' && !selectedReminderUser ? (
              <>
                <Text style={styles.modalSubtitle}>Select a member:</Text>
                {participants.map((p: any) => (
                  <TouchableOpacity
                    key={p.userId}
                    style={styles.memberItem}
                    onPress={() => setSelectedReminderUser(p.user)}
                  >
                    <View style={styles.memberAvatar}>
                      <Text style={styles.memberAvatarText}>
                        {p.user?.name?.charAt(0).toUpperCase() || '?'}
                      </Text>
                    </View>
                    <Text style={styles.memberName}>{p.user?.name}</Text>
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <>
                <Text style={styles.modalSubtitle}>
                  Send reminder to {selectedReminderUser?.name || 'User'}
                </Text>
                <View style={styles.reminderActions}>
                  <TouchableOpacity
                    style={styles.sendReminderBtn}
                    onPress={sendPaymentReminder}
                  >
                    <Text style={styles.sendReminderBtnText}>
                      Send Reminder
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <TouchableOpacity
              style={styles.cancelModalBtn}
              onPress={() => {
                setReminderModalVisible(false);
                setSelectedReminderUser(null);
              }}
            >
              <Text style={styles.cancelModalBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f2f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageList: { padding: 12, paddingBottom: 8 },
  bubbleWrapper: { marginBottom: 6, maxWidth: '80%' },
  bubbleWrapperRight: { alignSelf: 'flex-end' },
  bubbleWrapperLeft: { alignSelf: 'flex-start' },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
    marginBottom: 2,
    marginLeft: 12,
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 80,
  },
  bubbleSent: {
    backgroundColor: '#667eea',
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextSent: { color: '#fff' },
  bubbleTextReceived: { color: '#1e293b' },
  bubbleTime: { fontSize: 11, marginTop: 4, alignSelf: 'flex-end' },
  bubbleTimeSent: { color: 'rgba(255,255,255,0.7)' },
  bubbleTimeReceived: { color: '#94a3b8' },
  reactionsRow: {
    flexDirection: 'row',
    marginTop: 4,
    marginLeft: 8,
    gap: 4,
  },
  reactionBadge: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  reactionText: { fontSize: 14 },
  quickReactions: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 6,
    marginTop: 4,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    alignSelf: 'center',
  },
  quickReactionBtn: { padding: 6 },
  quickReactionText: { fontSize: 20 },
  reminderContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  reminderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef9c3',
    borderRadius: 14,
    padding: 14,
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  reminderIcon: { fontSize: 28, marginRight: 12 },
  reminderContent: { flex: 1 },
  reminderTitle: { fontSize: 14, fontWeight: '700', color: '#92400e' },
  reminderBody: { fontSize: 13, color: '#a16207', marginTop: 2 },
  reminderTime: { fontSize: 11, color: '#a16207' },
  loadMoreBtn: {
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  loadMoreText: { color: '#667eea', fontWeight: '600', fontSize: 14 },
  emojiPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
    justifyContent: 'center',
  },
  emojiBtn: { padding: 8 },
  emojiText: { fontSize: 26 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 6,
  },
  emojiToggle: { padding: 8 },
  emojiToggleText: { fontSize: 22 },
  reminderIconBtn: { padding: 8 },
  reminderBtnText: { fontSize: 22 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    backgroundColor: '#f8fafc',
    color: '#1e293b',
  },
  sendBtn: {
    backgroundColor: '#667eea',
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontSize: 20, marginLeft: 2 },
  // Payment Reminder Modal
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
    marginBottom: 12,
  },
  modalSubtitle: { fontSize: 15, color: '#64748b', marginBottom: 12 },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e7ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  memberAvatarText: { fontSize: 16, fontWeight: '700', color: '#667eea' },
  memberName: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  reminderActions: { marginTop: 12 },
  sendReminderBtn: {
    backgroundColor: '#667eea',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  sendReminderBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  cancelModalBtn: {
    marginTop: 12,
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
  },
  cancelModalBtnText: { color: '#475569', fontWeight: '700', fontSize: 15 },
});
