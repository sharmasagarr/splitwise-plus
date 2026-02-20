export const authTypeDefs = `#graphql
  type AuthResponse {
    token: String!
    user: User!
  }

  extend type Mutation {
    signup(name: String!, email: String!, password: String!): AuthResponse!
    login(email: String!, password: String!): AuthResponse!
  }
`;
