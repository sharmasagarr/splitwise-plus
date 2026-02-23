import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Groups from '../screens/Groups';

export type GroupsStackParamList = {
  GroupsList: undefined;
};

const Stack = createNativeStackNavigator<GroupsStackParamList>();

export default function GroupsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="GroupsList"
        component={Groups}
        options={{ headerTitle: 'Groups', headerShadowVisible: false }}
      />
    </Stack.Navigator>
  );
}
