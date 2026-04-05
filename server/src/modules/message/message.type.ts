export const messageTypeDefs = `#graphql
  type ChatReplyMessage {
    id: ID!
    seq: Int!
    senderId: String!
    sender: User!
    type: String!
    body: String
  }

  type ChatConversation {
    id: ID!
    type: String!
    title: String
    imageUrl: String
    updatedAt: String!
    participants: [ChatParticipant!]!
    lastMessage: ChatMessage
  }

  type ChatParticipant {
    id: ID!
    userId: String!
    role: String!
    user: User!
  }

  type ChatMessage {
    id: ID!
    conversationId: String!
    seq: Int!
    senderId: String!
    sender: User!
    type: String!
    body: String
    metadata: String
    replyToSeq: Int
    replyToMessage: ChatReplyMessage
    reactions: [ChatReaction!]!
    createdAt: String!
  }

  type ChatReaction {
    id: ID!
    messageId: String!
    userId: String!
    reaction: String!
    user: User!
  }

  extend type Query {
    getConversations: [ChatConversation!]!
    getMessages(conversationId: String!, limit: Int, before: Int): [ChatMessage!]!
  }

  extend type Mutation {
    sendMessage(
      conversationId: String!
      body: String!
      type: String
      metadata: String
      replyToSeq: Int
    ): ChatMessage!
    startDirectConversation(userId: String!): ChatConversation!
    addReaction(messageId: String!, reaction: String!): Boolean!
    removeReaction(messageId: String!, reaction: String!): Boolean!
  }
`;
