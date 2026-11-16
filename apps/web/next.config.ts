import type { NextConfig } from 'next';

import { lanIp } from './src/dev-build';

const ip = lanIp();

const config: NextConfig = {
  agentRules: false,
  transpilePackages: ['@eatandcalc/shared'],
  // Phones open the local landing via the Mac's Wi-Fi address (dev APK download).
  allowedDevOrigins: ip ? [ip] : [],
};

export default config;
