import { SetContextLink } from "@apollo/client/link/context";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const authLink = new SetContextLink(async (prevContext) => {
  const token = await AsyncStorage.getItem("token");

  return {
    headers: {
      ...prevContext.headers,
      authorization: token ? `Bearer ${token}` : "",
    },
  };
});