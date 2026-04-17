import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'gigsurance.accessToken';
const USER_KEY = 'gigsurance.user';
const APP_STATE_KEY = 'gigsurance.appState';

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function setAccessToken(token) {
  return SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token);
}

export async function clearAccessToken() {
  return SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
}

export async function getStoredUser() {
  const value = await AsyncStorage.getItem(USER_KEY);
  return value ? JSON.parse(value) : null;
}

export async function setStoredUser(user) {
  return AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}

export async function clearStoredUser() {
  return AsyncStorage.removeItem(USER_KEY);
}

export async function getAppState() {
  const value = await AsyncStorage.getItem(APP_STATE_KEY);
  return value ? JSON.parse(value) : null;
}

export async function setAppState(value) {
  return AsyncStorage.setItem(APP_STATE_KEY, JSON.stringify(value));
}
