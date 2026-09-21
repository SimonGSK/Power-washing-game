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
    await page.evaluate(() => window.PowerWashDebug.applyTheme("night"));
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

  test("the theme follows the clock by default and can be pinned in Settings", async ({ page }) => {
    const errors = await openGame(page);
    await newGame(page);
    const t0 = await page.evaluate(() => window.PowerWashDebug.theme());
    expect(t0.pref).toBe("auto");
    const hour = new Date().getHours();
    expect(t0.effective).toBe(hour >= 19 || hour < 6 ? "night" : "day");
    expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBe(t0.effective);
    /* Settings cycles: clock → always day → always night → clock */
    await page.click("#btnSettings");
    await page.locator("#modalWrap button", { hasText: /follows the clock/i }).click();
    await expect(page.locator("#modalWrap button", { hasText: /always day/i })).toBeVisible();
    await page.locator("#modalWrap button", { hasText: /always day/i }).click();
    await expect(page.locator("#modalWrap button", { hasText: /always night/i })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBe("night");
    await page.reload();
    await page.waitForFunction(() => !!window.PowerWashDebug);
    expect(await page.evaluate(() => window.PowerWashDebug.theme().pref)).toBe("night");   /* remembered */
    expect(errors).toEqual([]);
  });
});
