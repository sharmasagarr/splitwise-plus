import { gql } from '@apollo/client';

export const UPDATE_PROFILE = gql`
  mutation UpdateProfile($name: String, $imageUrl: String, $phone: String) {
    updateProfile(name: $name, imageUrl: $imageUrl, phone: $phone) {
      id
      name
      email
      phone
      imageUrl
      createdAt
      updatedAt
    }
  }
`;
