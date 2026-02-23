import { gql } from '@apollo/client';

export const CREATE_GROUP = gql`
  mutation CreateGroup($name: String!, $memberEmails: [String!]) {
    createGroup(name: $name, memberEmails: $memberEmails) {
      id
      name
      description
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
  mutation InviteToGroup($groupId: String!, $email: String!) {
    inviteToGroup(groupId: $groupId, email: $email) {
      id
      groupId
      invitedEmail
      status
    }
  }
`;

export const RESPOND_TO_INVITE = gql`
  mutation RespondToInvite($inviteId: String!, $accept: Boolean!) {
    respondToInvite(inviteId: $inviteId, accept: $accept)
  }
`;
