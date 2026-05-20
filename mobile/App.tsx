import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import SecureStore from './utils/storage';
import api from './services/api';

import WelcomeScreen from './app/(auth)/welcome';
import CreateWalletScreen from './app/(auth)/create-wallet';
import LoginScreen from './app/(auth)/login';
import AnchorNavigator from './app/(anchor)/AnchorNavigator';
import EarnerNavigator from './app/(earner)/EarnerNavigator';
import TaskDetail from './app/(earner)/task-detail';
import { COLORS } from './constants/theme';

export type RootStackParamList = {
  Welcome: undefined;
  CreateWallet: { role: 'Anchor' | 'Earner' };
  Login: undefined;
  AnchorDashboard: undefined;
  EarnerDashboard: undefined;
  TaskDetail: { taskId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Welcome');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync('toka_jwt');
        if (token) {
          // Verify token is still valid and fetch role
          const profileRes = await api.get('/users/me');
          if (profileRes.data.role === 'anchor') {
            setInitialRoute('AnchorDashboard');
          } else if (profileRes.data.role === 'earner') {
            setInitialRoute('EarnerDashboard');
          }
        }
      } catch (err) {
        console.warn('Auth check failed or token invalid:', err);
        // Fallback to Welcome if verification fails
      } finally {
        setIsAuthReady(true);
      }
    };
    checkAuth();
  }, []);

  if (!isAuthReady) {
    return null; // Could return a Splash Screen here
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.bgDeep },
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen 
          name="CreateWallet" 
          component={CreateWalletScreen} 
          options={{ headerShown: true, title: '', headerStyle: { backgroundColor: COLORS.bgDeep }, headerTintColor: COLORS.textPrimary, headerShadowVisible: false }} 
        />
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: true, title: '', headerStyle: { backgroundColor: COLORS.bgDeep }, headerTintColor: COLORS.textPrimary, headerShadowVisible: false }} 
        />
        <Stack.Screen name="AnchorDashboard" component={AnchorNavigator} />
        <Stack.Screen name="EarnerDashboard" component={EarnerNavigator} />
        <Stack.Screen 
          name="TaskDetail" 
          component={TaskDetail} 
          options={{ headerShown: true, title: 'Task Details', headerStyle: { backgroundColor: COLORS.bgDeep }, headerTintColor: COLORS.textPrimary }} 
        />
      </Stack.Navigator>
      <Toast />
    </NavigationContainer>
  );
}
