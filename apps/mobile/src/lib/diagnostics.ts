import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import * as Updates from 'expo-updates';
import { useSyncExternalStore } from 'react';

/**
 * In-app debug log («Журнал»): a ring buffer kept in SecureStore, so it survives restarts and a release build
 * can show (and share) what happened. Anything can write to it with `diag(tag, msg)`; console.warn/error and
 * uncaught JS errors are captured too. Uses only modules already in the APK, so it ships with an OTA update.
 * Never put tokens or cookie values here.
 *
 * Temporary: the floating button is on while DEV_LOG_ENABLED; set EXPO_PUBLIC_DEV_LOG=0 to hide it (or remove
 * this module) for the real production release.
 */
export const DEV_LOG_ENABLED = process.env.EXPO_PUBLIC_DEV_LOG !== '0';

export type DiagLevel = 'info' | 'warn' | 'error';
export type DiagEntry = { t: number; tag: string; msg: string; level?: DiagLevel };

/** Why the app signed out on its own (shown on the sign-in screen instead of a silent bounce). */
export type SignOutReason = { t: number; reason: string };

const LOG_KEY = 'eatandcalc.diagLog';
const SIGNOUT_KEY = 'eatandcalc.diagSignOut';
const MAX_ENTRIES = 200;
const MAX_MSG = 600;

type State = {
  entries: DiagEntry[];
  signOut: SignOutReason | null;
  /** Time the log screen was last opened: warnings/errors after it make the badge. */
  seenAt: number;
};

function load(): State {
  try {
    const entries = JSON.parse(SecureStore.getItem(LOG_KEY) ?? '[]') as DiagEntry[];
    const signOut = JSON.parse(SecureStore.getItem(SIGNOUT_KEY) ?? 'null') as SignOutReason | null;
    return { entries: Array.isArray(entries) ? entries : [], signOut, seenAt: Date.now() };
  } catch {
    return { entries: [], signOut: null, seenAt: Date.now() };
  }
}

let state: State = load();
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function emit(next: State, persist = true) {
  state = next;
  listeners.forEach((l) => l());
  if (!persist) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    SecureStore.setItemAsync(LOG_KEY, JSON.stringify(state.entries)).catch(() => {});
    if (state.signOut) SecureStore.setItemAsync(SIGNOUT_KEY, JSON.stringify(state.signOut)).catch(() => {});
    else SecureStore.deleteItemAsync(SIGNOUT_KEY).catch(() => {});
  }, 500);
}

// Original console methods: diag() echoes through them, so captured console calls don't loop.
const rawConsole = { log: console.log, warn: console.warn, error: console.error };

function push(tag: string, msg: string, level: DiagLevel) {
  const entry = { t: Date.now(), tag, level, msg: msg.length > MAX_MSG ? `${msg.slice(0, MAX_MSG)}…` : msg };
  emit({ ...state, entries: [...state.entries, entry].slice(-MAX_ENTRIES) });
}

/** Adds a line to the in-app log (and to the Metro console). */
export function diag(tag: string, msg: string, level: DiagLevel = 'info') {
  rawConsole[level === 'info' ? 'log' : level](`[${tag}] ${msg}`);
  push(tag, msg, level);
}

export function recordSignOut(reason: string) {
  diag('signout', reason, 'warn');
  emit({ ...state, signOut: { t: Date.now(), reason } });
}

export const clearSignOutReason = () => {
  if (state.signOut) emit({ ...state, signOut: null });
};

export const clearDiagnostics = () => emit({ entries: [], signOut: null, seenAt: Date.now() });

export const markDiagnosticsSeen = () => emit({ ...state, seenAt: Date.now() }, false);

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const useDiagnostics = () => useSyncExternalStore(subscribe, () => state);

/** Warnings and errors since the log screen was last opened. */
export const unseenProblems = (s: State) =>
  s.entries.filter((e) => e.t > s.seenAt && (e.level === 'warn' || e.level === 'error')).length;

const stringify = (v: unknown): string => {
  if (v instanceof Error) return `${v.name}: ${v.message}`;
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
};

let installed = false;

/** Copies console.warn/error and uncaught JS errors into the log. Call once at startup. */
export function installDiagnosticsCapture() {
  if (installed || !DEV_LOG_ENABLED) return;
  installed = true;

  // First line of every launch: proves the app (and which bundle) started.
  diag(
    'app',
    `запуск ${Constants.expoConfig?.version ?? '?'}, ${__DEV__ ? 'dev' : 'release'}, ${
      Updates.isEmbeddedLaunch ? 'встроенный bundle' : `OTA ${Updates.updateId ?? '?'}`
    }`,
  );

  console.warn = (...args: unknown[]) => {
    rawConsole.warn(...args);
    push('console', args.map(stringify).join(' '), 'warn');
  };
  console.error = (...args: unknown[]) => {
    rawConsole.error(...args);
    push('console', args.map(stringify).join(' '), 'error');
  };

  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (errorUtils) {
    const previous = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error, isFatal) => {
      push('crash', `${isFatal ? 'FATAL ' : ''}${stringify(error)}\n${(error as Error)?.stack ?? ''}`, 'error');
      previous(error, isFatal);
    });
  }
}

type ErrorUtilsLike = {
  getGlobalHandler: () => (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void;
};

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
