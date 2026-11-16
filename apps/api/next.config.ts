import type { NextConfig } from 'next';

const config: NextConfig = {
  agentRules: false,
  // Workspace packages ship TypeScript sources.
  transpilePackages: ['@eatandcalc/db', '@eatandcalc/shared'],
};

export default config;
