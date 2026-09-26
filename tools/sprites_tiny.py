"""The Tiny Crew sprites: fill-only grids plus the outline rule, baked into src/sprites.json.

    python3 tools/sprites_tiny.py            # writes hero, son, bot, cat, dog into src/sprites.json
    python3 tools/sprites_tiny.py --sheet    # also writes tools/sprite-preview.html (git-ignored)

The rule: every sprite gets a 1 px ink ring, and inside corners on the shadow side (right and
below) get a second pixel, so the crew read as chunky little figures on any background. Colours
are flat — no shading letters survive except the eye (E), the cap shine (X) and the brim (V).
Anchors (in the finished grid, top-left = 0,0) tell the game where hands are, so the wand and the
water gun attach in the right place. After baking, the grids can be touched up in
tools/pixel-editor.html like any other sprite."""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SPRITES = os.path.join(HERE, "..", "src", "sprites.json")

FLAT_KEEP = set("EXVKRWGgYOT")   # letters that keep their own colour when flattening

SHAPES = {
    # the hero: 12x12, a head two thirds of the body, cap brim and arm facing right
    "hero": {
        "hand": (10, 8),
        "palette": {"C": "#e2403a", "V": "#8a1c1e", "X": "#f58a78", "H": "#6b3a1e", "N": "#f6c9a0",
                    "E": "#1b1420", "S": "#3f78d8", "P": "#5a4a3e", "B": "#2e2622"},
        "rows": [
            "...cCCCc....",
            "..cCXCCCc...",
            ".cCCCCCCcVV.",
            ".HccccccccV.",
            ".HHNNNNNNN..",
            ".HhNNNENNE..",
            "..hNNNNNNn..",
            "...nnnnnn...",
            "..SSSSSSSNN.",
            "..sSSSSSs...",
            "...PPpPPp...",
            "..BBb.BBb...",
        ]},
    # your son: 10x10, yellow cap, green shirt
    "son": {
        "hand": (8, 6),
        "palette": {"C": "#f2c12e", "V": "#a8740e", "X": "#ffe08a", "H": "#8a5030", "N": "#f6c9a0",
                    "E": "#1b1420", "S": "#6fb043", "P": "#3f78d8", "B": "#2e2622"},
        "rows": [
            "..cCCCc...",
            ".cCXCCCVV.",
            ".HcccccVV.",
            ".HNNNENE..",
            "..nNNNNn..",
            "...nnnn...",
            "..SSSSSNN.",
            "..sSSSs...",
            "..PPpPp...",
            "..Bb.Bb...",
        ]},
    # WashBot 3000: a little tread-bot with a visor and a nozzle arm (hand = nozzle)
    "bot": {
        "hand": (11, 6),
        "palette": {"R": "#e2403a", "G": "#c8ccd4", "g": "#8a90a0", "W": "#a5dcf3", "E": "#1b1420",
                    "Y": "#f6c744", "B": "#2e2622"},
        "rows": [
            ".....R......",
            ".....g......",
            "..GGGGGGGG..",
            "..GWWWWWWG..",
            "..GWEWWEWG..",
            "..GGGGGGGG..",
            "..gGGYYGGgYY",
            "..gGGGGGGg..",
            "..gggggggg..",
            ".BBBBBBBBBB.",
            ".B.B.B.B.B..",
        ]},
    # a grey cat, sitting, looking left
    "cat": {
        "palette": {"G": "#8c8c93", "g": "#5d5d65", "E": "#f2c12e", "R": "#e8a0b0", "O": "#ffffff"},
        "rows": [
            ".G...G......",
            ".GG.GG......",
            ".GGGGG......",
            ".GEGEG......",
            "..GRG....G..",
            "..GOGG...G..",
            ".GGGGGG.G...",
            ".GGGGGGGG...",
            ".GG.GG.GG...",
        ]},
    # a brown dog, standing, looking left, tail up
    "dog": {
        "palette": {"B": "#b8813f", "T": "#7e451a", "E": "#1b1420", "R": "#e2403a"},
        "rows": [
            "..........T.",
            ".TT.......B.",
            "TBBT.....BB.",
            "BEBBBBBBBBB.",
            "EBBRBBBBBBB.",
            "..BBBBBBBB..",
            "..B.B..B.B..",
            "..B.B..B.B..",
        ]},
}


def bake(shape):
    rows = shape["rows"]
    w, h = len(rows[0]), len(rows)
    assert all(len(r) == w for r in rows), [len(r) for r in rows]
    pal = shape["palette"]
    W, H = w + 2, h + 2
    fill = [[None] * W for _ in range(H)]
    for y, r in enumerate(rows):
        for x, ch in enumerate(r):
            if ch == ".":
                continue
            if ch not in FLAT_KEEP and ch.upper() in pal:
                ch = ch.upper()
            assert ch in pal, (ch, r)
            fill[y + 1][x + 1] = ch

    def f(x, y):
        return fill[y][x] if 0 <= x < W and 0 <= y < H else None

    out = [[None] * W for _ in range(H)]
    for y in range(H):
        for x in range(W):
            if f(x, y):
                continue
            if any(f(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                out[y][x] = "K"

    def o(x, y):
        return out[y][x] if 0 <= x < W and 0 <= y < H else None

    # the second ring: inside corners on the shadow side
    for y in range(H - 1, -1, -1):
        for x in range(W - 1, -1, -1):
            if f(x, y) or o(x, y):
                continue
            if (o(x - 1, y) or o(x, y - 1)) and (f(x - 2, y) or f(x, y - 2)):
                out[y][x] = "K"

    grid = ["".join(f(x, y) or o(x, y) or "." for x in range(W)) for y in range(H)]
    palette = {"K": "ink"}
    palette.update(pal)
    sprite = {"w": W, "h": H, "palette": palette, "frames": {"idle": grid}}
    if "hand" in shape:
        sprite["anchors"] = {"hand": [shape["hand"][0] + 1, shape["hand"][1] + 1]}
    return sprite


def main():
    data = json.load(open(SPRITES))
    for name, shape in SHAPES.items():
        data[name] = bake(shape)
    json.dump(data, open(SPRITES, "w"), indent=1)
    print("baked", ", ".join(SHAPES), "->", os.path.relpath(SPRITES))
    if "--sheet" in sys.argv:
        ink = "#141424"
        html = '<html><body style="background:#8fd0f4;padding:24px;display:flex;gap:28px;align-items:flex-end;font:13px monospace">'
        for name in SHAPES:
            s = data[name]
            sc = 10
            svg = '<svg width="%d" height="%d" viewBox="0 0 %d %d" shape-rendering="crispEdges">' % (s["w"] * sc, s["h"] * sc, s["w"], s["h"])
            for y, r in enumerate(s["frames"]["idle"]):
                for x, ch in enumerate(r):
                    if ch == ".":
                        continue
                    c = s["palette"][ch]
                    svg += '<rect x="%d" y="%d" width="1" height="1" fill="%s"/>' % (x, y, ink if c == "ink" else c)
            html += '<div style="text-align:center">' + svg + "</svg><br>" + name + "</div>"
        open(os.path.join(HERE, "sprite-preview.html"), "w").write(html + "</body></html>")
        print("sheet -> tools/sprite-preview.html")


if __name__ == "__main__":
    main()
