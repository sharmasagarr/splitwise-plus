import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Messages from '../screens/Messages';

export type MessagesStackParamList = {
  ConversationList: undefined;
};

const Stack = createNativeStackNavigator<MessagesStackParamList>();

export default function MessagesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ConversationList"
        component={Messages}
        options={{ headerTitle: 'Messages', headerShadowVisible: false }}
      />
    </Stack.Navigator>
  );
}
