// @ts-check
/* Shared helpers: open the built game, reach the garage, click through dialogue. */
const { expect } = require("@playwright/test");

/** Opens index.html with a clean save and returns once the test hook is ready. */
async function openGame(page){
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if(m.type() === "error") errors.push(m.text()); });
  await page.goto("/index.html");
  await page.waitForFunction(() => !!window.PowerWashDebug);
  await page.evaluate(() => { localStorage.clear(); window.PowerWashDebug.reset(); });
  return errors;
}

/** Title screen → Start → skip the intro chat → garage (home screen). */
async function newGame(page){
  await page.click("#btnNewGame");
  await skipDialogue(page);
  await expect(page.locator("#screen-home")).toBeVisible();
}

/** Clicks "next" on the story box until it closes. */
async function skipDialogue(page){
  for(let i = 0; i < 40; i++){
    const open = await page.locator("#dlgWrap:not(.hidden)").count();
    if(!open) return;
    await page.click("#dlgNext");
    await page.waitForTimeout(30);
  }
  throw new Error("dialogue never closed");
}

/** Presses the first (primary) button on whatever modal is open, or does nothing. */
async function clickModal(page, label){
  const wrap = page.locator("#modalWrap:not(.hidden)");
  if(!(await wrap.count())) return false;
  const btn = label ? wrap.getByRole("button", { name: label }) : wrap.locator("#modalBtns button").first();
  await btn.click();
  return true;
}

/** Runs the whole game state through the hook. */
function state(page){ return page.evaluate(() => JSON.parse(JSON.stringify(window.PowerWashDebug.state))); }

/** Starts a job and waits for the truck intro to finish. */
async function startJob(page){
  await page.evaluate(() => window.PowerWashDebug.startJob());
  await expect(page.locator("#screen-job")).toBeVisible();
  /* a "New dirt" heads-up may sit in front of the truck intro */
  for(let i = 0; i < 60; i++){
    if(await page.evaluate(() => { const j = window.PowerWashDebug.job; return !!(j && j.started); })) return;
    await clickModal(page);
    await page.waitForTimeout(100);
  }
  throw new Error("job never started");
}

module.exports = { openGame, newGame, skipDialogue, clickModal, state, startJob };
