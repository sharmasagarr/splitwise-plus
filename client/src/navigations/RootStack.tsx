import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabs from './BottomTabs';
import CreateGroup from '../screens/CreateGroup';
import GroupDetail from '../screens/GroupDetail';
import ChatScreen from '../screens/ChatScreen';
import Notifications from '../screens/Notifications';
import ExpenseDetail from '../screens/ExpenseDetail';

export type RootStackParamList = {
  MainTabs: undefined;
  CreateGroup: undefined;
  GroupDetail: { groupId: string; groupName?: string };
  ChatScreen: {
    conversationId: string;
    title: string;
    type: string;
  };
  Notifications: undefined;
  ExpenseDetail: { expenseId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="MainTabs"
        component={BottomTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateGroup"
        component={CreateGroup}
        options={{
          headerTitle: 'Create Group',
          headerBackTitle: 'Groups',
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="GroupDetail"
        component={GroupDetail}
        options={{
          headerTitle: 'Group Details',
          headerBackTitle: 'Groups',
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{
          headerBackTitle: 'Messages',
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={Notifications}
        options={{
          headerTitle: 'Notifications',
          headerBackTitle: 'Home',
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="ExpenseDetail"
        component={ExpenseDetail}
        options={{
          headerTitle: 'Expense Details',
          headerBackTitle: 'Back',
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}
