// @ts-check
/* A long play-through through the real buttons: start, wash, click every modal and story line,
   rest or work weekends, pay the bills, move routes, buy the business. It fails on any script
   error, on a screen that gets stuck, or on a calendar that stops moving. */
const { test, expect } = require("@playwright/test");
const { openGame, newGame } = require("./game");

/** Click through whatever is in front (story lines, modals) until the garage shows. */
async function backToGarage(page, prefer){
  for(let i = 0; i < 40; i++){
    if(await page.locator("#dlgWrap:not(.hidden)").count()){ await page.click("#dlgNext"); continue; }
    const modal = page.locator("#modalWrap:not(.hidden)");
    if(await modal.count()){
      const buttons = modal.locator("#modalBtns button:not([disabled])");
      let target = buttons.first();
      for(const p of prefer || []){ const b = modal.locator("#modalBtns button:not([disabled])", { hasText: p }); if(await b.count()){ target = b.first(); break; } }
      await target.click();
      continue;
    }
    if(await page.locator("#screen-home:not(.hidden)").count()) return true;
    if(await page.locator("#screen-legacy:not(.hidden)").count()){ await page.click('#tabs .tab[data-screen="screen-home"]'); continue; }
    if(await page.locator("#screen-shop:not(.hidden)").count()){ await page.click('#tabs .tab[data-screen="screen-home"]'); continue; }
    await page.waitForTimeout(50);
  }
  return false;
}

/** One job from the garage: start it (anyway, if a chemical is missing), wash `frac`, finish. */
async function playJob(page, frac){
  await page.click("#btnStartJob");
  for(let i = 0; i < 20; i++){
    if(await page.evaluate(() => { const j = window.PowerWashDebug.job; return !!(j && j.started); })) break;
    const modal = page.locator("#modalWrap:not(.hidden)");
    if(await modal.count()){
      const anyway = modal.locator("button", { hasText: /Start anyway/ });
      if(await anyway.count()) await anyway.click(); else await modal.locator("#modalBtns button").first().click();
    }
    await page.waitForTimeout(120);
  }
  await page.evaluate((f) => window.PowerWashDebug.wash(f), frac);
  if(frac < 1) await page.click("#btnQuitJob");
  await expect(page.locator("#modalWrap:not(.hidden)")).toBeVisible();
}

test("a long career: 45 jobs across all routes, weekends, bills, buyout, Legacy — no errors, never stuck", async ({ page }) => {
  test.setTimeout(180000);
  const errors = await openGame(page);
  await newGame(page);
  const INFO = {};   /* let the heads-ups show: they're part of the flow */
  let lastDay = -1, lastWeek = 1, stuck = 0;
  for(let n = 0; n < 45; n++){
    /* keep the wallet healthy so the career keeps going; buy what the route needs */
    await page.evaluate(() => { const D = window.PowerWashDebug, s = D.state; if(s.cash < 3000) D.patch({ cash: s.cash + 3000 });
      if(s.jobsCompleted >= 6) D.patch({ gear: { mosskiller: 1 } }); if(s.jobsCompleted >= 12) D.patch({ gear: { degreaser: 1 } });
      if(s.jobsCompleted >= 16) D.patch({ gear: { stripper: 1 } }); if(s.jobsCompleted >= 30) D.patch({ gear: { rustremover: 1 } });
      if(s.jobsCompleted === 13) D.patch({ region: "city" }); if(s.jobsCompleted === 31) D.patch({ region: "harbor" }); });
    if(n === 40) await page.evaluate(() => window.PowerWashDebug.patch({ cash: 45000 }));   /* the buyout comes up at the end of the job */
    await playJob(page, n % 5 === 4 ? 0.7 : 1);
    const ok = await backToGarage(page, n % 2 ? [/Rest until Monday/, /Buy it out/, /Monday/] : [/Work /, /Buy it out/]);
    if(!ok) stuck++;
    const s = await page.evaluate(() => { const st = window.PowerWashDebug.state; return { day: st.day, week: st.week, jobs: st.jobsCompleted, owned: st.ownedOutright }; });
    expect(s.jobs).toBe(n + 1);
    expect(s.day !== lastDay || s.week !== lastWeek).toBe(true);   /* the calendar moved */
    lastDay = s.day; lastWeek = s.week;
  }
  expect(stuck).toBe(0);
  const end = await page.evaluate(() => window.PowerWashDebug.state);
  expect(end.ownedOutright).toBe(true);
  expect(end.week).toBeGreaterThan(5);
  /* owning the business opens the Legacy shop for good */
  await page.click('#tabs .tab[data-screen="screen-legacy"]');
  await expect(page.locator("#legacyStatus")).toContainText("open for good");
  await expect(page.locator("#perkGrid button", { hasText: "Take it" }).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("repossession opens the Legacy window once, and it closes when you leave", async ({ page }) => {
  const errors = await openGame(page);
  await newGame(page);
  await page.evaluate(() => window.PowerWashDebug.patch({ cash: 0, day: 6, recentPays: [300, 300, 300], rep: 30 }));
  await page.evaluate(() => window.PowerWashDebug.advanceDay());
  /* Sal's offer → let the van go → the repossession notice sends you to the Legacy shop */
  for(let i = 0; i < 30 && !(await page.locator("#screen-legacy:not(.hidden)").count()); i++){
    if(await page.locator("#dlgWrap:not(.hidden)").count()){ await page.click("#dlgNext"); continue; }
    const modal = page.locator("#modalWrap:not(.hidden)");
    if(await modal.count()){ const van = modal.locator("button", { hasText: /take the van/i }); if(await van.count()) await van.click(); else await modal.locator("#modalBtns button").first().click(); continue; }
    await page.waitForTimeout(50);
  }
  const s = await page.evaluate(() => window.PowerWashDebug.state);
  expect(s.stats.repoCount).toBe(1);
  await expect(page.locator("#legacyStatus")).toContainText("Spend your stars now");
  await expect(page.locator("#perkGrid button", { hasText: "Take it" }).first()).toBeEnabled();
  await page.click('#tabs .tab[data-screen="screen-home"]');
  await page.click('#tabs .tab[data-screen="screen-legacy"]');
  await expect(page.locator("#legacyStatus")).toContainText("locked");
  expect(errors).toEqual([]);
});
