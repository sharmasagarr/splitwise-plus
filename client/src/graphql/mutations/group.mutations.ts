import { gql } from '@apollo/client';

export const CREATE_GROUP = gql`
  mutation CreateGroup(
    $name: String!
    $description: String
    $imageUrl: String
    $memberEmails: [String!]
  ) {
    createGroup(
      name: $name
      description: $description
      imageUrl: $imageUrl
      memberEmails: $memberEmails
    ) {
      id
      name
      description
      imageUrl
      ownerId
      createdAt
      members {
        id
        role
        user {
          id
          name
          email
          imageUrl
        }
      }
    }
  }
`;

export const UPDATE_GROUP = gql`
  mutation UpdateGroup(
    $id: String!
    $name: String
    $description: String
    $imageUrl: String
  ) {
    updateGroup(
      id: $id
      name: $name
      description: $description
      imageUrl: $imageUrl
    ) {
      id
      name
      description
      imageUrl
      ownerId
      createdAt
      members {
        id
        role
        user {
          id
          name
          email
          imageUrl
        }
      }
    }
  }
`;

export const JOIN_GROUP = gql`
  mutation JoinGroup($token: String!) {
    joinGroup(token: $token)
  }
`;

export const INVITE_TO_GROUP = gql`
  mutation InviteToGroup($groupId: String!, $userIds: [String!]!) {
    inviteToGroup(groupId: $groupId, userIds: $userIds) {
      id
      groupId
      invitedEmail
      status
    }
  }
`;

export const REMOVE_GROUP_MEMBER = gql`
  mutation RemoveGroupMember($groupId: String!, $memberUserId: String!) {
    removeGroupMember(groupId: $groupId, memberUserId: $memberUserId) {
      id
      name
      description
      imageUrl
      ownerId
      createdAt
      members {
        id
        role
        joinedAt
        user {
          id
          name
          username
          email
          imageUrl
          upiId
        }
      }
    }
  }
`;

export const RESPOND_TO_INVITE = gql`
  mutation RespondToInvite($inviteId: String!, $accept: Boolean!) {
    respondToInvite(inviteId: $inviteId, accept: $accept)
  }
`;
