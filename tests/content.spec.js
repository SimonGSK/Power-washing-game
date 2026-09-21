// @ts-check
/* Data-integrity checks: every icon referenced exists, tree symbols are unique, chemicals
   match their dirt, the shop has no overlapping items. These are the regressions that are
   easiest to introduce while editing the tables in src/core.js. */
const { test, expect } = require("@playwright/test");
const { openGame } = require("./game");

test.describe("content tables", () => {
  test.beforeEach(async ({ page }) => { await openGame(page); });

  test("every icon the tables reference is in the icon set", async ({ page }) => {
    const missing = await page.evaluate(() => {
      const D = window.PowerWashDebug.data, have = new Set(D.icons), out = [];
      const check = (table, where) => Object.keys(table).forEach((k) => { const ic = table[k].icon; if(ic && !have.has(ic)) out.push(where + "." + k + " → " + ic); });
      check(D.GEAR, "GEAR"); check(D.SHOP, "SHOP"); check(D.PERKS, "PERKS"); check(D.CHEMS, "CHEMS"); check(D.GRIME_TYPES, "GRIME_TYPES"); check(D.REGIONS, "REGIONS");
      return out;
    });
    expect(missing).toEqual([]);
  });

  test("every skill-tree node has its own symbol", async ({ page }) => {
    const dupes = await page.evaluate(() => {
      const D = window.PowerWashDebug.data, seen = {}, out = [];
      D.LIMB_DEFS.forEach((limb) => [limb.core].concat(limb.twigs, [limb.leaf]).forEach((k) => {
        const ic = D.GEAR[k].icon;
        if(seen[ic]) out.push(k + " shares '" + ic + "' with " + seen[ic]); else seen[ic] = k;
      }));
      return out;
    });
    expect(dupes).toEqual([]);
  });

  test("each chemical wears the colour of the dirt it removes", async ({ page }) => {
    const mismatches = await page.evaluate(() => {
      const D = window.PowerWashDebug.data, out = [];
      Object.keys(D.CHEMS).forEach((id) => {
        const chem = D.CHEMS[id];
        if(!chem.cuts.length) return;
        const shades = chem.cuts.map((t) => D.GRIME_TYPES[t].shades).reduce((a, b) => a.concat(b), []);
        if(shades.indexOf(chem.color) < 0) out.push(id + " is " + chem.color + " but its dirt is " + shades.join("/"));
        if(D.CHEMS[id].icon === D.CHEMS.water.icon) out.push(id + " uses the water icon");
      });
      const flasks = Object.keys(D.CHEMS).filter((k) => k !== "water").map((k) => D.CHEMS[k].icon);
      if(new Set(flasks).size !== flasks.length) out.push("chemical icons are not unique: " + flasks.join(","));
      return out;
    });
    expect(mismatches).toEqual([]);
  });

  test("each chemical cuts exactly one kind of dirt, and no dirt needs two", async ({ page }) => {
    const bad = await page.evaluate(() => {
      const D = window.PowerWashDebug.data, out = [], seen = {};
      Object.keys(D.CHEMS).forEach((id) => {
        if(id === "water") return;
        const cuts = D.CHEMS[id].cuts;
        if(cuts.length !== 1) out.push(id + " cuts " + cuts.length + " kinds: " + cuts.join(","));
        cuts.forEach((t) => { if(seen[t]) out.push(t + " is cut by both " + seen[t] + " and " + id); seen[t] = id; });
      });
      return out;
    });
    expect(bad).toEqual([]);
  });

  test("chemicals are priced in the order their dirt shows up", async ({ page }) => {
    const order = await page.evaluate(() => {
      const D = window.PowerWashDebug.data;
      return Object.keys(D.SHOP).filter((k) => D.SHOP[k].chem).map((k) => ({ k, cost: D.SHOP[k].costs[0], unlock: D.DIRT_UNLOCK[D.CHEMS[k].cuts[0]] }));
    });
    for(let i = 1; i < order.length; i++){
      expect(order[i].unlock, order[i].k + " unlocks before " + order[i-1].k + " but is listed after it").toBeGreaterThanOrEqual(order[i-1].unlock);
      expect(order[i].cost, order[i].k + " should cost more than " + order[i-1].k).toBeGreaterThan(order[i-1].cost);
    }
  });

  test("every dirt type has a chemical that cuts it, or is water-only", async ({ page }) => {
    const bad = await page.evaluate(() => {
      const D = window.PowerWashDebug.data;
      return Object.keys(D.GRIME_TYPES).filter((t) => { const c = D.GRIME_TYPES[t].chem; return c && !(D.CHEMS[c] && D.CHEMS[c].cuts.indexOf(t) >= 0); });
    });
    expect(bad).toEqual([]);
  });

  test("routes get dirtier in order: grove < downtown < harbor", async ({ page }) => {
    const d = await page.evaluate(() => { const R = window.PowerWashDebug.data.REGIONS; return [R.grove.dirt || 1, R.city.dirt || 1, R.harbor.dirt || 1]; });
    expect(d[1]).toBeGreaterThan(d[0]);
    expect(d[2]).toBeGreaterThan(d[1]);
  });

  test("the shop sells one lease discount, not two", async ({ page }) => {
    const shop = await page.evaluate(() => Object.keys(window.PowerWashDebug.data.SHOP));
    expect(shop).toContain("lease");
    expect(shop).not.toContain("permit");
  });

  test("gear prices rise level by level", async ({ page }) => {
    const bad = await page.evaluate(() => {
      const D = window.PowerWashDebug.data, out = [];
      [D.GEAR, D.SHOP].forEach((t) => Object.keys(t).forEach((k) => { const c = t[k].costs; for(let i = 1; i < c.length; i++) if(c[i] <= c[i - 1]) out.push(k); }));
      return out;
    });
    expect(bad).toEqual([]);
  });
});
