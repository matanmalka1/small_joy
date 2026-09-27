import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgresql://smalljoy:devpass@localhost:5432/small_joy_test";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // "server-only" throws outside the React server runtime; it's a no-op in tests.
      "server-only": new URL("./tests/support/empty.ts", import.meta.url).pathname,
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/support/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DB,
      BETTER_AUTH_SECRET: "test-secret-test-secret-test-secret-123",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      PAYMENT_PROVIDER: "mock",
      MOCK_PAYMENT_WEBHOOK_SECRET: "test-mock-webhook-secret",
      STORAGE_DRIVER: "local",
    },
  },
});
