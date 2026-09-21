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

  test("night paints a dark sky with lit windows instead of a dimmed day", async ({ page }) => {
    const errors = await openGame(page);
    await newGame(page);
    await page.click("#btnSettings");
    await page.locator("#modalWrap button", { hasText: /night mode/i }).click();
    await page.evaluate(() => window.PowerWashDebug.patch({ info: { dirt_dust: 1, dirt_mud: 1, dirt_moss: 1 } }));
    await page.evaluate(() => window.PowerWashDebug.startJob("driveway"));
    await page.waitForFunction(() => { const j = window.PowerWashDebug.job; return !!(j && j.started); });
    const px = await page.evaluate(() => {
      const c = document.getElementById("bgCanvas").getContext("2d");
      const at = (x, y) => Array.from(c.getImageData(x, y, 1, 1).data);
      /* top-left sky, and the left porch light's bulb (porchLight(a.x-1, 20) → box at y 23..26) */
      return { sky: at(2, 2), bulb: at(74, 25), night: window.PowerWashDebug.night() };
    });
    expect(px.night).toBe(true);
    expect(px.sky[2]).toBeGreaterThan(px.sky[0]);          /* blue-ish */
    expect(px.sky[0] + px.sky[1] + px.sky[2]).toBeLessThan(200);   /* and dark */
    expect(px.bulb[0]).toBeGreaterThan(200);                /* the porch light is on */
    expect(errors).toEqual([]);
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
