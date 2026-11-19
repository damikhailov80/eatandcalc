import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Static config lives in app.json; this only adds per-variant tweaks.
 * APP_VARIANT=development is set by `npm run android:dev` and the EAS `development` profile.
 * The dev build gets its own package so it installs next to the production APK.
 */
const IS_DEV = process.env.APP_VARIANT === 'development';
const PROD_PACKAGE = 'com.eatandcalc.app';
const DEV_PACKAGE = `${PROD_PACKAGE}.dev`;

export default ({ config }: ConfigContext): ExpoConfig => ({
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
});
