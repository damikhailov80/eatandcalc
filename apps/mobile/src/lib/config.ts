import Constants from 'expo-constants';

/**
 * API base URL. Builds and OTA updates get it from EXPO_PUBLIC_API_URL (EAS env). In development without it,
 * use the Metro host (the Mac's LAN IP) on port 3000, where `npm run dev:api` listens.
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (__DEV__ && host) return `http://${host}:3000`;
  throw new Error('EXPO_PUBLIC_API_URL is not set');
}

export const API_URL = resolveApiUrl();

/** OAuth client of type "Web application"; the server verifies ID tokens against it. */
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
