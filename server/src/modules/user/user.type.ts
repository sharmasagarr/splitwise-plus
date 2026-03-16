export const userTypeDefs = `#graphql
  type User {
    id: ID!
    name: String!
    username: String!
    bio: String
    email: String!
    phone: String
    imageUrl: String
    upiId: String
    createdAt: String!
    updatedAt: String!
  }

  extend type Query {
    me: User
  }

  extend type Mutation {
    updateProfile(name: String, username: String, bio: String, imageUrl: String, phone: String, upiId: String): User!
  }
`;
