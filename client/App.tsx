import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import {
  Linking,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  StatusBar,
} from 'react-native';
import BootSplash from 'react-native-bootsplash';
import { ApolloProvider, useMutation } from '@apollo/client/react';

import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  onNotificationOpenedApp,
  getInitialNotification,
} from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';
import Toast, { BaseToast, ToastConfig } from 'react-native-toast-message';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

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
import { REGISTER_FCM_TOKEN } from './src/graphql';

const Root = () => {
  const dispatch = useAppDispatch();
  const { ready, token } = useAppSelector(state => state.auth);
  const [registerFcmToken] = useMutation(REGISTER_FCM_TOKEN);

  // 🔹 Get Firebase App + Messaging instance (MODULAR WAY)
  const app = getApp();
  const messagingInstance = getMessaging(app);

  /* ================= FCM PERMISSION ================= */
  const requestNotificationPermission = async () => {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );

        if (!granted) {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          );
        }
      }

    } catch (error) {
      console.error('Error requesting FCM permission:', error);
    }
  };

  /* ================= GET FCM TOKEN ================= */
  const getFCMToken = async () => {
    try {
      const fcmToken = await getToken(messagingInstance);

      await registerFcmToken({ variables: { token: fcmToken } });
    } catch (error) {
      console.error('FCM TOKEN ERROR:', error);
    }
  };

  /* ================= FOREGROUND LISTENER ================= */
  useEffect(() => {
    const unsubscribe = onMessage(messagingInstance, async remoteMessage => {
      const title = remoteMessage.notification?.title || 'Notification';
      const body = remoteMessage.notification?.body || '';

      Toast.show({
        type: 'info',
        text1: title,
        text2: body,
        position: 'top',
        topOffset: 50,
      });
    });

    return unsubscribe;
  }, [messagingInstance]);

  /* ================= TOKEN REFRESH ================= */
  useEffect(() => {
    const unsubscribe = onTokenRefresh(messagingInstance, async newToken => {
      try {
        await registerFcmToken({ variables: { token: newToken } });
      } catch (error) {
        console.error('FCM TOKEN REFRESH ERROR:', error);
      }
    });

    return unsubscribe;
  }, [registerFcmToken, messagingInstance]);

  /* ================= BACKGROUND OPEN ================= */
  useEffect(() => {
    const unsubscribe = onNotificationOpenedApp(
      messagingInstance,
      remoteMessage => {
        console.log('Opened from background:', remoteMessage);
      },
    );

    getInitialNotification(messagingInstance).then(remoteMessage => {
      if (remoteMessage) {
        console.log('Opened from quit state:', remoteMessage);
      }
    });

    return unsubscribe;
  }, [messagingInstance]);

  /* ================= DEEP LINK HANDLER ================= */
  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      const match = url.match(/[?&]token=([^&]+)/);
      const tokenFromUrl = match ? decodeURIComponent(match[1]) : null;

      if (tokenFromUrl) {
        dispatch(
          setAuthWithPersistence({
            token: tokenFromUrl,
            user: null,
          }),
        );
      }
    };

    const subscription = Linking.addEventListener('url', handleUrl);

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

  /* ================= FETCH USER + INIT FCM ================= */
  useEffect(() => {
    if (ready && token) {
      dispatch(fetchMe());
      requestNotificationPermission();
      getFCMToken();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, token, dispatch]);

  /* ================= SPLASH ================= */
  useEffect(() => {
    if (ready) {
      BootSplash.hide({ fade: true });
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <NavigationContainer>
      {token ? <RootStack /> : <AuthScreen />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  appSafeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  toastStyle: {
    borderLeftColor: '#34d399',
    backgroundColor: '#faf6f6ff',
    borderRadius: 12,
  },
  toastContentContainerStyle: {
    paddingHorizontal: 15,
  },
  toastText1Style: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#06213bff',
  },
  toastText2Style: {
    fontSize: 14,
    color: '#06213bff',
  },
  toastSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});

const toastConfig: ToastConfig = {
  // You can customize default toasters here, e.g., mapping type 'info' to a better look.
  info: props => (
    <BaseToast
      {...props}
      style={styles.toastStyle}
      contentContainerStyle={styles.toastContentContainerStyle}
      text1Style={styles.toastText1Style}
      text2Style={styles.toastText2Style}
    />
  ),
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ApolloProvider client={client}>
        <Provider store={store}>
          <StatusBar
            translucent={false}
            backgroundColor="#ffffff"
            barStyle="dark-content"
          />
          <SafeAreaView style={styles.appSafeArea} edges={['left', 'right', 'bottom']}>
            <Root />
          </SafeAreaView>
          {/* Toast wrapped in SafeAreaView for top safe area */}
          <SafeAreaView edges={["top"]} style={styles.toastSafeArea}>
            <Toast config={toastConfig} />
          </SafeAreaView>
        </Provider>
      </ApolloProvider>
    </SafeAreaProvider>
  );
}
