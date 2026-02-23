import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, Keyboard, Platform } from 'react-native';
import { useLinkBuilder } from '@react-navigation/native';
import { Text, PlatformPressable } from '@react-navigation/elements';
import {
  createBottomTabNavigator,
  BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import Home from '../screens/Home';
import GroupsStack from './GroupsStack';
import AddExpense from '../screens/AddExpense';
import MessagesStack from './MessagesStack';
import Profile from '../screens/Profile';
import { lightTheme } from '../utility/themeColors';
import { useAppSelector } from '../store/hooks';
import Icon from '../components/Icon';

import { IconName } from '../../assets/icons';

type RootTabParamList = {
  Home: undefined;
  Groups: undefined;
  Add: undefined;
  Messages: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

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
}) => (
  <View
    key={`${name}-${focused}`}
    style={[
      styles.iconContainer,
      focused
        ? { backgroundColor: theme.primary + '20' }
        : styles.iconTransparent,
    ]}
  >
    <Icon name={name} width={22} height={22} fill={color} />
  </View>
);

const HomeTabIcon = ({ color, focused }: any) => (
  <TabIcon name="Home" color={color} focused={focused} theme={lightTheme} />
);
const GroupsTabIcon = ({ color, focused }: any) => (
  <TabIcon name="Groups" color={color} focused={focused} theme={lightTheme} />
);
const AddExpenseTabIcon = ({ color, focused }: any) => (
  <TabIcon name="Add" color={color} focused={focused} theme={lightTheme} />
);
const MessagesTabIcon = ({ color, focused }: any) => (
  <TabIcon name="Message" color={color} focused={focused} theme={lightTheme} />
);
const ProfileTabIcon = ({ color, focused }: any) => (
  <TabIcon name="Profile" color={color} focused={focused} theme={lightTheme} />
);

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
            <Text
              style={[
                styles.tabText,
                { color: isFocused ? theme.primary : theme.text },
              ]}
            >
              {typeof label === 'string' ? label : route.name}
            </Text>
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
      AddExpense: {
        tabBarIcon: AddExpenseTabIcon,
      },
      Messages: {
        headerShown: false,
        tabBarIcon: MessagesTabIcon,
      },
      Profile: {
        tabBarIcon: ProfileTabIcon,
      },
    }),
    [],
  );

  if (!token) {
    return null;
  }

  return (
    <Tab.Navigator tabBar={CustomTabBar}>
      <Tab.Screen
        name="Home"
        component={Home}
        options={screenOptions.Home as any}
      />
      <Tab.Screen
        name="Groups"
        component={GroupsStack}
        options={screenOptions.Groups as any}
      />
      <Tab.Screen
        name="Add"
        component={AddExpense}
        options={screenOptions.AddExpense as any}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesStack}
        options={screenOptions.Messages as any}
      />
      <Tab.Screen
        name="Profile"
        component={Profile}
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
  iconTransparent: {
    backgroundColor: 'transparent',
  },
});
