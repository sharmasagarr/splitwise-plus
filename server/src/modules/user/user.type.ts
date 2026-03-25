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

  type UsernameAvailabilityResult {
    available: Boolean!
    suggestion: String
  }

  extend type Query {
    me: User
    checkUsernameAvailability(username: String!): UsernameAvailabilityResult!
  }

  extend type Mutation {
    updateProfile(name: String, username: String, bio: String, imageUrl: String, phone: String, upiId: String): User!
  }
`;
