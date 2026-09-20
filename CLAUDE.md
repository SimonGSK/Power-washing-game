# Power Wash Co.

A single-file browser game: everything lives in `index.html` (styles, markup, script). Open it in a browser to play; no build step.

## Git workflow — do this without asking

- Never work directly on `main`. At the start of a task, create a branch from `main` named for the task (e.g. `harbor-night-scenes`, `fix-tank-refill`).
- Commit as you go: after each self-contained change that runs without errors, commit with a clear message (what changed and why).
- When the task is done and verified in the browser, push the branch and open a ready-for-review pull request with `gh pr create` (title = summary, body = what changed, why, anything to check). Do not open drafts.
- Report the PR URL when done. If a PR already exists for the branch, push to it instead of opening another.
- Don't force-push or rewrite `main`.

## Design system

The look is the "Power Wash Co. Pixel Design System" (a Claude Design System artifact). Its rules are baked into `index.html`: tokens as CSS custom properties, `pw-*` component classes, a 3px pixel unit, no border-radius/blur/opacity, pixel icons instead of emoji, scenes painted at 240×150 and shown at 4×. Keep new UI and art inside those rules.
