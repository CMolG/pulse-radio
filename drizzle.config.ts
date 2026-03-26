import { defineConfig } from 'drizzle-kit';
import { join } from 'node:path';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: join(process.cwd(), '.data', 'cache.db'),
  },
});
