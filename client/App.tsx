import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import {
  Linking,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  StatusBar,
  View,
} from 'react-native';
import BootSplash from 'react-native-bootsplash';
import { ApolloProvider, useMutation } from '@apollo/client/react';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  onNotificationOpenedApp,
  getInitialNotification,
} from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';
import Toast, { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import RootStack from './src/navigations/RootStack';
import AuthScreen from './src/screens/Auth';
import AppText from './src/components/AppText';
import Icon from './src/components/Icon';

import { client } from './src/apollo';
import { store } from './src/store';
import {
  restoreAuth,
  fetchMe,
  setAuthWithPersistence,
} from './src/store/authSlice';
import { useAppDispatch, useAppSelector } from './src/store/hooks';
import { REGISTER_FCM_TOKEN } from './src/graphql';

type ToastNotificationProps = {
  notificationType?: string;
};

function getToastNotificationIcon(type?: string) {
  switch (type) {
    case 'expense_added':
    case 'expense_created':
    case 'expense_share_owed':
    case 'expense_share_receivable':
      return <Icon name="Rupee" width={22} height={22} color="#047faf" style={styles.toastIcon} />;
    case 'settlement_received':
    case 'settlement_paid':
      return (
        <Icon
          name="CheckBadge"
          width={24}
          height={24}
          color="#20af04"
          style={styles.toastIcon}
        />
      );
    case 'user_joined_group':
      return <Icon name="UserCheck" width={22} height={22} color="#047faf" style={styles.toastIcon} />;
    case 'group_invitation':
      return <Icon name="Invitation" width={22} height={22} color="#047faf" style={styles.toastIcon} />;
    case 'payment_reminder':
      return <Icon name="MoneyWallet" width={22} height={22} color="#ca8a04" style={styles.toastIcon} />;
    default:
      return <Icon name="Bell" width={22} height={22} color="#534f4e" style={styles.toastIcon} />;
  }
}

function NotificationToast({
  text1,
  text2,
  props,
}: ToastConfigParams<ToastNotificationProps>) {
  return (
    <View style={styles.toastCard}>
      <View style={styles.toastIconWrap}>
        {getToastNotificationIcon(props?.notificationType)}
      </View>
      <View style={styles.toastContent}>
        {text1 ? <AppText style={styles.toastTitle}>{text1}</AppText> : null}
        {text2 ? (
          <AppText numberOfLines={3} style={styles.toastBody}>
            {text2}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

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
        props: {
          notificationType: remoteMessage.data?.type,
        },
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
  gestureRoot: {
    flex: 1,
  },
  appSafeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  toastCard: {
    width: '93%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#d9e4f3',
    backgroundColor: '#ffffff',
    shadowColor: '#16335b',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 10,
  },
  toastIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f2f7ff',
    marginRight: 12,
  },
  toastIcon: {
    marginTop: 0,
    marginRight: 0,
  },
  toastContent: {
    flex: 1,
  },
  toastTitle: {
    fontSize: 16,
    lineHeight: 21,
    color: '#111827',
    fontWeight: '700',
  },
  toastBody: {
    fontSize: 14,
    lineHeight: 19,
    color: '#4b5563',
    marginTop: 4,
  },
  toastSafeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});

const toastConfig: ToastConfig = {
  info: props => <NotificationToast {...props} />,
};

export default function App() {
  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider>
        <ApolloProvider client={client}>
          <Provider store={store}>
            <BottomSheetModalProvider>
              <StatusBar
                translucent={false}
                backgroundColor="#ffffff"
                barStyle="dark-content"
              />
              <SafeAreaView
                style={styles.appSafeArea}
                edges={['left', 'right', 'bottom']}
              >
                <Root />
              </SafeAreaView>
              {/* Toast wrapped in SafeAreaView for top safe area */}
              <SafeAreaView edges={['top']} style={styles.toastSafeArea}>
                <Toast config={toastConfig} />
              </SafeAreaView>
            </BottomSheetModalProvider>
          </Provider>
        </ApolloProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
