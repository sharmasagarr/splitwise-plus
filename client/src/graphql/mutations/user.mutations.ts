import { gql } from '@apollo/client';

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile(
    $name: String
    $username: String
    $bio: String
    $imageUrl: String
    $phone: String
    $upiId: String
  ) {
    updateProfile(
      name: $name
      username: $username
      bio: $bio
      imageUrl: $imageUrl
      phone: $phone
      upiId: $upiId
    ) {
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
  }
`;
