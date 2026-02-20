import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from "@apollo/client";
import { authLink } from "./authLink";
import { errorLink } from "./errorLink";

export const API_URL = "https://8q6g72ql-3500.inc1.devtunnels.ms";

const httpLink = new HttpLink({
  uri: `${API_URL}/graphql`,
});

export const client = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
});
