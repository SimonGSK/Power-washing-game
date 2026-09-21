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

  test("pausing freezes the clock and blocks the wand; resuming gives the time back", async ({ page }) => {
    await startJob(page);
    /* the mouse is parked over the stage before the pause, as it would be mid-wash */
    const box = await page.locator("#stage").boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(400);
    await page.keyboard.press("p");   /* paused from the keyboard: the mouse never leaves the stage */
    await expect(page.locator("#stageOverlay")).toBeVisible();
    await expect(page.locator("#btnPauseJob")).toHaveText("Resume");
    const before = await page.locator("#timeLabel").textContent();
    await page.waitForTimeout(1500);
    expect(await page.locator("#timeLabel").textContent()).toBe(before);
    expect(await page.evaluate(() => window.PowerWashDebug.paused())).toBe(true);
    expect(await page.evaluate(() => window.PowerWashDebug.spraying())).toBe(false);
    /* resuming must arm the wand again without a click or a move (the spot under it may already
       be clean, so the flag is the thing to check, not the clean bar) */
    await page.keyboard.press("p");
    await expect(page.locator("#btnPauseJob")).toHaveText("Pause");
    await expect(page.locator("#stageOverlay")).toBeHidden();
    await page.waitForTimeout(300);   /* no click, no move */
    expect(await page.evaluate(() => window.PowerWashDebug.spraying())).toBe(true);
    const left = await page.evaluate(() => window.PowerWashDebug.job.duration - (performance.now() - window.PowerWashDebug.job.start));
    expect(left).toBeGreaterThan(38000);   /* ~0.5 s of real play used, the pause didn't count */
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

  test("the wrong chemical barely scratches moss; the right one cuts it; water dirt takes anything", async ({ page }) => {
    const f = await page.evaluate(() => {
      const F = window.PowerWashDebug.formulas, G = window.PowerWashDebug.data.GRIME_TYPES;
      return { water: F.chemFactor(G.moss, "water"), right: F.chemFactor(G.moss, "mosskiller"), wrong: F.chemFactor(G.moss, "stripper"), pricey: F.chemFactor(G.moss, "rustremover"), sootWithAnything: F.chemFactor(G.soot, "stripper") };
    });
    expect(f.right).toBe(1);
    expect(f.water).toBeLessThanOrEqual(0.1);
    expect(f.wrong).toBeLessThanOrEqual(0.1);
    expect(f.pricey).toBeLessThanOrEqual(0.1);   /* a dearer bottle is no master key */
    expect(f.sootWithAnything).toBe(1);
  });

  test("the tower gets the same dirt budget as a driveway, not double", async ({ page }) => {
    await page.evaluate(() => window.PowerWashDebug.patch({ jobsCompleted: 20, region: "city", gear: { degreaser: 1, stripper: 1 } }));
    await startJob(page, "windows");
    const stats = () => page.evaluate(() => {
      const D = window.PowerWashDebug, g = D.grimeStats(), layers = Math.max.apply(null, D.job.types.map((t) => t.layers));
      const dirt = D.data.REGIONS[D.job.region].dirt || 1;   /* the route's dirt factor */
      return Object.assign(g, { perLayer: g.hp / (0.7 + 0.5 * (layers - 0.3)) / dirt, cellsNorm: g.cells / dirt });
    });
    const tower = await stats();
    await page.evaluate(() => window.PowerWashDebug.patch({ region: "grove", gear: { mosskiller: 1 } }));
    await startJob(page, "driveway");
    const drive = await stats();
    expect(tower.cols * tower.rows).toBeGreaterThan(drive.cols * drive.rows * 1.8);   /* the wall really is bigger */
    /* …but the dirt on it is not: both sit inside the budget (2100 cells × 0.83 cover, × 0.78 hp per layer term) */
    for(const j of [tower, drive]){
      expect(j.cellsNorm).toBeLessThan(2100 * 0.83 * 1.12);
      expect(j.perLayer).toBeLessThan(2100 * 0.78 * 1.06);
    }
    expect(tower.perLayer).toBeGreaterThan(drive.perLayer * 0.5);
  });

  test("starting a job without its chemical offers the Shop first", async ({ page }) => {
    /* moss shows up from job 6; with no Moss Killer the garage button should stop and ask */
    await page.evaluate(() => window.PowerWashDebug.patch({ jobsCompleted: 8, cash: 800 }));
    let asked = false;
    for(let i = 0; i < 12 && !asked; i++){
      await page.click("#btnStartJob");
      if(await page.locator("#modalWrap:not(.hidden)").count()){
        const txt = await page.locator("#modalCard").textContent();
        if(/Missing Moss Killer/.test(txt || "")){ asked = true; break; }
      }
      /* a water-only job started: abandon it and try the next seed */
      await page.evaluate(() => { const D = window.PowerWashDebug; D.patch({ jobsCompleted: D.state.jobsCompleted + 1 }); D.show("screen-home"); });
      await page.evaluate(() => window.PowerWashDebug.startJob("driveway") && 0).catch(() => {});
      await page.evaluate(() => { const D = window.PowerWashDebug; if(D.job){ D.endJob("early"); } });
      await page.locator("#modalWrap:not(.hidden) button").first().click().catch(() => {});
      await skipDialogue(page);
      await page.evaluate(() => window.PowerWashDebug.show("screen-home"));
    }
    expect(asked).toBe(true);
    await page.locator("#modalBtns button", { hasText: /Go to the Shop/ }).click();
    await expect(page.locator("#screen-shop")).toBeVisible();
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
