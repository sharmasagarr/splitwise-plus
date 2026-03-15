export const authTypeDefs = `#graphql
  type AuthResponse {
    token: String!
    user: User!
  }

  type OtpResponse {
    success: Boolean!
    message: String!
    email: String!
  }

  extend type Mutation {
    signup(name: String!, email: String!, password: String!): OtpResponse!
    verifySignupOtp(email: String!, otp: String!): AuthResponse!
    resendSignupOtp(email: String!): OtpResponse!
    login(email: String!, password: String!): AuthResponse!
    logout: Boolean!
  }
`;
