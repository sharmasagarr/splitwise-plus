export const groupTypeDefs = `#graphql
  type Group {
    id: ID!
    name: String
    description: String
    ownerId: String!
    isPublic: Boolean!
    createdAt: String!
    members: [GroupMember!]!
  }

  type GroupMember {
    id: ID!
    groupId: String!
    userId: String!
    role: String!
    joinedAt: String!
    user: User!
  }

  type GroupInvite {
    id: ID!
    groupId: String
    invitedEmail: String!
    status: String!
    createdAt: String!
    group: Group
  }

  extend type Query {
    getGroups: [Group!]!
    getGroupDetails(id: ID!): Group
    searchUsers(query: String!): [User!]!
    getMyInvites: [GroupInvite!]!
  }

  extend type Mutation {
    createGroup(name: String!, memberEmails: [String!]): Group!
    joinGroup(token: String!): Boolean!
    inviteToGroup(groupId: String!, email: String!): GroupInvite!
    respondToInvite(inviteId: String!, accept: Boolean!): Boolean!
  }
`;
