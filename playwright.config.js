// @ts-check
const { defineConfig } = require("@playwright/test");

/* The game is one static file, so tests serve the repo root over http (canvas + localStorage
   behave the same as on GitHub Pages) and open index.html from there. */
module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["github"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:8123",
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure"
  },
  webServer: {
    command: "python3 -m http.server 8123 --bind 127.0.0.1",
    url: "http://127.0.0.1:8123/index.html",
    reuseExistingServer: !process.env.CI,
    timeout: 15000
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }]
});
