import { gql } from '@apollo/client';

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile(
    $name: String
    $imageUrl: String
    $phone: String
    $upiId: String
  ) {
    updateProfile(
      name: $name
      imageUrl: $imageUrl
      phone: $phone
      upiId: $upiId
    ) {
      id
      name
      email
      phone
      imageUrl
      upiId
      createdAt
      updatedAt
    }
  }
`;
