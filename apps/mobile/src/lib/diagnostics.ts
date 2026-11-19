import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

/**
 * On-device diagnostics log for sign-in and API failures: a small ring buffer kept in SecureStore, so it survives
 * restarts and a release build can show (and share) what happened. Uses only modules already in the APK, so it
 * ships with an OTA update. Never put tokens or cookie values here.
 */
export type DiagEntry = { t: number; tag: string; msg: string };

/** Why the app signed out on its own (shown on the sign-in screen instead of a silent bounce). */
export type SignOutReason = { t: number; reason: string };

const LOG_KEY = 'eatandcalc.diagLog';
const SIGNOUT_KEY = 'eatandcalc.diagSignOut';
const MAX_ENTRIES = 150;
const MAX_MSG = 400;

type State = { entries: DiagEntry[]; signOut: SignOutReason | null };

function load(): State {
  try {
    const entries = JSON.parse(SecureStore.getItem(LOG_KEY) ?? '[]') as DiagEntry[];
    const signOut = JSON.parse(SecureStore.getItem(SIGNOUT_KEY) ?? 'null') as SignOutReason | null;
    return { entries: Array.isArray(entries) ? entries : [], signOut };
  } catch {
    return { entries: [], signOut: null };
  }
}

let state: State = load();
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function emit(next: State) {
  state = next;
  listeners.forEach((l) => l());
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    SecureStore.setItemAsync(LOG_KEY, JSON.stringify(state.entries)).catch(() => {});
    if (state.signOut) SecureStore.setItemAsync(SIGNOUT_KEY, JSON.stringify(state.signOut)).catch(() => {});
    else SecureStore.deleteItemAsync(SIGNOUT_KEY).catch(() => {});
  }, 300);
}

export function diag(tag: string, msg: string) {
  const entry = { t: Date.now(), tag, msg: msg.length > MAX_MSG ? `${msg.slice(0, MAX_MSG)}…` : msg };
  console.log(`[${tag}] ${entry.msg}`);
  emit({ ...state, entries: [...state.entries, entry].slice(-MAX_ENTRIES) });
}

export function recordSignOut(reason: string) {
  diag('signout', reason);
  emit({ ...state, signOut: { t: Date.now(), reason } });
}

export const clearSignOutReason = () => {
  if (state.signOut) emit({ ...state, signOut: null });
};

export const clearDiagnostics = () => emit({ entries: [], signOut: null });

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useDiagnostics = () => useSyncExternalStore(subscribe, () => state);

/** Names of cookies in a Cookie header (values never leave this function). */
export const cookieNames = (cookie: string | null | undefined) =>
  (cookie ?? '')
    .split(';')
    .map((c) => c.split('=')[0]?.trim())
    .filter(Boolean)
    .join(', ') || 'нет';

const pad = (n: number) => String(n).padStart(2, '0');
export const formatDiagTime = (t: number) => {
  const d = new Date(t);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
