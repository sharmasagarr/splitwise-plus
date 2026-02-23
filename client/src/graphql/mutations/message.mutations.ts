import { gql } from '@apollo/client';

export const SEND_MESSAGE = gql`
  mutation SendMessage(
    $conversationId: String!
    $body: String!
    $type: String
    $metadata: String
  ) {
    sendMessage(
      conversationId: $conversationId
      body: $body
      type: $type
      metadata: $metadata
    ) {
      id
      conversationId
      seq
      senderId
      type
      body
      metadata
      createdAt
      sender {
        id
        name
      }
      reactions {
        id
        reaction
        userId
      }
    }
  }
`;

export const START_DIRECT_CONVERSATION = gql`
  mutation StartDirectConversation($userId: String!) {
    startDirectConversation(userId: $userId) {
      id
      type
      title
      updatedAt
      participants {
        id
        userId
        user {
          id
          name
          email
          imageUrl
        }
      }
      lastMessage {
        id
        body
        createdAt
      }
    }
  }
`;

export const ADD_REACTION = gql`
  mutation AddReaction($messageId: String!, $reaction: String!) {
    addReaction(messageId: $messageId, reaction: $reaction)
  }
`;

export const REMOVE_REACTION = gql`
  mutation RemoveReaction($messageId: String!, $reaction: String!) {
    removeReaction(messageId: $messageId, reaction: $reaction)
  }
`;
