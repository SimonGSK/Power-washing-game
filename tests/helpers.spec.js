// @ts-check
/* The helpers and the extras: the son, the foam cannon, tips, weekend overtime, contracts, crew pay.
   Each of these once "worked" in the code while doing next to nothing in play. */
const { test, expect } = require("@playwright/test");
const { openGame, newGame, clickModal, skipDialogue, state } = require("./game");

const INFO = { dirt_dust: 1, dirt_mud: 1, dirt_moss: 1, dirt_grease: 1, dirt_soot: 1, dirt_salt: 1, dirt_rust: 1, dirt_graffiti: 1, contracts: 1, tipjar: 1, weekend: 1 };

/* average cleanliness the helpers reach alone in a 40 s job, over a few jobs */
async function helpersAlone(page, patch){
  return page.evaluate(({ patch, INFO }) => {
    const D = window.PowerWashDebug, out = [];
    for(let k = 0; k < 4; k++){
      D.patch(Object.assign({ story: { intro: 1, firstJob: 1 }, info: INFO, region: "grove", jobsCompleted: 10 + k,
        gear: { mosskiller: 1, degreaser: 1, stripper: 1, rustremover: 1 } }, patch));
      D.startJob();
      const t = D.job.types.find((x) => x.chem); D.state.activeChem = t ? t.chem : "water";
      D.job.started = true;
      out.push(D.helpersFor(40000));
    }
    return out.reduce((a, b) => a + b, 0) / out.length;
  }, { patch, INFO });
}

test.describe("helpers", () => {
  test.beforeEach(async ({ page }) => { await openGame(page); await newGame(page); });

  test("your son's water gun cleans a real share of a job, more with upgrades", async ({ page }) => {
    const none = await helpersAlone(page, { son: 0 });
    const lv0 = await helpersAlone(page, { son: 1, gear: { watergun: 0 } });
    const lv3 = await helpersAlone(page, { son: 1, gear: { watergun: 3 } });
    expect(none).toBeLessThan(0.01);
    expect(lv0).toBeGreaterThan(0.05);
    expect(lv3).toBeGreaterThan(lv0 * 1.5);
    expect(lv3).toBeLessThan(0.45);   /* a helper, not a replacement */
  });

  test("the foam cannon cleans on its own, and level 2 does more", async ({ page }) => {
    const lv1 = await helpersAlone(page, { son: 0, gear: { foamcannon: 1 } });
    const lv2 = await helpersAlone(page, { son: 0, gear: { foamcannon: 2 } });
    expect(lv1).toBeGreaterThan(0.04);
    expect(lv2).toBeGreaterThan(lv1 * 1.4);
    expect(lv2).toBeLessThan(0.45);
  });

  test("tips mix how clean and how fast; a nearly-clean job that ran out of time still tips", async ({ page }) => {
    const t = await page.evaluate(() => {
      const D = window.PowerWashDebug; D.patch({ gear: { tipjar: 1 } }); D.startJob();
      const d = D.job.duration;
      return { max: D.job.tipMax, timeout90: D.tipNow(0, 0.9), timeout40: D.tipNow(0, 0.4), fast100: D.tipNow(d * 0.8, 1), fast80: D.tipNow(d * 0.8, 0.8), slow100: D.tipNow(d * 0.1, 1) };
    });
    expect(t.timeout90).toBeGreaterThan(0);
    expect(t.timeout40).toBe(0);
    expect(t.fast100).toBeGreaterThan(t.fast80);
    expect(t.fast100).toBeGreaterThan(t.slow100);
    expect(t.fast100).toBeLessThanOrEqual(t.max);
  });

  test("with Overtime the crew earn Saturday even when you rest; without it they don't", async ({ page }) => {
    for(const overtime of [0, 1]){
      await page.evaluate((ot) => { const D = window.PowerWashDebug; D.show("screen-home"); D.patch({ day: 5, cash: 100000, crew: { jordan: 0 }, gear: { overtime: ot }, recentPays: [200, 200, 200], stats: { crewEarnings: 0 } }); }, overtime);
      const sat = await page.evaluate(() => window.PowerWashDebug.crewIncomeOn(5));
      await page.evaluate(() => window.PowerWashDebug.restWeekend());
      await clickModal(page); await skipDialogue(page);
      const after = await state(page);
      const earned = after.stats.crewEarnings;
      if(overtime){ expect(sat).toBeGreaterThan(0); expect(earned).toBeGreaterThanOrEqual(sat); }
      else { expect(sat).toBe(0); expect(earned).toBe(0); }
      expect(after.day).toBe(0);
      await clickModal(page); await skipDialogue(page);
    }
  });

  test("contracts come on about half the jobs, and never three misses in a row", async ({ page }) => {
    const r = await page.evaluate((INFO) => {
      const D = window.PowerWashDebug; D.patch({ info: INFO, gear: { contracts: 1 }, sinceContract: 0 });
      let got = 0, run = 0, worst = 0;
      for(let j = 20; j < 80; j++){ D.patch({ jobsCompleted: j }); D.startJob(); if(D.job.contract){ got++; run = 0; } else { run++; worst = Math.max(worst, run); } }
      return { rate: got / 60, worst };
    }, INFO);
    expect(r.rate).toBeGreaterThanOrEqual(0.35);
    expect(r.rate).toBeLessThanOrEqual(0.6);
    expect(r.worst).toBeLessThanOrEqual(2);
  });

  test("crew wages are a real share of what they bring in, and hiring takes a few weeks to pay off", async ({ page }) => {
    const rows = await page.evaluate(() => {
      const D = window.PowerWashDebug, out = [];
      for(const region of ["grove", "city", "harbor"]){
        D.patch({ region, gear: { crewcore: 0, morale: 0, overtime: 0, family: 0 } });
        for(const c of D.CREW){
          const perJob = c.rate * D.data.REGIONS[region].pay, week = perJob * 5, wage = D.crewWage(c.id, 0);
          out.push({ id: c.id, region, share: wage / week, payback: c.hire / (week - wage) });
        }
      }
      return out;
    });
    for(const r of rows){
      expect(r.share, r.id + " in " + r.region).toBeGreaterThan(0.2);
      /* in the route where you'd hire them, a hire should take a few weeks to earn back */
      const home = { jordan: "grove", mimi: "city", rex: "harbor" }[r.id];
      if(r.region === home) expect(r.payback, r.id + " pays back too fast in " + home).toBeGreaterThan(2.5);
    }
  });

  test("Downtown's unlock introduces Degreaser, not Paint Stripper (graffiti comes later)", async ({ page }) => {
    await page.evaluate((INFO) => window.PowerWashDebug.patch({ jobsCompleted: 11, region: "grove", cash: 5000, info: INFO, story: { intro: 1, firstJob: 1 }, gear: { mosskiller: 1 } }), INFO);
    await page.evaluate(() => window.PowerWashDebug.startJob("driveway"));
    await page.waitForFunction(() => window.PowerWashDebug.job && window.PowerWashDebug.job.started);
    await page.evaluate(() => window.PowerWashDebug.wash(1));
    await clickModal(page, /Continue/);
    for(let i = 0; i < 6; i++){
      await skipDialogue(page);
      const txt = await page.locator("#modalCard").textContent();
      if(/Downtown unlocked/.test(txt || "")) break;
      await clickModal(page);
    }
    const card = page.locator("#modalCard");
    await expect(card).toContainText("Downtown unlocked");
    await expect(card).toContainText("Degreaser");
    await expect(card).not.toContainText("Paint Stripper");
    await expect(card).not.toContainText("Graffiti");
  });

  test("upgrade tips give exact numbers, e.g. water usage in L/s", async ({ page }) => {
    const rows = await page.evaluate(() => window.PowerWashDebug.gearDelta("pressure", 0));
    const water = rows.find((r) => r.label === "Water usage");
    expect(water).toBeTruthy();
    expect(water.delta).toMatch(/^\+\d+\.\d L\/s$/);
    const tree = await page.evaluate(() => { const D = window.PowerWashDebug; D.patch({ gear: { powercore: 1 } }); D.show("screen-upgrades"); const n = document.querySelector('#treeWrap [data-key="pressure"][data-level="0"]'); n.dispatchEvent(new MouseEvent("mouseenter")); return document.querySelector(".tree-tip").textContent; });
    expect(tree).toMatch(/Water usage: \+\d+\.\d L\/s/);
    expect(tree).not.toMatch(/more water/i);
  });
});
