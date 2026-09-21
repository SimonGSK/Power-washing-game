#!/usr/bin/env python3
"""Assemble index.html from the parts in src/.

    python3 tools/build.py            # writes index.html
    python3 tools/build.py --check    # builds to a temp path and syntax-checks the script with node

Order matters: core (state, config, formulas) → sprites → art (icons, truck, canvas setup)
→ props → scenes → masks/jobs (in art.js) → sfx → engine → ui.
"""
import json, os, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")

def read(name):
    with open(os.path.join(SRC, name), encoding="utf-8") as f:
        return f.read()

def build():
    icons = json.load(open(os.path.join(SRC, "icons.json"), encoding="utf-8"))
    sprites = read("sprites.json") if os.path.exists(os.path.join(SRC, "sprites.json")) else "{}"
    head = read("head.html") + read("tokens.css") + "\n" + read("bundle.css") + read("game.css") + "</style>\n</head>\n"
    body = read("body.html")
    art = (read("art.js")
           .replace("__ICONS__", json.dumps(icons))
           .replace("__PROPS__", read("props.js"))
           .replace("__SCENES__", read("scenes.js")))
    script = (read("core.js") + "\n"
              + read("sprites.js").replace("__SPRITES__", sprites) + "\n"
              + art + "\n"
              + read("sfx.js") + "\n"
              + read("engine.js") + "\n"
              + read("ui.js").replace("__STORY__", read("story.js")))
    return head + body + "<script>\n" + script

def main():
    html = build()
    out = os.path.join(ROOT, "index.html")
    if "--check" in sys.argv:
        out = os.path.join(tempfile.gettempdir(), "pwco-check.html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(html)
    i, j = html.index("<script>") + 8, html.rindex("</script>")
    js = html[i:j]
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as t:
        t.write(js); path = t.name
    r = subprocess.run(["node", "--check", path], capture_output=True, text=True)
    os.unlink(path)
    if r.returncode != 0:
        print(r.stderr); sys.exit(1)
    print("built %s (%d lines, %d KB) — syntax ok" % (os.path.relpath(out, ROOT), html.count("\n"), len(html.encode()) // 1024))

if __name__ == "__main__":
    main()
