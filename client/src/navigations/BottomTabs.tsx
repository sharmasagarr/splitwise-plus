import { View } from 'react-native';
import { useLinkBuilder } from '@react-navigation/native';
import { Text, PlatformPressable } from '@react-navigation/elements';
import { createBottomTabNavigator, BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Home from '../screens/Home';
import Groups from '../screens/Groups';
import AddExpense from '../screens/AddExpense';
import Messages from '../screens/Messages';
import Profile from '../screens/Profile';
import { lightTheme } from '../utility/themeColors';
import { useMemo } from 'react';
import { useAppSelector } from "../store/hooks";
import Icon from '../components/Icon';

type RootTabParamList = {
  Home: undefined;
  Groups: undefined;
  Add: undefined;
  Messages: undefined;
  Profile: undefined;
};

function CustomTabBar(props: any) {
    return <MyTabBar {...props} />;
}

const Tab = createBottomTabNavigator<RootTabParamList>();

function MyTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
    const theme = lightTheme;
    const { buildHref } = useLinkBuilder();

    return (
        <View style={{ 
            flexDirection: 'row',
            backgroundColor: theme.background,
            borderTopWidth: 1,
            borderTopColor: theme.border || '#e0e0e0',
            paddingBottom: 5
        }}>
            {state.routes.map((route, index) => {
                const { options } = descriptors[route.key];
                const label =
                    options.tabBarLabel ?? undefined
                        ? options.tabBarLabel
                        : options.title ?? undefined
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
                        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 }}
                    >
                        {options.tabBarIcon?.({
                            focused: isFocused,
                            color: isFocused ? theme.primary : theme.text,
                            size: 24,
                        })}

                        <Text style={{ color: isFocused ? theme.primary : theme.text, fontSize: 11, fontFamily: 'GoogleSans-Regular', }}>
                            {typeof label === 'string' ? label : route.name}
                        </Text>
                    </PlatformPressable>
                );
            })}
        </View>
    );
}

export default function BottomTabs() {
    const theme = lightTheme;
    const token = useAppSelector((state) => state.auth.token);
    
    const screenOptions = useMemo(() => ({
        Home: {
            headerTitle: 'SPLITWISE +',
            headerTitleStyle: {
                fontFamily: 'GoogleSans-BoldItalic',
                color: "#104d98",
                fontSize: 18,
                letterSpacing: 1,
            },
            headerStyle:{
                backgroundColor: "#f8fafc",
            },
            headerShadowVisible: false,
            tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
                <View 
                    key={`home-${focused}`} // Add key based on focused state
                    style={{ 
                        paddingHorizontal: 15, 
                        paddingVertical: 5,
                        borderRadius: 100, 
                        backgroundColor: focused ? theme.primary + '20' : 'transparent'
                    }}
                >
                    <Icon name="Home" width={22} height={22} fill={color} />
                </View>
            ),
        },
        Groups: {
            tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
                <View 
                    key={`groups-${focused}`}
                    style={{ 
                        paddingHorizontal: 15, 
                        paddingVertical: 5,
                        borderRadius: 100, 
                        backgroundColor: focused ? theme.primary + '20' : 'transparent'
                    }}
                >
                    <Icon name="Groups" width={22} height={22} fill={color} />
                </View>
            ),
        },
        AddExpense: {
            tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
                <View 
                    key={`add-${focused}`}
                    style={{ 
                        paddingHorizontal: 15, 
                        paddingVertical: 5,
                        borderRadius: 100, 
                        backgroundColor: focused ? theme.primary + '20' : 'transparent'
                    }}
                >
                    <Icon name="Add" width={22} height={22} fill={color} />
                </View>
            ),
        },
        Messages: {
            tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
                <View 
                    key={`message-${focused}`}
                    style={{ 
                        paddingHorizontal: 15, 
                        paddingVertical: 5,
                        borderRadius: 100, 
                        backgroundColor: focused ? theme.primary + '20' : 'transparent',
                    }}
                >
                    <Icon name="Message" width={22} height={22} fill={color} />
                </View>
            ),
        },
        Profile: {
            tabBarIcon: ({ color, focused }: { color: string; focused: boolean }) => (
                <View 
                    key={`profile-${focused}`}
                    style={{ 
                        paddingHorizontal: 15, 
                        paddingVertical: 5,
                        borderRadius: 100, 
                        backgroundColor: focused ? theme.primary + '20' : 'transparent'
                    }}
                >
                    <Icon name="Profile" width={22} height={22} fill={color} />
                </View>
            ),
        },
    }), [theme]);

    // AUTH GUARD
    if (!token) {
        return null;
    }

    return (
        <Tab.Navigator tabBar={CustomTabBar}>
            <Tab.Screen name="Home" component={Home} options={screenOptions.Home} />
            <Tab.Screen name="Groups" component={Groups} options={screenOptions.Groups} />
            <Tab.Screen name="Add" component={AddExpense} options={screenOptions.AddExpense} />
            <Tab.Screen name="Messages" component={Messages} options={screenOptions.Messages} />
            <Tab.Screen name="Profile" component={Profile} options={screenOptions.Profile} />
        </Tab.Navigator>
    );
}