// @ts-check
const { test, expect } = require("@playwright/test");
const { openGame, newGame, state } = require("./game");

test.describe("economy", () => {
  test.beforeEach(async ({ page }) => { await openGame(page); await newGame(page); });

  test("buying gear costs cash and raises the level; too poor buys nothing", async ({ page }) => {
    await page.evaluate(() => window.PowerWashDebug.patch({ cash: 500 }));
    const cost = await page.evaluate(() => window.PowerWashDebug.formulas.costOf("nozzle", 0));
    await page.evaluate((c) => window.PowerWashDebug.buyGear("nozzle", c), cost);
    let s = await state(page);
    expect(s.gear.nozzle).toBe(1);
    expect(s.cash).toBe(500 - cost);

    await page.evaluate(() => window.PowerWashDebug.patch({ cash: 1 }));
    await page.evaluate(() => window.PowerWashDebug.buyGear("pressure", 999));
    s = await state(page);
    expect(s.gear.pressure).toBe(0);
    expect(s.cash).toBe(1);
  });

  test("a wider, stronger spray drinks more water", async ({ page }) => {
    const w = await page.evaluate(() => {
      const D = window.PowerWashDebug, F = D.formulas;
      const base = F.waterPerTick();
      D.patch({ gear: { nozzle: 3 } }); const wide = F.waterPerTick();
      D.patch({ gear: { nozzle: 0, pressure: 3 } }); const strong = F.waterPerTick();
      D.patch({ gear: { pressure: 0, tank: 3 } }); const tank = F.tankMax();
      return { base, wide, strong, tank, tank0: (D.patch({ gear: { tank: 0 } }), F.tankMax()) };
    });
    expect(w.wide).toBeGreaterThan(w.base);
    expect(w.strong).toBeGreaterThan(w.base);
    expect(w.tank).toBeGreaterThan(w.tank0);
  });

  test("the weekly payment follows recent pay and the lease discount trims it", async ({ page }) => {
    const r = await page.evaluate(() => {
      const D = window.PowerWashDebug, F = D.formulas;
      D.patch({ recentPays: [200, 200, 200, 200, 200, 200] }); const low = F.overheadAmount(1);
      D.patch({ recentPays: [900, 900, 900, 900, 900, 900] }); const high = F.overheadAmount(1);
      D.patch({ gear: { lease: 3 } }); const leased = F.overheadAmount(1);
      return { low, high, leased, leaseMult: F.leaseMult() };
    });
    expect(r.high).toBeGreaterThan(r.low);
    expect(r.leased).toBeLessThan(r.high);
    expect(r.leaseMult).toBeCloseTo(0.7, 5);
  });

  test("Sunday with no cash and no loan brings the lender; refusing him takes the van", async ({ page }) => {
    await page.evaluate(() => window.PowerWashDebug.patch({ cash: 0, week: 2, recentPays: [300, 300, 300], story: { intro: 1 } }));
    await page.evaluate(() => window.PowerWashDebug.triggerBill());
    /* Sal's chat, then his offer */
    for(let i = 0; i < 20; i++){ if(!(await page.locator("#dlgWrap:not(.hidden)").count())) break; await page.click("#dlgNext"); }
    await expect(page.locator("#modalCard")).toContainText(/offer/i);
    await page.locator("#modalBtns button", { hasText: /take the van/i }).click();
    for(let i = 0; i < 20; i++){ if(!(await page.locator("#dlgWrap:not(.hidden)").count())) break; await page.click("#dlgNext"); }
    const s = await state(page);
    expect(s.stats.repoCount).toBe(1);
    expect(s.legacyAvailable).toBeTruthy();
    expect(s.recentPays).toEqual([]);
  });

  test("dirt gets tougher as the business grows, but a better rig keeps most of its edge", async ({ page }) => {
    const t = await page.evaluate(() => {
      const D = window.PowerWashDebug, F = D.formulas;
      const early = F.grimeToughness();
      D.patch({ jobsCompleted: 40 }); const later = F.grimeToughness();
      D.patch({ gear: { pressure: 3, nozzle: 3 } }); const rigged = F.grimeToughness();
      return { early, later, rigged, rigMult: F.rigMult() };
    });
    expect(t.later).toBeGreaterThan(t.early);
    expect(t.rigged).toBeGreaterThan(t.later);
    expect(t.rigged).toBeLessThan(t.later * t.rigMult);
  });
});

test.describe("home recommendations", () => {
  test("the Recommended box works at every stage of the rig, without script errors", async ({ page }) => {
    const errors = await openGame(page);
    await newGame(page);
    const seen = await page.evaluate(() => {
      const D = window.PowerWashDebug, titles = [];
      const order = ["powercore","nozzle","pressure","tankcore","tank","bizcore","patience","refill","flow","pay","cone","contracts","lease","tipjar","foamcannon","prowasher"];
      D.patch({ cash: 99999, jobsCompleted: 40, gear: { mosskiller: 1, degreaser: 1, stripper: 1, rustremover: 1 } });
      for(const k of order){
        for(let l = 0; l < 3; l++){
          D.patch({ gear: { [k]: Math.min(l + 1, (D.data.GEAR[k] || D.data.SHOP[k]).costs.length) } });
          D.show("screen-home");
          titles.push(document.getElementById("advicePanel").textContent.trim().slice(0, 40));
        }
      }
      return titles;
    });
    expect(seen.every((t) => t.length > 5)).toBe(true);
    expect(errors).toEqual([]);
  });
});
