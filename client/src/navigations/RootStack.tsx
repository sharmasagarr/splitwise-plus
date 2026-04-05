import React from 'react';
import { NavigatorScreenParams } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabs from './BottomTabs';
import type { RootTabParamList } from './BottomTabs';
import CreateGroup from '../screens/CreateGroup';
import GroupDetail from '../screens/GroupDetail';
import ChatScreen from '../screens/ChatScreen';
import Notifications from '../screens/Notifications';
import ExpenseDetail from '../screens/ExpenseDetail';
import SettleUserShares from '../screens/SettleUserSharesScreen';
import OwedUserShares from '../screens/OwedUserSharesScreen';
import Transactions from '../screens/Transactions';

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<RootTabParamList> | undefined;
  CreateGroup: undefined;
  GroupDetail: { groupId: string; groupName?: string };
  ChatScreen: {
    conversationId: string;
    title: string;
    type: string;
  };
  Notifications: undefined;
  ExpenseDetail: { expenseId: string };
  Transactions: undefined;
  SettleUserShares: {
    toUserId: string;
    toUserName: string;
    totalAmount: number;
  };
  OwedUserShares: {
    fromUserId: string;
    fromUserName: string;
    totalAmount: number;
  };
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
      <Stack.Screen
        name="Transactions"
        component={Transactions}
        options={{
          headerTitle: 'Transactions',
          headerBackTitle: 'Home',
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="SettleUserShares"
        component={SettleUserShares}
        options={{
          headerTitle: 'Settle Shares',
          headerBackTitle: 'Settle Up',
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="OwedUserShares"
        component={OwedUserShares}
        options={{
          headerTitle: 'Request Payment',
          headerBackTitle: 'Settle Up',
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}
