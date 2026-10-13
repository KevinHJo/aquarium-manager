import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // Test files share one database, so they must not run at the same time.
    fileParallelism: false,
  },
});
