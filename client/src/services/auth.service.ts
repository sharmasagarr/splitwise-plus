import AsyncStorage from "@react-native-async-storage/async-storage";
import { client } from "../apollo/client";
import { LOGIN, SIGNUP } from "../graphql/mutations/auth.mutations";
import { GET_ME } from "../graphql/queries/user.queries";
import {
  LoginMutation,
  LoginMutationVariables,
  SignupMutation,
  SignupMutationVariables,
  GetMeQuery,
  GetMeQueryVariables,
} from "../types/graphql";

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
    const { data } = await client.mutate<
      SignupMutation,
      SignupMutationVariables
    >({
      mutation: SIGNUP,
      variables: { name, email, password },
    });

    if (!data?.signup) {
      throw new Error("Signup failed");
    }

    await AsyncStorage.setItem("token", data.signup.token);

    return data.signup;
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
