import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Static config lives in app.json; this only adds per-variant tweaks.
 * APP_VARIANT=development is set by `npm run android:dev` and the EAS `development` profile.
 */
const IS_DEV = process.env.APP_VARIANT === 'development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_DEV ? 'Eat And Calc (dev)' : 'Eat And Calc',
  slug: config.slug ?? 'eatandcalc',
});
