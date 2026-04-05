import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Keyboard,
  Platform,
  TouchableOpacity,
  Text as RNText,
  Animated,
  Easing,
  Image,
} from 'react-native';
import {
  NavigatorScreenParams,
  useLinkBuilder,
} from '@react-navigation/native';
import { PlatformPressable } from '@react-navigation/elements';
import AppText from '../components/AppText';
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import Home from '../screens/Home';
import GroupsStack from './GroupsStack';
import Add, { AddTopTabParamList } from '../screens/Add';
import MessagesStack from './MessagesStack';
import ProfileStack from './ProfileStack';
import { lightTheme } from '../utility/themeColors';
import { useAppSelector } from '../store/hooks';
import Icon from '../components/Icon';
import { useQuery } from '@apollo/client/react';
import { GET_MY_NOTIFICATIONS } from '../graphql/queries';
import { useNavigation } from '@react-navigation/native';

import { IconName } from '../../assets/icons';

export type RootTabParamList = {
  Home: undefined;
  Groups: undefined;
  Add: NavigatorScreenParams<AddTopTabParamList> | undefined;
  Messages: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const ACTIVE_TAB_CHIP_OPACITY = '20';

const TabIcon = ({
  name,
  color,
  focused,
  theme,
}: {
  name: IconName;
  color: string;
  focused: boolean;
  theme: any;
}) => {
  const chipAnimation = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(chipAnimation, {
      toValue: focused ? 1 : 0,
      duration: focused ? 240 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [chipAnimation, focused]);

  const chipStyle = {
    opacity: chipAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
    transform: [
      {
        scaleX: chipAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.35, 1],
        }),
      },
      {
        scaleY: chipAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.82, 1],
        }),
      },
    ],
  };

  return (
    <View style={styles.iconShell}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.iconBackground,
          { backgroundColor: `${theme.primary}${ACTIVE_TAB_CHIP_OPACITY}` },
          chipStyle,
        ]}
      />
      <View style={styles.iconForeground}>
        <Icon name={name} width={22} height={22} color={color} />
      </View>
    </View>
  );
};

const HomeTabIcon = ({ color, focused }: any) => (
  <TabIcon name="Home" color={color} focused={focused} theme={lightTheme} />
);
const GroupsTabIcon = ({ color, focused }: any) => (
  <TabIcon name="Groups" color={color} focused={focused} theme={lightTheme} />
);
const AddTabIcon = ({ color, focused }: any) => (
  <TabIcon name="Add" color={color} focused={focused} theme={lightTheme} />
);
const MessagesTabIcon = ({ color, focused }: any) => (
  <TabIcon name="Message" color={color} focused={focused} theme={lightTheme} />
);

const ProfileAvatarTabIcon = ({
  focused,
  imageUrl,
  theme,
}: {
  focused: boolean;
  imageUrl: string;
  theme: any;
}) => {
  const chipAnimation = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(chipAnimation, {
      toValue: focused ? 1 : 0,
      duration: focused ? 240 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [chipAnimation, focused]);

  const chipStyle = {
    opacity: chipAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    }),
    transform: [
      {
        scaleX: chipAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.35, 1],
        }),
      },
      {
        scaleY: chipAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.82, 1],
        }),
      },
    ],
  };

  return (
    <View style={styles.iconShell}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.iconBackground,
          { backgroundColor: `${theme.primary}${ACTIVE_TAB_CHIP_OPACITY}` },
          chipStyle,
        ]}
      />
      <View style={styles.iconForeground}>
        <Image
          source={{ uri: imageUrl }}
          style={[
            styles.profileTabAvatar,
            focused && styles.profileTabAvatarFocused,
          ]}
        />
      </View>
    </View>
  );
};

function MyTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = lightTheme;
  const { buildHref } = useLinkBuilder();
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  if (keyboardVisible) return null;

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: theme.background,
          borderTopColor: theme.border || '#e0e0e0',
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
            ? options.title
            : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        return (
          <PlatformPressable
            key={route.key}
            href={buildHref(route.name, route.params)}
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabItem}
          >
            {options.tabBarIcon?.({
              focused: isFocused,
              color: isFocused ? theme.primary : theme.text,
              size: 24,
            })}
            <AppText
              style={[
                styles.tabText,
                { color: isFocused ? theme.primary : theme.text },
              ]}
            >
              {typeof label === 'string' ? label : route.name}
            </AppText>
          </PlatformPressable>
        );
      })}
    </View>
  );
}

function CustomTabBar(props: any) {
  return <MyTabBar {...props} />;
}

export default function BottomTabs() {
  const token = useAppSelector(state => state.auth.token);
  const user = useAppSelector(state => state.auth.user);

  const ProfileTabIcon = useCallback(
    ({ color, focused }: any) =>
      user?.imageUrl ? (
        <ProfileAvatarTabIcon
          focused={focused}
          imageUrl={user.imageUrl}
          theme={lightTheme}
        />
      ) : (
        <TabIcon
          name="Profile"
          color={color}
          focused={focused}
          theme={lightTheme}
        />
      ),
    [user?.imageUrl],
  );

  const screenOptions = useMemo(
    () => ({
      Home: {
        headerTitle: 'SPLITWISE +',
        headerTitleStyle: {
          fontFamily: 'GoogleSans-BoldItalic',
          color: '#104d98',
          fontSize: 18,
          letterSpacing: 1,
        },
        headerStyle: {
          backgroundColor: '#f8fafc',
        },
        headerShadowVisible: false,
        tabBarIcon: HomeTabIcon,
      },
      Groups: {
        headerShown: false,
        tabBarIcon: GroupsTabIcon,
      },
      Add: {
        headerShown: false,
        tabBarIcon: AddTabIcon,
      },
      Messages: {
        headerShown: false,
        tabBarIcon: MessagesTabIcon,
      },
      Profile: {
        headerShown: false,
        tabBarIcon: ProfileTabIcon,
      },
    }),
    [ProfileTabIcon],
  );

  const navigation = useNavigation<any>();

  const { data: notifData } = useQuery<any>(GET_MY_NOTIFICATIONS, {
    pollInterval: 30000,
    fetchPolicy: 'cache-and-network',
  });

  const unreadCount = (notifData?.getMyNotifications ?? []).filter(
    (n: any) => !n.read,
  ).length;

  const bellButton = useMemo(
    () => (
      <TouchableOpacity
        onPress={() => navigation.navigate('Notifications')}
        style={bellStyles.container}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name="Notification" width={30} height={30} />
        {unreadCount > 0 && (
          <View style={bellStyles.badge}>
            <RNText style={bellStyles.badgeText}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </RNText>
          </View>
        )}
      </TouchableOpacity>
    ),
    [navigation, unreadCount],
  );

  if (!token) {
    return null;
  }

  return (
    <Tab.Navigator tabBar={CustomTabBar}>
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          ...(screenOptions.Home as any),
          headerRight: () => bellButton,
        }}
      />
      <Tab.Screen
        name="Groups"
        component={GroupsStack}
        options={screenOptions.Groups as any}
      />
      <Tab.Screen
        name="Add"
        component={Add}
        options={screenOptions.Add as any}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesStack}
        options={screenOptions.Messages as any}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStack}
        options={screenOptions.Profile as any}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingBottom: 5,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  tabText: {
    fontSize: 11,
    fontFamily: 'GoogleSans-Regular',
  },
  iconContainer: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 100,
  },
  iconShell: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 100,
  },
  iconForeground: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 100,
  },
  profileTabAvatar: {
    width: 23,
    height: 23,
    borderRadius: 11,
    backgroundColor: '#e2e8f0',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
  },
  profileTabAvatarFocused: {
    borderColor: '#bfdbfe',
  },
  iconTransparent: {
    backgroundColor: 'transparent',
  },
});

const bellStyles = StyleSheet.create({
  container: {
    marginRight: 15,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bell: {
    fontSize: 22,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
