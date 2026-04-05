import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ExpenseTab from '../components/ExpenseTab';
import SettleTab from '../components/SettleTab';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

export type AddTopTabParamList = {
  AddExpense: undefined;
  SettleUp: undefined;
};

const Tab = createMaterialTopTabNavigator<AddTopTabParamList>();

const Add = () => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Tab.Navigator
        initialRouteName="AddExpense"
        screenOptions={{
          tabBarLabelStyle: styles.tabBarLabel,
          tabBarActiveTintColor: '#4f46e5',
          tabBarInactiveTintColor: '#64748b',
          tabBarIndicatorStyle: styles.tabBarIndicator,
          tabBarItemStyle: styles.tabBarItem,
          tabBarStyle: styles.tabBar,
        }}
      >
        <Tab.Screen
          name="AddExpense"
          options={{ tabBarLabel: 'Add Expense' }}
          component={ExpenseTab}
        />
        <Tab.Screen
          name="SettleUp"
          options={{ tabBarLabel: 'Settle Up' }}
          component={SettleTab}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
};

export default Add;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  tabBar: {
    backgroundColor: '#e0e7ff',
    borderRadius: 50,
    marginHorizontal: 14,
    marginTop: 10,
    marginBottom: 8,
    minHeight: 44,
    elevation: 0,
    shadowOpacity: 0,
  },
  tabBarItem: {
    padding: 0,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabBarIndicator: {
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    borderRadius: 50,
    height: '100%',
  },
  tabBarLabel: {
    fontSize: 13,
    fontFamily: 'GoogleSans-Medium',
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: 'center',
    margin: 0,
    padding: 0,
  },
});
