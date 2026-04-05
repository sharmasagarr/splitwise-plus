import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useApolloClient } from '@apollo/client/react';
import { useHeaderHeight } from '@react-navigation/elements';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../components/AppText';
import AppTextInput from '../components/AppTextInput';
import Icon from '../components/Icon';
import { GET_CONVERSATIONS, GET_MESSAGES } from '../graphql';
import {
  useGetConversations,
  useGetMessages,
  useSendMessage,
} from '../services';
import { useAppSelector } from '../store/hooks';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigations/RootStack';

type Props = NativeStackScreenProps<RootStackParamList, 'ChatScreen'>;

type ChatReplyPreview = {
  __typename?: 'ChatReplyMessage';
  body?: string | null;
  id: string;
  sender: {
    __typename?: 'User';
    id: string;
    imageUrl?: string | null;
    name: string;
  };
  senderId: string;
  seq: number;
  type: string;
};

type ChatMessageItem = {
  __typename?: 'ChatMessage';
  body?: string | null;
  conversationId: string;
  createdAt: string;
  id: string;
  metadata?: string | null;
  reactions: Array<{
    __typename?: 'ChatReaction';
    id: string;
    reaction: string;
    userId: string;
  }>;
  replyToMessage?: ChatReplyPreview | null;
  replyToSeq?: number | null;
  sender: {
    __typename?: 'User';
    id: string;
    imageUrl?: string | null;
    name: string;
  };
  senderId: string;
  seq: number;
  type: string;
};

type ChatHeaderTitleProps = {
  imageUrl?: string | null;
  title: string;
};

type ReplySwipeBubbleProps = {
  currentUserId?: string;
  isMe: boolean;
  item: ChatMessageItem;
  onReply: (message: ChatMessageItem) => void;
  showSenderName: boolean;
};

const MAX_SWIPE_DISTANCE = 84;
const REPLY_TRIGGER_DISTANCE = 54;

const formatTime = (value: string) => {
  const numeric = Number(value);
  const date = Number.isFinite(numeric) ? new Date(numeric) : new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getReplyPreviewText = (message?: {
  body?: string | null;
  type?: string;
}) => {
  if (message?.body?.trim()) return message.body.trim();

  switch (message?.type) {
    case 'image':
      return 'Photo';
    case 'payment_reminder':
      return 'Payment reminder';
    default:
      return 'Message';
  }
};

const getReplySenderLabel = (
  message:
    | ChatMessageItem
    | ChatReplyPreview
    | null
    | undefined,
  currentUserId?: string,
) => {
  if (!message) return 'Unknown';
  return message.senderId === currentUserId ? 'You' : message.sender?.name || 'Unknown';
};

const ChatHeaderTitle = ({ imageUrl, title }: ChatHeaderTitleProps) => {
  const initial = (title || 'C').charAt(0).toUpperCase();

  return (
    <View style={styles.headerTitleWrap}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.headerAvatarImage} />
      ) : (
        <View style={styles.headerAvatarFallback}>
          <AppText style={styles.headerAvatarFallbackText}>{initial}</AppText>
        </View>
      )}
      <AppText numberOfLines={1} style={styles.headerTitleText}>
        {title}
      </AppText>
    </View>
  );
};

const ReplySwipeBubble = memo(
  ({
    currentUserId,
    isMe,
    item,
    onReply,
    showSenderName,
  }: ReplySwipeBubbleProps) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const replyIndicatorOpacity = useMemo(
      () =>
        translateX.interpolate({
          inputRange: [0, 10, 22, MAX_SWIPE_DISTANCE],
          outputRange: [0, 0, 0.8, 1],
          extrapolate: 'clamp',
        }),
      [translateX],
    );
    const replyIndicatorScale = useMemo(
      () =>
        translateX.interpolate({
          inputRange: [0, 14, MAX_SWIPE_DISTANCE],
          outputRange: [0.72, 0.86, 1],
          extrapolate: 'clamp',
        }),
      [translateX],
    );
    const replyIndicatorTranslateX = useMemo(
      () =>
        translateX.interpolate({
          inputRange: [0, MAX_SWIPE_DISTANCE],
          outputRange: [-8, 0],
          extrapolate: 'clamp',
        }),
      [translateX],
    );

    const resetPosition = useCallback(() => {
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 18,
      }).start();
    }, [translateX]);

    const triggerReply = useCallback(() => {
      onReply(item);
      resetPosition();
    }, [item, onReply, resetPosition]);
    
    const panResponder = useMemo(
      () =>
        PanResponder.create({
          onMoveShouldSetPanResponder: (_event, gestureState) => {
            return (
              gestureState.dx > 12 &&
              Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.4
            );
          },
          onPanResponderMove: (_event, gestureState) => {
            const nextOffset = Math.min(
              Math.max(gestureState.dx, 0),
              MAX_SWIPE_DISTANCE,
            );
            translateX.setValue(nextOffset);
          },
          onPanResponderRelease: (_event, gestureState) => {
            if (gestureState.dx >= REPLY_TRIGGER_DISTANCE) {
              triggerReply();
              return;
            }

            resetPosition();
          },
          onPanResponderTerminate: resetPosition,
          onPanResponderTerminationRequest: () => true,
        }),
      [resetPosition, translateX, triggerReply],
    );

    return (
      <View style={styles.messageRow}>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.replyAction,
            {
              opacity: replyIndicatorOpacity,
              transform: [
                { translateX: replyIndicatorTranslateX },
                { scale: replyIndicatorScale },
              ],
            },
          ]}
        >
          <View style={styles.replyActionCircle}>
            <View style={styles.replyActionIconWrap}>
              <Icon name="DownArrow" width={14} height={14} color="#4f46e5" />
            </View>
          </View>
        </Animated.View>

        <Animated.View
          {...panResponder.panHandlers}
          style={[
            styles.bubbleWrapper,
            isMe ? styles.bubbleWrapperRight : styles.bubbleWrapperLeft,
            { transform: [{ translateX }] },
          ]}
        >
          {showSenderName ? (
            <AppText style={styles.senderName}>{item.sender?.name}</AppText>
          ) : null}

          <View
            style={[
              styles.bubble,
              isMe ? styles.bubbleSent : styles.bubbleReceived,
            ]}
          >
            {item.replyToMessage ? (
              <View
                style={[
                  styles.replySnippet,
                  isMe
                    ? styles.replySnippetSent
                    : styles.replySnippetReceived,
                ]}
              >
                <View
                  style={[
                    styles.replySnippetAccent,
                    isMe
                      ? styles.replySnippetAccentSent
                      : styles.replySnippetAccentReceived,
                  ]}
                />
                <View style={styles.replySnippetTextWrap}>
                  <AppText
                    numberOfLines={1}
                    style={[
                      styles.replySnippetName,
                      isMe
                        ? styles.replySnippetNameSent
                        : styles.replySnippetNameReceived,
                    ]}
                  >
                    {getReplySenderLabel(item.replyToMessage, currentUserId)}
                  </AppText>
                  <AppText
                    numberOfLines={1}
                    style={[
                      styles.replySnippetBody,
                      isMe
                        ? styles.replySnippetBodySent
                        : styles.replySnippetBodyReceived,
                    ]}
                  >
                    {getReplyPreviewText(item.replyToMessage)}
                  </AppText>
                </View>
              </View>
            ) : null}

            <AppText
              style={[
                styles.bubbleText,
                isMe ? styles.bubbleTextSent : styles.bubbleTextReceived,
              ]}
            >
              {item.body}
            </AppText>
            <AppText
              style={[
                styles.bubbleTime,
                isMe ? styles.bubbleTimeSent : styles.bubbleTimeReceived,
              ]}
            >
              {formatTime(item.createdAt)}
            </AppText>
          </View>
        </Animated.View>
      </View>
    );
  },
);

ReplySwipeBubble.displayName = 'ReplySwipeBubble';

export default function ChatScreen({ route, navigation }: Props) {
  const { conversationId, title, type } = route.params;
  const { user } = useAppSelector(state => state.auth);
  const client = useApolloClient();
  const flatListRef = useRef<FlatList<ChatMessageItem>>(null);
  const inputRef = useRef<TextInput>(null);
  const lastRenderedMessageIdRef = useRef<string | null>(null);
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessageItem | null>(null);

  const inputBarInsetStyle = useMemo(
    () => ({
      paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, 4) : 0,
    }),
    [insets.bottom],
  );

  const { data, loading, fetchMore, refetch } = useGetMessages(conversationId, {
    limit: 50,
    pollInterval: 1800,
  });

  const { data: conversationsData, refetch: refetchConversations } =
    useGetConversations({
      fetchPolicy: 'cache-first',
    });

  const [sendMessage, { loading: sendingMessage }] = useSendMessage();

  const messages: ChatMessageItem[] = useMemo(
    () => data?.getMessages ?? [],
    [data?.getMessages],
  );
  const showInitialLoader = loading && !data;
  const activeConversation = conversationsData?.getConversations?.find(
    (conversation: any) => conversation.id === conversationId,
  );

  const headerAvatarUrl =
    type === 'group'
      ? activeConversation?.imageUrl || null
      : activeConversation?.participants?.find(
          (participant: any) => participant.userId !== user?.id,
        )?.user?.imageUrl || null;

  const renderHeaderTitle = useCallback(
    () => <ChatHeaderTitle imageUrl={headerAvatarUrl} title={title} />,
    [headerAvatarUrl, title],
  );

  useEffect(() => {
    navigation.setOptions({
      headerTitleAlign: 'left',
      headerTitle: renderHeaderTitle,
    });
  }, [navigation, renderHeaderTitle]);

  useFocusEffect(
    useCallback(() => {
      refetch().catch(() => {});
      refetchConversations().catch(() => {});
    }, [refetch, refetchConversations]),
  );

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    const lastMessageId = messages[messages.length - 1]?.id ?? null;

    if (lastMessageId && lastMessageId !== lastRenderedMessageIdRef.current) {
      scrollToBottom(lastRenderedMessageIdRef.current !== null);
    }

    lastRenderedMessageIdRef.current = lastMessageId;
  }, [messages, scrollToBottom]);

  const focusComposer = useCallback(() => {
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      scrollToBottom(true);
    });
  }, [scrollToBottom]);

  const handleReplySelect = useCallback(
    (message: ChatMessageItem) => {
      setReplyingTo(message);
      focusComposer();
    },
    [focusComposer],
  );

  const clearReply = useCallback(() => {
    setReplyingTo(null);
  }, []);

  const writeMessageIntoCache = useCallback(
    (message: ChatMessageItem) => {
      try {
        const variables = { conversationId, limit: 50 };
        const existing = client.readQuery<any>({
          query: GET_MESSAGES,
          variables,
        });

        if (existing?.getMessages) {
          const nextMessages = [
            ...existing.getMessages.filter(
              (item: ChatMessageItem) => item.id !== message.id,
            ),
            message,
          ]
            .sort((a: ChatMessageItem, b: ChatMessageItem) => a.seq - b.seq)
            .slice(-50);

          client.writeQuery({
            query: GET_MESSAGES,
            variables,
            data: {
              getMessages: nextMessages,
            },
          });
        }
      } catch {
        // Query may not be in cache yet.
      }

      try {
        const existing = client.readQuery<any>({
          query: GET_CONVERSATIONS,
        });

        if (existing?.getConversations) {
          const updated = existing.getConversations
            .map((conversation: any) => {
              if (conversation.id !== conversationId) return conversation;

              return {
                ...conversation,
                updatedAt: message.createdAt,
                lastMessage: {
                  __typename: 'ChatMessage',
                  id: message.id,
                  seq: message.seq,
                  senderId: message.senderId,
                  type: message.type,
                  body: message.body,
                  createdAt: message.createdAt,
                  sender: {
                    __typename: 'User',
                    id: message.sender.id,
                    name: message.sender.name,
                  },
                },
              };
            })
            .sort(
              (a: any, b: any) =>
                Number(b.lastMessage?.createdAt || b.updatedAt || 0) -
                Number(a.lastMessage?.createdAt || a.updatedAt || 0),
            );

          client.writeQuery({
            query: GET_CONVERSATIONS,
            data: {
              getConversations: updated,
            },
          });
        }
      } catch {
        // Conversations query may not be in cache yet.
      }
    },
    [client, conversationId],
  );

  const handleSend = useCallback(() => {
    const trimmedBody = inputText.trim();
    if (!trimmedBody) return;

    const replyTarget = replyingTo;
    const lastSeq = messages[messages.length - 1]?.seq || 0;
    const optimisticMessage: ChatMessageItem = {
      __typename: 'ChatMessage',
      id: `temp-${Date.now()}`,
      conversationId,
      seq: lastSeq + 1,
      senderId: user?.id || '',
      type: 'text',
      body: trimmedBody,
      metadata: null,
      replyToSeq: replyTarget?.seq ?? null,
      replyToMessage: replyTarget
        ? {
            __typename: 'ChatReplyMessage',
            id: replyTarget.id,
            seq: replyTarget.seq,
            senderId: replyTarget.senderId,
            type: replyTarget.type,
            body: replyTarget.body,
            sender: {
              __typename: 'User',
              id: replyTarget.sender.id,
              name: replyTarget.sender.name,
              imageUrl: replyTarget.sender.imageUrl || null,
            },
          }
        : null,
      createdAt: String(Date.now()),
      sender: {
        __typename: 'User',
        id: user?.id || '',
        name: user?.name || 'You',
        imageUrl: user?.imageUrl || null,
      },
      reactions: [],
    };

    setInputText('');
    setReplyingTo(null);
    scrollToBottom(true);

    sendMessage({
      variables: {
        conversationId,
        body: trimmedBody,
        type: 'text',
        replyToSeq: replyTarget?.seq,
      },
      optimisticResponse: {
        __typename: 'Mutation',
        sendMessage: optimisticMessage,
      },
      update: (_cache, result) => {
        const nextMessage = result.data?.sendMessage;
        if (!nextMessage) return;

        writeMessageIntoCache(nextMessage as ChatMessageItem);
      },
      onCompleted: async () => {
        await refetchConversations().catch(() => {});
        scrollToBottom(true);
      },
      onError: () => {
        setInputText(trimmedBody);
        setReplyingTo(replyTarget ?? null);
      },
    });
  }, [
    conversationId,
    inputText,
    messages,
    refetchConversations,
    replyingTo,
    scrollToBottom,
    sendMessage,
    user?.id,
    user?.imageUrl,
    user?.name,
    writeMessageIntoCache,
  ]);

  const handleLoadEarlier = useCallback(() => {
    if (messages.length === 0) return;

    const firstSeq = messages[0]?.seq;
    fetchMore({
      variables: { conversationId, limit: 30, before: firstSeq },
      updateQuery: (previous: any, { fetchMoreResult }: any) => {
        if (!fetchMoreResult) return previous;

        return {
          getMessages: [...fetchMoreResult.getMessages, ...previous.getMessages],
        };
      },
    });
  }, [conversationId, fetchMore, messages]);

  const renderMessage = useCallback(
    ({ item }: { item: ChatMessageItem }) => {
      const isMe = item.senderId === user?.id;
      const showSenderName = type === 'group' && !isMe;

      return (
        <ReplySwipeBubble
          currentUserId={user?.id}
          isMe={isMe}
          item={item}
          onReply={handleReplySelect}
          showSenderName={showSenderName}
        />
      );
    },
    [handleReplySelect, type, user?.id],
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        {showInitialLoader ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#667eea" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderMessage}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.messageList,
              messages.length === 0 && styles.messageListEmpty,
            ]}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <AppText style={styles.emptyTitle}>No messages yet</AppText>
                <AppText style={styles.emptySubtitle}>
                  Start the conversation with your first message.
                </AppText>
              </View>
            }
            ListHeaderComponent={
              messages.length >= 50 ? (
                <TouchableOpacity
                  style={styles.loadMoreBtn}
                  onPress={handleLoadEarlier}
                >
                  <AppText style={styles.loadMoreText}>
                    Load earlier messages
                  </AppText>
                </TouchableOpacity>
              ) : null
            }
          />
        )}

        <View style={[styles.inputBar, inputBarInsetStyle]}>
          {replyingTo ? (
            <View style={styles.replyComposerCard}>
              <View style={styles.replyComposerAccent} />
              <View style={styles.replyComposerTextWrap}>
                <AppText style={styles.replyComposerTitle}>
                  Replying to {getReplySenderLabel(replyingTo, user?.id)}
                </AppText>
                <AppText
                  numberOfLines={1}
                  style={styles.replyComposerBody}
                >
                  {getReplyPreviewText(replyingTo)}
                </AppText>
              </View>
              <TouchableOpacity
                onPress={clearReply}
                style={styles.replyComposerClose}
                hitSlop={10}
              >
                <Icon
                  name="CrossCircle"
                  width={18}
                  height={18}
                  color="#94a3b8"
                />
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.composerRow}>
            <AppTextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Type a message..."
              value={inputText}
              onChangeText={setInputText}
              placeholderTextColor="#94a3b8"
              multiline
              onFocus={() => scrollToBottom(true)}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!inputText.trim() || sendingMessage) && styles.sendBtnDisabled,
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || sendingMessage}
              activeOpacity={0.88}
            >
              <Icon name="Send" width={20} height={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 220,
  },
  headerAvatarImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#e2e8f0',
    marginRight: 10,
  },
  headerAvatarFallback: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerAvatarFallbackText: {
    color: '#4338ca',
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitleText: {
    color: '#1e293b',
    fontSize: 17,
    fontWeight: '700',
  },
  container: {
    flex: 1,
    backgroundColor: '#f0f2f5',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageList: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 8,
  },
  messageListEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  emptyTitle: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
  },
  messageRow: {
    width: '100%',
    position: 'relative',
    marginBottom: 6,
    justifyContent: 'center',
  },
  replyAction: {
    position: 'absolute',
    left: 4,
    top: '50%',
    marginTop: -18,
  },
  replyActionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyActionIconWrap: {
    transform: [{ rotate: '90deg' }],
  },
  bubbleWrapper: {
    maxWidth: '82%',
  },
  bubbleWrapperRight: {
    alignSelf: 'flex-end',
  },
  bubbleWrapperLeft: {
    alignSelf: 'flex-start',
  },
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
    minWidth: 88,
  },
  bubbleSent: {
    backgroundColor: '#667eea',
    borderBottomRightRadius: 4,
  },
  bubbleReceived: {
    backgroundColor: '#ffffff',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  replySnippet: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  replySnippetSent: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  replySnippetReceived: {
    backgroundColor: '#f8fafc',
  },
  replySnippetAccent: {
    width: 4,
  },
  replySnippetAccentSent: {
    backgroundColor: '#c7d2fe',
  },
  replySnippetAccentReceived: {
    backgroundColor: '#667eea',
  },
  replySnippetTextWrap: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  replySnippetName: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  replySnippetNameSent: {
    color: '#ffffff',
  },
  replySnippetNameReceived: {
    color: '#4338ca',
  },
  replySnippetBody: {
    fontSize: 12,
    lineHeight: 16,
  },
  replySnippetBodySent: {
    color: 'rgba(255,255,255,0.82)',
  },
  replySnippetBodyReceived: {
    color: '#64748b',
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  bubbleTextSent: {
    color: '#ffffff',
  },
  bubbleTextReceived: {
    color: '#1e293b',
  },
  bubbleTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  bubbleTimeSent: {
    color: 'rgba(255,255,255,0.7)',
  },
  bubbleTimeReceived: {
    color: '#94a3b8',
  },
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  loadMoreText: {
    color: '#667eea',
    fontWeight: '600',
    fontSize: 14,
  },
  inputBar: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  replyComposerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  replyComposerAccent: {
    width: 4,
    height: '100%',
    minHeight: 34,
    borderRadius: 999,
    backgroundColor: '#667eea',
    marginRight: 10,
  },
  replyComposerTextWrap: {
    flex: 1,
  },
  replyComposerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4338ca',
  },
  replyComposerBody: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  replyComposerClose: {
    marginLeft: 8,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 110,
    backgroundColor: '#f8fafc',
    color: '#1e293b',
  },
  sendBtn: {
    backgroundColor: '#667eea',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
});
