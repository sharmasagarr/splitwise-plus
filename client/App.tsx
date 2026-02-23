import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { Linking } from 'react-native';
import BootSplash from 'react-native-bootsplash';
import { ApolloProvider } from '@apollo/client/react';

import RootStack from './src/navigations/RootStack';
import AuthScreen from './src/screens/Auth';

import { client } from './src/apollo';
import { store } from './src/store';
import {
  restoreAuth,
  fetchMe,
  setAuthWithPersistence,
} from './src/store/authSlice';
import { useAppDispatch, useAppSelector } from './src/store/hooks';

const Root = () => {
  const dispatch = useAppDispatch();
  const { ready, token } = useAppSelector(state => state.auth);

  /* ================= DEEP LINK HANDLER ================= */
  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      const getTokenFromUrl = (): string | null => {
        const match = url.match(/[?&]token=([^&]+)/);
        return match ? decodeURIComponent(match[1]) : null;
      };
      const tokenFromUrl = getTokenFromUrl();

      if (typeof tokenFromUrl === 'string') {
        dispatch(
          setAuthWithPersistence({
            token: tokenFromUrl,
            user: null,
          }),
        );
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);

    // Cold start
    Linking.getInitialURL().then(url => {
      if (url) handleUrl({ url });
    });

    return () => {
      subscription.remove();
    };
  }, [dispatch]);

  /* ================= RESTORE AUTH ================= */
  useEffect(() => {
    dispatch(restoreAuth());
  }, [dispatch]);

  /* ================= FETCH USER ================= */
  useEffect(() => {
    if (ready && token) {
      dispatch(fetchMe());
    }
  }, [ready, token, dispatch]);

  /* ================= SPLASH ================= */
  useEffect(() => {
    if (ready) {
      BootSplash.hide({ fade: true });
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <ApolloProvider client={client}>
      <NavigationContainer>
        {token ? <RootStack /> : <AuthScreen />}
      </NavigationContainer>
    </ApolloProvider>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <Root />
    </Provider>
  );
}
