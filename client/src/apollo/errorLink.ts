import { onError } from '@apollo/client/link/error';
import { Alert } from 'react-native';

export const errorLink = onError(({ graphQLErrors, networkError }: any) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, extensions }: any) => {
      if (extensions?.code === 'UNAUTHENTICATED') {
        console.log('User not authenticated');
        // dispatch(logout()) or navigation reset
      } else {
        console.log(`[GraphQL error]: Message: ${message}`);
      }
    });
  }

  if (networkError) {
    console.error(`[Network error]:`, networkError);
    Alert.alert(
      'Network Error',
      'Unable to connect to the server. Please check your internet connection.',
    );
  }
});
