import * as SecureStore from 'expo-secure-store';

const BASE_URL_KEY = 'hermes_bot_base_url';
const TOKEN_KEY = 'hermes_bot_auth_token';

export type ConnectionCredentials = {
  baseUrl: string;
  token: string;
};

export async function loadCredentials(): Promise<ConnectionCredentials | null> {
  const [baseUrl, token] = await Promise.all([
    SecureStore.getItemAsync(BASE_URL_KEY),
    SecureStore.getItemAsync(TOKEN_KEY),
  ]);
  if (!baseUrl || !token) {
    return null;
  }
  return { baseUrl, token };
}

export async function saveCredentials(credentials: ConnectionCredentials): Promise<void> {
  await SecureStore.setItemAsync(BASE_URL_KEY, credentials.baseUrl.trim());
  await SecureStore.setItemAsync(TOKEN_KEY, credentials.token.trim());
}

export async function clearCredentials(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(BASE_URL_KEY),
    SecureStore.deleteItemAsync(TOKEN_KEY),
  ]);
}
