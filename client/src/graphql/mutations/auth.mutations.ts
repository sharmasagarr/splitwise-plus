import { gql } from "@apollo/client";
import { USER_FRAGMENT } from "../fragments";

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        ...UserFragment
      }
    }
  }
  ${USER_FRAGMENT}
`;

export const SIGNUP = gql`
  mutation Signup($name: String!, $email: String!, $password: String!) {
    signup(name: $name, email: $email, password: $password) {
      success
      message
      email
    }
  }
`;

export const VERIFY_SIGNUP_OTP = gql`
  mutation VerifySignupOtp($email: String!, $otp: String!) {
    verifySignupOtp(email: $email, otp: $otp) {
      token
      user {
        ...UserFragment
      }
    }
  }
  ${USER_FRAGMENT}
`;

export const RESEND_SIGNUP_OTP = gql`
  mutation ResendSignupOtp($email: String!) {
    resendSignupOtp(email: $email) {
      success
      message
      email
    }
  }
`;