import { Platform } from 'react-native';
import * as ExpoSecureStore from 'expo-secure-store';

const SecureStore = {
  setItemAsync: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn('localStorage is not available');
      }
    } else {
      await ExpoSecureStore.setItemAsync(key, value);
    }
  },
  getItemAsync: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.warn('localStorage is not available');
        return null;
      }
    } else {
      return await ExpoSecureStore.getItemAsync(key);
    }
  },
  deleteItemAsync: async (key: string) => {
    if (Platform.OS === 'web') {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('localStorage is not available');
      }
    } else {
      await ExpoSecureStore.deleteItemAsync(key);
    }
  }
};

export default SecureStore;
