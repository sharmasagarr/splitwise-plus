import { gql } from '@apollo/client';

export const USER_FRAGMENT = gql`
  fragment UserFragment on User {
    id
    name
    username
    bio
    email
    phone
    imageUrl
    upiId
    createdAt
    updatedAt
  }
`;
