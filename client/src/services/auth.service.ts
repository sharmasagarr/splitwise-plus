import AsyncStorage from "@react-native-async-storage/async-storage";
import { client } from "../apollo/client";
import {
  LOGIN,
  RESEND_SIGNUP_OTP,
  SIGNUP,
  VERIFY_SIGNUP_OTP,
} from "../graphql/mutations/auth.mutations";
import { GET_ME } from "../graphql/queries/user.queries";
import {
  AuthResponse,
  LoginMutation,
  LoginMutationVariables,
  GetMeQuery,
  GetMeQueryVariables,
} from "../types/graphql";

type OtpResponse = {
  success: boolean;
  message: string;
  email: string;
};

export const authService = {
  async login(email: string, password: string) {
    const { data } = await client.mutate<
      LoginMutation,
      LoginMutationVariables
    >({
      mutation: LOGIN,
      variables: { email, password },
    });

    if (!data?.login) {
      throw new Error("Login failed");
    }

    await AsyncStorage.setItem("token", data.login.token);

    return data.login; 
  },

  async signup(name: string, email: string, password: string) {
    const { data } = await client.mutate<{
      signup: OtpResponse;
    }>({
      mutation: SIGNUP,
      variables: { name, email, password },
    });

    if (!data?.signup) {
      throw new Error("Signup failed");
    }

    return data.signup;
  },

  async verifySignupOtp(email: string, otp: string) {
    const { data } = await client.mutate<{
      verifySignupOtp: AuthResponse;
    }>({
      mutation: VERIFY_SIGNUP_OTP,
      variables: { email, otp },
    });

    if (!data?.verifySignupOtp) {
      throw new Error("OTP verification failed");
    }

    await AsyncStorage.setItem("token", data.verifySignupOtp.token);

    return data.verifySignupOtp;
  },

  async resendSignupOtp(email: string) {
    const { data } = await client.mutate<{
      resendSignupOtp: OtpResponse;
    }>({
      mutation: RESEND_SIGNUP_OTP,
      variables: { email },
    });

    if (!data?.resendSignupOtp) {
      throw new Error("Failed to resend OTP");
    }

    return data.resendSignupOtp;
  },

  async getMe() {
    const { data } = await client.query<
      GetMeQuery,
      GetMeQueryVariables
    >({
      query: GET_ME,
      fetchPolicy: "network-only",
    });

    if (!data?.me) {
      throw new Error("User not authenticated");
    }

    return data.me;
  },

  async logout(): Promise<void> {
    await AsyncStorage.removeItem("token");
    await client.clearStore();
  },
};
