import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from "@apollo/client";
import { authLink } from "./authLink";
import { errorLink } from "./errorLink";


const DEV_URL = "https://4lbp3bcd-3500.inc1.devtunnels.ms";
const PROD_URL = "https://splitwise-plus-production.up.railway.app";

// Check if we are in development mode
export const API_URL = __DEV__ ? DEV_URL : PROD_URL;

const httpLink = new HttpLink({
  uri: `${API_URL}/graphql`,
});

export const client = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});