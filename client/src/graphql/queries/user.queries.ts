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