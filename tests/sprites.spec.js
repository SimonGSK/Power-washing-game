// @ts-check
/* The sprite engine: every sprite in src/sprites.json rasterises, has the size its grid says,
   paints something, and flips as a mirror image. */
const { test, expect } = require("@playwright/test");
const { openGame } = require("./game");

test.describe("sprites", () => {
  test.beforeEach(async ({ page }) => { await openGame(page); });

  test("every sprite grid is rectangular and uses only palette letters", async ({ page }) => {
    const problems = await page.evaluate(() => {
      const S = window.PowerWashDebug.SPRITES, out = [];
      Object.keys(S).forEach((name) => {
        const sp = S[name];
        Object.keys(sp.frames).forEach((f) => {
          const rows = sp.frames[f];
          if(rows.length !== sp.h) out.push(name + "." + f + " has " + rows.length + " rows, wants " + sp.h);
          rows.forEach((r, i) => {
            if(r.length !== sp.w) out.push(name + "." + f + " row " + i + " is " + r.length + " wide, wants " + sp.w);
            for(const ch of r) if(ch !== "." && !sp.palette[ch]) out.push(name + "." + f + " uses unknown letter '" + ch + "'");
          });
        });
      });
      return out;
    });
    expect(problems).toEqual([]);
  });

  test("each sprite rasterises to its size, paints pixels, and mirrors when flipped", async ({ page }) => {
    const report = await page.evaluate(() => {
      const D = window.PowerWashDebug, S = D.SPRITES, out = [];
      const pixels = (c) => c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      Object.keys(S).forEach((name) => {
        Object.keys(S[name].frames).forEach((f) => {
          const c = D.Sprites.raster(name, f, false), m = D.Sprites.raster(name, f, true);
          const sz = D.Sprites.size(name);
          if(c.width !== sz.w || c.height !== sz.h) out.push(name + " canvas is " + c.width + "×" + c.height);
          const a = pixels(c), b = pixels(m);
          let painted = 0, mirrored = true;
          for(let y = 0; y < c.height; y++) for(let x = 0; x < c.width; x++){
            const i = (y * c.width + x) * 4, j = (y * c.width + (c.width - 1 - x)) * 4;
            if(a[i + 3]) painted++;
            for(let k = 0; k < 4; k++) if(a[i + k] !== b[j + k]) mirrored = false;
          }
          if(!painted) out.push(name + "." + f + " paints nothing");
          if(!mirrored) out.push(name + "." + f + " does not mirror cleanly");
        });
      });
      return out;
    });
    expect(report).toEqual([]);
  });

  test("the crew sprites the game needs all exist", async ({ page }) => {
    const names = await page.evaluate(() => Object.keys(window.PowerWashDebug.SPRITES));
    for(const n of ["hero", "son", "bot", "cat", "dog"]) expect(names).toContain(n);
  });
});
