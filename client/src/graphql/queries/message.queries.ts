import { gql } from '@apollo/client';

export const GET_CONVERSATIONS = gql`
  query GetConversations {
    getConversations {
      id
      type
      title
      imageUrl
      updatedAt
      participants {
        id
        userId
        role
        user {
          id
          name
          email
          imageUrl
        }
      }
      lastMessage {
        id
        seq
        senderId
        type
        body
        createdAt
        sender {
          id
          name
        }
      }
    }
  }
`;

export const GET_MESSAGES = gql`
  query GetMessages($conversationId: String!, $limit: Int, $before: Int) {
    getMessages(
      conversationId: $conversationId
      limit: $limit
      before: $before
    ) {
      id
      conversationId
      seq
      senderId
      type
      body
      metadata
      replyToSeq
      replyToMessage {
        id
        seq
        senderId
        type
        body
        sender {
          id
          name
          imageUrl
        }
      }
      createdAt
      sender {
        id
        name
        imageUrl
      }
      reactions {
        id
        messageId
        userId
        reaction
        user {
          id
          name
        }
      }
    }
  }
`;
