import { AndroidHaptics, performAndroidHapticsAsync } from 'expo-haptics';

// Android view haptics: short, follow the system "touch feedback" setting, no vibration permission needed.
const play = (type: AndroidHaptics) => {
  performAndroidHapticsAsync(type).catch(() => {});
};

export const haptics = {
  /** A toggle (♥, hide). */
  tap: () => play(AndroidHaptics.Context_Click),
  /** A saved change: save, delete, add a dish. */
  success: () => play(AndroidHaptics.Confirm),
  /** A failed change. */
  error: () => play(AndroidHaptics.Reject),
};
