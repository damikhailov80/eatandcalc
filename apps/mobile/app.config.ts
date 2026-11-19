import { networkInterfaces } from 'node:os';
import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Static config lives in app.json; this only adds per-variant tweaks.
 * APP_VARIANT=development is set by `npm run android:dev` and the EAS `development` profile.
 * The dev build gets its own package so it installs next to the production APK.
 */
const IS_DEV = process.env.APP_VARIANT === 'development';
const PROD_PACKAGE = 'com.eatandcalc.app';
const DEV_PACKAGE = `${PROD_PACKAGE}.dev`;

/** Mac's Wi-Fi address at build time (same logic as apps/web/src/dev-build.ts). */
function lanIp(): string | null {
  type Addr = { family: string; internal: boolean; address: string };
  const all = Object.entries(networkInterfaces() as Record<string, Addr[] | undefined>).flatMap(([name, list]) =>
    (list ?? []).filter((a) => a.family === 'IPv4' && !a.internal).map((a) => ({ name, address: a.address })),
  );
  return (all.find((a) => a.name === 'en0') ?? all[0])?.address ?? null;
}

/**
 * Metro URL baked into the dev build, so the dev launcher opens the app without asking for a URL.
 * Override with DEV_SERVER_URL; if the Mac's IP changes, rebuild (`npm run android:dev`).
 */
function devServerUrl(): string | undefined {
  if (process.env.DEV_SERVER_URL) return process.env.DEV_SERVER_URL;
  const ip = lanIp();
  return ip ? `http://${ip}:8081` : undefined;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const launchUrl = IS_DEV ? devServerUrl() : undefined;
  return {
    ...config,
    name: IS_DEV ? 'Eat And Calc (dev)' : 'Eat And Calc',
    slug: config.slug ?? 'eatandcalc',
    // Dev build: peach background + "DEV" badge so it is easy to tell apart on the home screen.
    ...(IS_DEV && { icon: './assets/images/icon-dev.png' }),
    android: {
      ...config.android,
      package: IS_DEV ? DEV_PACKAGE : PROD_PACKAGE,
      ...(IS_DEV && {
        adaptiveIcon: {
          ...config.android?.adaptiveIcon,
          backgroundColor: '#FDE8D7',
          foregroundImage: './assets/images/android-icon-foreground-dev.png',
          backgroundImage: './assets/images/android-icon-background-dev.png',
        },
      }),
    },
    plugins: (config.plugins ?? []).map((plugin) =>
      launchUrl && Array.isArray(plugin) && plugin[0] === 'expo-dev-client'
        ? ['expo-dev-client', { ...plugin[1], android: { defaultLaunchURL: launchUrl } }]
        : plugin,
    ),
  };
};
