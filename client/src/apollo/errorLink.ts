import { ErrorLink } from "@apollo/client/link/error";
import {
  CombinedGraphQLErrors,
  CombinedProtocolErrors,
} from "@apollo/client/errors";

export const errorLink = new ErrorLink(({ error, operation }) => {
  if (CombinedGraphQLErrors.is(error)) {
    error.errors.forEach(({ message, extensions }) => {
      if (extensions?.code === "UNAUTHENTICATED") {
        console.log("User not authenticated");
        // dispatch(logout()) or navigation reset
      }
    });
  } else if (CombinedProtocolErrors.is(error)) {
    error.errors.forEach(({ message, extensions }) => {
      console.log(`[Protocol error]: Message: ${message}`);
    });
  } else {
    console.error(`[Network error]:`, error);
  }
});