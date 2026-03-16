export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
export type MakeEmpty<
  T extends { [key: string]: unknown },
  K extends keyof T,
> = { [_ in K]?: never };
export type Incremental<T> =
  | T
  | {
      [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never;
    };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string };
  String: { input: string; output: string };
  Boolean: { input: boolean; output: boolean };
  Int: { input: number; output: number };
  Float: { input: number; output: number };
};

export type AuthResponse = {
  __typename?: 'AuthResponse';
  token: Scalars['String']['output'];
  user: User;
};

export type BalanceSummary = {
  __typename?: 'BalanceSummary';
  oweList: Array<UserBalance>;
  owedList: Array<UserBalance>;
  totalOwe: Scalars['Float']['output'];
  totalOwed: Scalars['Float']['output'];
};

export type ChatConversation = {
  __typename?: 'ChatConversation';
  id: Scalars['ID']['output'];
  lastMessage?: Maybe<ChatMessage>;
  participants: Array<ChatParticipant>;
  title?: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
};

export type ChatMessage = {
  __typename?: 'ChatMessage';
  body?: Maybe<Scalars['String']['output']>;
  conversationId: Scalars['String']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  metadata?: Maybe<Scalars['String']['output']>;
  reactions: Array<ChatReaction>;
  sender: User;
  senderId: Scalars['String']['output'];
  seq: Scalars['Int']['output'];
  type: Scalars['String']['output'];
};

export type ChatParticipant = {
  __typename?: 'ChatParticipant';
  id: Scalars['ID']['output'];
  role: Scalars['String']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

export type ChatReaction = {
  __typename?: 'ChatReaction';
  id: Scalars['ID']['output'];
  messageId: Scalars['String']['output'];
  reaction: Scalars['String']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

export type Expense = {
  __typename?: 'Expense';
  createdAt: Scalars['String']['output'];
  createdBy: User;
  createdById: Scalars['String']['output'];
  currency: Scalars['String']['output'];
  groupId?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  note?: Maybe<Scalars['String']['output']>;
  shares: Array<ExpenseShare>;
  totalAmount: Scalars['Float']['output'];
};

export type ExpenseShare = {
  __typename?: 'ExpenseShare';
  expenseId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  paidAmount: Scalars['Float']['output'];
  shareAmount: Scalars['Float']['output'];
  status: Scalars['String']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

export type Group = {
  __typename?: 'Group';
  createdAt: Scalars['String']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  isPublic: Scalars['Boolean']['output'];
  members: Array<GroupMember>;
  name?: Maybe<Scalars['String']['output']>;
  ownerId: Scalars['String']['output'];
};

export type GroupInvite = {
  __typename?: 'GroupInvite';
  createdAt: Scalars['String']['output'];
  group?: Maybe<Group>;
  groupId?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  invitedEmail: Scalars['String']['output'];
  status: Scalars['String']['output'];
};

export type GroupMember = {
  __typename?: 'GroupMember';
  groupId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  joinedAt: Scalars['String']['output'];
  role: Scalars['String']['output'];
  user: User;
  userId: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  _empty?: Maybe<Scalars['String']['output']>;
  addReaction: Scalars['Boolean']['output'];
  createExpense: Expense;
  createGroup: Group;
  inviteToGroup: GroupInvite;
  joinGroup: Scalars['Boolean']['output'];
  login: AuthResponse;
  logout: Scalars['Boolean']['output'];
  markAllNotificationsRead: Scalars['Boolean']['output'];
  markNotificationRead: Notification;
  registerFcmToken: Scalars['Boolean']['output'];
  removeReaction: Scalars['Boolean']['output'];
  respondToInvite: Scalars['Boolean']['output'];
  sendMessage: ChatMessage;
  settleExpense: Settlement;
  signup: AuthResponse;
  startDirectConversation: ChatConversation;
  updateProfile: User;
};

export type MutationAddReactionArgs = {
  messageId: Scalars['String']['input'];
  reaction: Scalars['String']['input'];
};

export type MutationCreateExpenseArgs = {
  amount: Scalars['Float']['input'];
  description: Scalars['String']['input'];
  groupId: Scalars['String']['input'];
  participants: Array<Scalars['String']['input']>;
};

export type MutationCreateGroupArgs = {
  memberEmails?: InputMaybe<Array<Scalars['String']['input']>>;
  name: Scalars['String']['input'];
};

export type MutationInviteToGroupArgs = {
  email: Scalars['String']['input'];
  groupId: Scalars['String']['input'];
};

export type MutationJoinGroupArgs = {
  token: Scalars['String']['input'];
};

export type MutationLoginArgs = {
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type MutationMarkNotificationReadArgs = {
  id: Scalars['ID']['input'];
};

export type MutationRegisterFcmTokenArgs = {
  token: Scalars['String']['input'];
};

export type MutationRemoveReactionArgs = {
  messageId: Scalars['String']['input'];
  reaction: Scalars['String']['input'];
};

export type MutationRespondToInviteArgs = {
  accept: Scalars['Boolean']['input'];
  inviteId: Scalars['String']['input'];
};

export type MutationSendMessageArgs = {
  body: Scalars['String']['input'];
  conversationId: Scalars['String']['input'];
  metadata?: InputMaybe<Scalars['String']['input']>;
  type?: InputMaybe<Scalars['String']['input']>;
};

export type MutationSettleExpenseArgs = {
  amount: Scalars['Float']['input'];
  paymentMode: Scalars['String']['input'];
  toUserId: Scalars['String']['input'];
};

export type MutationSignupArgs = {
  email: Scalars['String']['input'];
  name: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type MutationStartDirectConversationArgs = {
  userId: Scalars['String']['input'];
};

export type MutationUpdateProfileArgs = {
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
};

export type Notification = {
  __typename?: 'Notification';
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  payload: Scalars['String']['output'];
  read: Scalars['Boolean']['output'];
  type: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  _empty?: Maybe<Scalars['String']['output']>;
  getConversations: Array<ChatConversation>;
  getGroupDetails?: Maybe<Group>;
  getGroupExpenses: Array<Expense>;
  getGroups: Array<Group>;
  getMessages: Array<ChatMessage>;
  getMyBalances: BalanceSummary;
  getMyInvites: Array<GroupInvite>;
  getMyNotifications: Array<Notification>;
  getRecentActivities: Array<Expense>;
  me?: Maybe<User>;
  searchUsers: Array<User>;
};

export type QueryGetGroupDetailsArgs = {
  id: Scalars['ID']['input'];
};

export type QueryGetGroupExpensesArgs = {
  groupId: Scalars['String']['input'];
};

export type QueryGetMessagesArgs = {
  before?: InputMaybe<Scalars['Int']['input']>;
  conversationId: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
};

export type QuerySearchUsersArgs = {
  query: Scalars['String']['input'];
};

export type Settlement = {
  __typename?: 'Settlement';
  amount: Scalars['Float']['output'];
  createdAt: Scalars['String']['output'];
  currency: Scalars['String']['output'];
  fromUserId: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  paymentMethodId?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
  toUserId: Scalars['String']['output'];
};

export type User = {
  __typename?: 'User';
  bio?: Maybe<Scalars['String']['output']>;
  createdAt: Scalars['String']['output'];
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  imageUrl?: Maybe<Scalars['String']['output']>;
  name: Scalars['String']['output'];
  phone?: Maybe<Scalars['String']['output']>;
  username?: Maybe<Scalars['String']['output']>;
  upiId?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['String']['output'];
};

export type UserBalance = {
  __typename?: 'UserBalance';
  amount: Scalars['Float']['output'];
  userId: Scalars['String']['output'];
  userName: Scalars['String']['output'];
};

export type UserFragmentFragment = {
  __typename?: 'User';
  id: string;
  name: string;
  username?: string | null;
  bio?: string | null;
  email: string;
  phone?: string | null;
  imageUrl?: string | null;
  upiId?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LoginMutationVariables = Exact<{
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;

export type LoginMutation = {
  __typename?: 'Mutation';
  login: {
    __typename?: 'AuthResponse';
    token: string;
    user: {
      __typename?: 'User';
      id: string;
      name: string;
      email: string;
      phone?: string | null;
      imageUrl?: string | null;
      createdAt: string;
      updatedAt: string;
    };
  };
};

export type SignupMutationVariables = Exact<{
  name: Scalars['String']['input'];
  email: Scalars['String']['input'];
  password: Scalars['String']['input'];
}>;

export type SignupMutation = {
  __typename?: 'Mutation';
  signup: {
    __typename?: 'AuthResponse';
    token: string;
    user: {
      __typename?: 'User';
      id: string;
      name: string;
      email: string;
      phone?: string | null;
      imageUrl?: string | null;
      createdAt: string;
      updatedAt: string;
    };
  };
};

export type CreateExpenseMutationVariables = Exact<{
  groupId: Scalars['String']['input'];
  description: Scalars['String']['input'];
  amount: Scalars['Float']['input'];
  participants: Array<Scalars['String']['input']> | Scalars['String']['input'];
}>;

export type CreateExpenseMutation = {
  __typename?: 'Mutation';
  createExpense: { __typename?: 'Expense'; id: string; totalAmount: number };
};

export type SettleExpenseMutationVariables = Exact<{
  toUserId: Scalars['String']['input'];
  amount: Scalars['Float']['input'];
  paymentMode: Scalars['String']['input'];
}>;

export type SettleExpenseMutation = {
  __typename?: 'Mutation';
  settleExpense: { __typename?: 'Settlement'; id: string; status: string };
};

export type CreateGroupMutationVariables = Exact<{
  name: Scalars['String']['input'];
  memberEmails?: InputMaybe<
    Array<Scalars['String']['input']> | Scalars['String']['input']
  >;
}>;

export type CreateGroupMutation = {
  __typename?: 'Mutation';
  createGroup: {
    __typename?: 'Group';
    id: string;
    name?: string | null;
    description?: string | null;
    ownerId: string;
    createdAt: string;
    members: Array<{
      __typename?: 'GroupMember';
      id: string;
      role: string;
      user: {
        __typename?: 'User';
        id: string;
        name: string;
        email: string;
        imageUrl?: string | null;
      };
    }>;
  };
};

export type JoinGroupMutationVariables = Exact<{
  token: Scalars['String']['input'];
}>;

export type JoinGroupMutation = { __typename?: 'Mutation'; joinGroup: boolean };

export type InviteToGroupMutationVariables = Exact<{
  groupId: Scalars['String']['input'];
  email: Scalars['String']['input'];
}>;

export type InviteToGroupMutation = {
  __typename?: 'Mutation';
  inviteToGroup: {
    __typename?: 'GroupInvite';
    id: string;
    groupId?: string | null;
    invitedEmail: string;
    status: string;
  };
};

export type RespondToInviteMutationVariables = Exact<{
  inviteId: Scalars['String']['input'];
  accept: Scalars['Boolean']['input'];
}>;

export type RespondToInviteMutation = {
  __typename?: 'Mutation';
  respondToInvite: boolean;
};

export type SendMessageMutationVariables = Exact<{
  conversationId: Scalars['String']['input'];
  body: Scalars['String']['input'];
  type?: InputMaybe<Scalars['String']['input']>;
  metadata?: InputMaybe<Scalars['String']['input']>;
}>;

export type SendMessageMutation = {
  __typename?: 'Mutation';
  sendMessage: {
    __typename?: 'ChatMessage';
    id: string;
    conversationId: string;
    seq: number;
    senderId: string;
    type: string;
    body?: string | null;
    metadata?: string | null;
    createdAt: string;
    sender: { __typename?: 'User'; id: string; name: string };
    reactions: Array<{
      __typename?: 'ChatReaction';
      id: string;
      reaction: string;
      userId: string;
    }>;
  };
};

export type StartDirectConversationMutationVariables = Exact<{
  userId: Scalars['String']['input'];
}>;

export type StartDirectConversationMutation = {
  __typename?: 'Mutation';
  startDirectConversation: {
    __typename?: 'ChatConversation';
    id: string;
    type: string;
    title?: string | null;
    updatedAt: string;
    participants: Array<{
      __typename?: 'ChatParticipant';
      id: string;
      userId: string;
      user: {
        __typename?: 'User';
        id: string;
        name: string;
        email: string;
        imageUrl?: string | null;
      };
    }>;
    lastMessage?: {
      __typename?: 'ChatMessage';
      id: string;
      body?: string | null;
      createdAt: string;
    } | null;
  };
};

export type AddReactionMutationVariables = Exact<{
  messageId: Scalars['String']['input'];
  reaction: Scalars['String']['input'];
}>;

export type AddReactionMutation = {
  __typename?: 'Mutation';
  addReaction: boolean;
};

export type RemoveReactionMutationVariables = Exact<{
  messageId: Scalars['String']['input'];
  reaction: Scalars['String']['input'];
}>;

export type RemoveReactionMutation = {
  __typename?: 'Mutation';
  removeReaction: boolean;
};

export type RegisterFcmTokenMutationVariables = Exact<{
  token: Scalars['String']['input'];
}>;

export type RegisterFcmTokenMutation = {
  __typename?: 'Mutation';
  registerFcmToken: boolean;
};

export type MarkNotificationReadMutationVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type MarkNotificationReadMutation = {
  __typename?: 'Mutation';
  markNotificationRead: {
    __typename?: 'Notification';
    id: string;
    read: boolean;
  };
};

export type MarkAllNotificationsReadMutationVariables = Exact<{
  [key: string]: never;
}>;

export type MarkAllNotificationsReadMutation = {
  __typename?: 'Mutation';
  markAllNotificationsRead: boolean;
};

export type UpdateProfileMutationVariables = Exact<{
  name?: InputMaybe<Scalars['String']['input']>;
  username?: InputMaybe<Scalars['String']['input']>;
  bio?: InputMaybe<Scalars['String']['input']>;
  imageUrl?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['String']['input']>;
  upiId?: InputMaybe<Scalars['String']['input']>;
}>;

export type UpdateProfileMutation = {
  __typename?: 'Mutation';
  updateProfile: {
    __typename?: 'User';
    id: string;
    name: string;
    username?: string | null;
    bio?: string | null;
    email: string;
    phone?: string | null;
    imageUrl?: string | null;
    upiId?: string | null;
    createdAt: string;
    updatedAt: string;
  };
};

export type GetGroupExpensesQueryVariables = Exact<{
  groupId: Scalars['String']['input'];
}>;

export type GetGroupExpensesQuery = {
  __typename?: 'Query';
  getGroupExpenses: Array<{
    __typename?: 'Expense';
    id: string;
    totalAmount: number;
    currency: string;
    note?: string | null;
    createdAt: string;
    createdBy: { __typename?: 'User'; id: string; name: string };
    shares: Array<{
      __typename?: 'ExpenseShare';
      id: string;
      userId: string;
      shareAmount: number;
      paidAmount: number;
      status: string;
      user: { __typename?: 'User'; id: string; name: string };
    }>;
  }>;
};

export type GetRecentActivitiesQueryVariables = Exact<{ [key: string]: never }>;

export type GetRecentActivitiesQuery = {
  __typename?: 'Query';
  getRecentActivities: Array<{
    __typename?: 'Expense';
    id: string;
    totalAmount: number;
    currency: string;
    note?: string | null;
    createdAt: string;
    groupId?: string | null;
    createdBy: { __typename?: 'User'; id: string; name: string };
    shares: Array<{
      __typename?: 'ExpenseShare';
      id: string;
      userId: string;
      shareAmount: number;
      paidAmount: number;
      status: string;
      user: { __typename?: 'User'; id: string; name: string };
    }>;
  }>;
};

export type GetMyBalancesQueryVariables = Exact<{ [key: string]: never }>;

export type GetMyBalancesQuery = {
  __typename?: 'Query';
  getMyBalances: {
    __typename?: 'BalanceSummary';
    totalOwe: number;
    totalOwed: number;
    oweList: Array<{
      __typename?: 'UserBalance';
      userId: string;
      userName: string;
      amount: number;
    }>;
    owedList: Array<{
      __typename?: 'UserBalance';
      userId: string;
      userName: string;
      amount: number;
    }>;
  };
};

export type GetGroupsQueryVariables = Exact<{ [key: string]: never }>;

export type GetGroupsQuery = {
  __typename?: 'Query';
  getGroups: Array<{
    __typename?: 'Group';
    id: string;
    name?: string | null;
    description?: string | null;
    ownerId: string;
    createdAt: string;
    members: Array<{
      __typename?: 'GroupMember';
      id: string;
      role: string;
      user: {
        __typename?: 'User';
        id: string;
        name: string;
        email: string;
        imageUrl?: string | null;
      };
    }>;
  }>;
};

export type GetGroupDetailsQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;

export type GetGroupDetailsQuery = {
  __typename?: 'Query';
  getGroupDetails?: {
    __typename?: 'Group';
    id: string;
    name?: string | null;
    description?: string | null;
    ownerId: string;
    createdAt: string;
    members: Array<{
      __typename?: 'GroupMember';
      id: string;
      role: string;
      joinedAt: string;
      user: {
        __typename?: 'User';
        id: string;
        name: string;
        email: string;
        imageUrl?: string | null;
      };
    }>;
  } | null;
};

export type SearchUsersQueryVariables = Exact<{
  query: Scalars['String']['input'];
}>;

export type SearchUsersQuery = {
  __typename?: 'Query';
  searchUsers: Array<{
    __typename?: 'User';
    id: string;
    name: string;
    email: string;
    imageUrl?: string | null;
  }>;
};

export type GetMyInvitesQueryVariables = Exact<{ [key: string]: never }>;

export type GetMyInvitesQuery = {
  __typename?: 'Query';
  getMyInvites: Array<{
    __typename?: 'GroupInvite';
    id: string;
    groupId?: string | null;
    invitedEmail: string;
    status: string;
    createdAt: string;
    group?: {
      __typename?: 'Group';
      id: string;
      name?: string | null;
      members: Array<{
        __typename?: 'GroupMember';
        id: string;
        user: { __typename?: 'User'; id: string; name: string };
      }>;
    } | null;
  }>;
};

export type GetConversationsQueryVariables = Exact<{ [key: string]: never }>;

export type GetConversationsQuery = {
  __typename?: 'Query';
  getConversations: Array<{
    __typename?: 'ChatConversation';
    id: string;
    type: string;
    title?: string | null;
    updatedAt: string;
    participants: Array<{
      __typename?: 'ChatParticipant';
      id: string;
      userId: string;
      role: string;
      user: {
        __typename?: 'User';
        id: string;
        name: string;
        email: string;
        imageUrl?: string | null;
      };
    }>;
    lastMessage?: {
      __typename?: 'ChatMessage';
      id: string;
      seq: number;
      senderId: string;
      type: string;
      body?: string | null;
      createdAt: string;
      sender: { __typename?: 'User'; id: string; name: string };
    } | null;
  }>;
};

export type GetMessagesQueryVariables = Exact<{
  conversationId: Scalars['String']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  before?: InputMaybe<Scalars['Int']['input']>;
}>;

export type GetMessagesQuery = {
  __typename?: 'Query';
  getMessages: Array<{
    __typename?: 'ChatMessage';
    id: string;
    conversationId: string;
    seq: number;
    senderId: string;
    type: string;
    body?: string | null;
    metadata?: string | null;
    createdAt: string;
    sender: {
      __typename?: 'User';
      id: string;
      name: string;
      imageUrl?: string | null;
    };
    reactions: Array<{
      __typename?: 'ChatReaction';
      id: string;
      messageId: string;
      userId: string;
      reaction: string;
      user: { __typename?: 'User'; id: string; name: string };
    }>;
  }>;
};

export type GetMyNotificationsQueryVariables = Exact<{ [key: string]: never }>;

export type GetMyNotificationsQuery = {
  __typename?: 'Query';
  getMyNotifications: Array<{
    __typename?: 'Notification';
    id: string;
    type: string;
    payload: string;
    read: boolean;
    createdAt: string;
  }>;
};

export type GetMeQueryVariables = Exact<{ [key: string]: never }>;

export type GetMeQuery = {
  __typename?: 'Query';
  me?: {
    __typename?: 'User';
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    imageUrl?: string | null;
    upiId?: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
};
