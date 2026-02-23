import { gql } from '@apollo/client';

export const GET_GROUPS = gql`
  query GetGroups {
    getGroups {
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

export const GET_GROUP_DETAILS = gql`
  query GetGroupDetails($id: ID!) {
    getGroupDetails(id: $id) {
      id
      name
      description
      ownerId
      createdAt
      members {
        id
        role
        joinedAt
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

export const SEARCH_USERS = gql`
  query SearchUsers($query: String!) {
    searchUsers(query: $query) {
      id
      name
      email
      imageUrl
    }
  }
`;

export const GET_MY_INVITES = gql`
  query GetMyInvites {
    getMyInvites {
      id
      groupId
      invitedEmail
      status
      createdAt
      group {
        id
        name
        members {
          id
          user {
            id
            name
          }
        }
      }
    }
  }
`;
