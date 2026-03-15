export const notificationTypeDefs = `#graphql
  type Notification {
    id: ID!
    type: String!
    payload: String!
    read: Boolean!
    createdAt: String!
  }

  extend type Query {
    getMyNotifications: [Notification!]!
  }

  extend type Mutation {
    registerFcmToken(token: String!): Boolean!
    markNotificationRead(id: ID!): Notification!
    markAllNotificationsRead: Boolean!
  }
`;
