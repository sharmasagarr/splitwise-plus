export const userTypeDefs = `#graphql
  type User {
    id: ID!
    name: String!
    email: String!
    phone: String
    imageUrl: String
    createdAt: String!
    updatedAt: String!
  }

  extend type Query {
    me: User
  }

  extend type Mutation {
    updateProfile(name: String, imageUrl: String, phone: String): User!
  }
`;
