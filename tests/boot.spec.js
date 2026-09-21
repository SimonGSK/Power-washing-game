// @ts-check
const { test, expect } = require("@playwright/test");
const { openGame, newGame } = require("./game");

test.describe("boot", () => {
  test("loads with no script errors and shows the title screen", async ({ page }) => {
    const errors = await openGame(page);
    await expect(page.locator("#screen-title")).toBeVisible();
    await expect(page.locator("#btnNewGame")).toBeVisible();
    await expect(page.locator("#btnContinue")).toBeHidden();
    expect(errors).toEqual([]);
  });

  test("Start opens the garage and every tab switches screens", async ({ page }) => {
    const errors = await openGame(page);
    await newGame(page);
    const tabs = page.locator("#tabs .tab");
    const n = await tabs.count();
    expect(n).toBeGreaterThanOrEqual(5);
    for(let i = 0; i < n; i++){
      const id = await tabs.nth(i).getAttribute("data-screen");
      await tabs.nth(i).click();
      await expect(page.locator("#" + id)).toBeVisible();
    }
    expect(errors).toEqual([]);
  });

  test("the save survives a reload and offers Continue", async ({ page }) => {
    await openGame(page);
    await newGame(page);
    await page.evaluate(() => window.PowerWashDebug.patch({ cash: 4321, jobsCompleted: 3 }));
    await page.reload();
    await page.waitForFunction(() => !!window.PowerWashDebug);
    await expect(page.locator("#btnContinue")).toBeVisible();
    const s = await page.evaluate(() => window.PowerWashDebug.state);
    expect(s.cash).toBe(4321);
    expect(s.jobsCompleted).toBe(3);
  });

  test("night theme swaps the palette and rebuilds sprites without errors", async ({ page }) => {
    const errors = await openGame(page);
    await newGame(page);
    await page.click("#btnSettings");
    await page.locator("#modalWrap button", { hasText: /night mode|day mode/i }).first().click();
    expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBe("night");
    await page.click("#btnSettings");
    await page.locator("#modalWrap button", { hasText: /day mode/i }).click();
    const theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    expect(["day", "night"]).toContain(theme);
    expect(errors).toEqual([]);
  });
});
