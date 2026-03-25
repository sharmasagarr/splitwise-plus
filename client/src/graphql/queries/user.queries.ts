import { gql } from "@apollo/client";
import { USER_FRAGMENT } from "../fragments";

export const GET_ME = gql`
  query GetMe {
    me {
      ...UserFragment
    }
  }
  ${USER_FRAGMENT}
`;

export const CHECK_USERNAME_AVAILABILITY = gql`
  query CheckUsernameAvailability($username: String!) {
    checkUsernameAvailability(username: $username) {
      isAvailable
      suggestion
    }
  }
`;
