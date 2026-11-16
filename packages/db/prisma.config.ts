import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma 7 doesn't load env files itself. Local values live in .env.local (gitignored);
// in CI the variables come from the environment.
config({ path: ['.env.local', '.env'], quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Migrations need a direct (unpooled) connection; locally it's the same Docker URL.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
