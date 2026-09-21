// @ts-check
const { test, expect } = require("@playwright/test");
const { openGame, newGame, skipDialogue, clickModal, state, startJob } = require("./game");

test.describe("a job", () => {
  test.beforeEach(async ({ page }) => { await openGame(page); await newGame(page); });

  test("starts dirty, gets cleaner when sprayed, and pays out at 100%", async ({ page }) => {
    await startJob(page);
    expect(await page.evaluate(() => window.PowerWashDebug.cleanliness())).toBeLessThan(0.05);
    await expect(page.locator("#chemBar button")).toHaveCount(1);   /* water only at the start */

    await page.evaluate(() => window.PowerWashDebug.wash(0.5));
    const half = await page.evaluate(() => window.PowerWashDebug.cleanliness());
    expect(half).toBeGreaterThan(0.3);
    expect(half).toBeLessThan(0.8);

    const before = await state(page);
    await page.evaluate(() => window.PowerWashDebug.wash(1));
    await expect(page.locator("#modalWrap")).toBeVisible();
    await expect(page.locator("#modalCard")).toContainText("100%");
    const after = await state(page);
    expect(after.jobsCompleted).toBe(before.jobsCompleted + 1);
    expect(after.cash).toBeGreaterThan(before.cash);
    expect(after.streak).toBe(1);
    expect(after.recentPays.length).toBe(1);
  });

  test("the wand actually removes grime where it points", async ({ page }) => {
    await startJob(page);
    const removed = await page.evaluate(() => {
      const D = window.PowerWashDebug, a = D.job.area;
      let total = 0;
      for(let i = 0; i < 40; i++) total += D.spray(a.x + a.w / 2, a.y + a.h / 2, 12, 2, "auto");
      return total;
    });
    expect(removed).toBeGreaterThan(0);
    expect(await page.evaluate(() => window.PowerWashDebug.cleanliness())).toBeGreaterThan(0);
  });

  test("packing up early pays for the part that's clean, and nothing under 30%", async ({ page }) => {
    await startJob(page);
    await page.evaluate(() => window.PowerWashDebug.wash(0.1));
    let before = await state(page);
    await page.click("#btnQuitJob");
    await expect(page.locator("#modalCard")).toContainText("no pay");
    let after = await state(page);
    expect(after.cash).toBe(before.cash);
    expect(after.streak).toBe(0);
    await clickModal(page); await skipDialogue(page); await clickModal(page);

    await startJob(page);
    await page.evaluate(() => window.PowerWashDebug.wash(0.8));
    before = await state(page);
    await page.click("#btnQuitJob");
    after = await state(page);
    expect(after.cash).toBeGreaterThan(before.cash);
  });

  test("the wrong chemical barely scratches moss; the right one cuts it", async ({ page }) => {
    const f = await page.evaluate(() => {
      const F = window.PowerWashDebug.formulas, moss = window.PowerWashDebug.data.GRIME_TYPES.moss;
      return { water: F.chemFactor(moss, "water"), right: F.chemFactor(moss, "mosskiller"), wrong: F.chemFactor(moss, "degreaser") };
    });
    expect(f.right).toBe(1);
    expect(f.water).toBeLessThan(0.5);
    expect(f.wrong).toBeLessThan(0.5);
  });

  test("the calendar advances a day per job and the weekend asks what to do", async ({ page }) => {
    await page.evaluate(() => window.PowerWashDebug.patch({ day: 4, cash: 20000 }));
    await startJob(page);
    await page.evaluate(() => window.PowerWashDebug.wash(1));
    await clickModal(page, /Continue/);
    await skipDialogue(page);
    /* firstJob story → the "Heads up" about weekends → the weekend choice itself */
    for(let i = 0; i < 6; i++){
      const txt = await page.locator("#modalCard").textContent().catch(() => "");
      if(/It.s the weekend/.test(txt || "") && await page.locator("#modalWrap:not(.hidden)").count()) break;
      await clickModal(page); await skipDialogue(page);
    }
    await expect(page.locator("#modalCard")).toContainText(/It.s the weekend/);
    await expect(page.locator("#modalCard")).toContainText(/Saturday/);
    await clickModal(page, /Rest until Monday/);
    await skipDialogue(page);
    /* Sunday's payment comes out of the pile */
    await expect(page.locator("#modalCard")).toContainText(/Payment made/);
    const s = await state(page);
    expect(s.day).toBe(0);
    expect(s.week).toBe(2);
    expect(s.cash).toBeLessThan(20000 + 1000); /* the job paid, the bill took more */
  });
});
