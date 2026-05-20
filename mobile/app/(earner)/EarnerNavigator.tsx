import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import Dashboard from './dashboard';
import Shop from './shop';
import Wallet from './wallet';
import Profile from './profile';
import { COLORS } from '../../constants/theme';
import SecureStore from '../../utils/storage';

const Tab = createBottomTabNavigator();

export default function EarnerNavigator() {
  const navigation = useNavigation<any>();

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('stellar_secret');
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.bgDeep },
        headerTintColor: COLORS.textPrimary,
        tabBarStyle: { backgroundColor: COLORS.bgCard, borderTopColor: 'rgba(255,255,255,0.1)' },
        tabBarActiveTintColor: COLORS.orange,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
            <Text style={{ color: COLORS.orange, fontWeight: 'bold' }}>Logout</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Tab.Screen name="Dashboard" component={Dashboard} />
      <Tab.Screen name="Shop" component={Shop} />
      <Tab.Screen name="Wallet" component={Wallet} />
      <Tab.Screen name="Profile" component={Profile} />
    </Tab.Navigator>
  );
}
