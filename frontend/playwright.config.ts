import { defineConfig, devices } from "@playwright/test";

// End-to-end tests drive the production build against a real FastAPI server on a fresh, freshly seeded SQLite file.
// Ports differ from the dev servers (3000/8000) so both can run side by side.
const API_PORT = 8001;
const WEB_PORT = 3001;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1, // one shared database; each spec books its own listing and dates
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } }],
  webServer: [
    {
      command: "node e2e/start-api.mjs",
      env: { API_PORT: String(API_PORT) },
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      // The /api rewrite is fixed at build time, so the build must know the test API's address.
      command: `npm run build && npx next start -p ${WEB_PORT}`,
      env: { BACKEND_URL: `http://127.0.0.1:${API_PORT}` },
      url: `http://127.0.0.1:${WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 300_000,
    },
  ],
});
