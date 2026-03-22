import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ExpenseTab from '../components/ExpenseTab';
import SettleTab from '../components/SettleTab';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

const Tab = createMaterialTopTabNavigator();

const Add = () => {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Tab.Navigator
        initialRouteName="AddExpense"
        screenOptions={{
          tabBarLabelStyle: { fontSize: 15, fontWeight: '600' },
          tabBarActiveTintColor: '#4f46e5',
          tabBarInactiveTintColor: '#64748b',
          tabBarIndicatorStyle: {
            backgroundColor: 'rgba(79, 70, 229, 0.15)',
            borderRadius: 12,
            height: '100%',
          },
          tabBarStyle: {
            backgroundColor: '#e0e7ff',
            borderRadius: 16,
            marginHorizontal: 14,
            marginTop: 10,
            marginBottom: 8,
            elevation: 0,
            shadowOpacity: 0,
            overflow: 'hidden',
          },
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
    backgroundColor: '#f8fafc',
  },
});
