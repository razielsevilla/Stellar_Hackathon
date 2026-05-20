import axios from 'axios';
import { Platform } from 'react-native';
import SecureStore from '../utils/storage';

// Prefer EXPO_PUBLIC_API_URL, otherwise use a platform-friendly local default.
const DEFAULT_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:3333',
  ios: 'http://localhost:3333',
  default: 'http://localhost:3333',
});
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_BASE_URL;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Request interceptor to add the JWT token to headers
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('toka_jwt');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const setAuthToken = async (token: string) => {
  await SecureStore.setItemAsync('toka_jwt', token);
};

export const clearAuthToken = async () => {
  await SecureStore.deleteItemAsync('toka_jwt');
};

export default api;
