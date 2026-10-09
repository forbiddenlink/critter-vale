# Upgrade progress

Branch: `design/upgrade`. Never merge/deploy. Existing package.json, pnpm-lock.yaml, debugger block in src/main.ts, .env.example, CLAUDE.md, and src/dev are user work; do not commit those changes.

| Phase | Status | Evidence / next action |
|---|---|---|
| 1 Understand | Done | profile.md; 30 desktop/mobile baseline captures; 16b3400 |
| 2 Research | Done with access limits | references.md: 13 live references, 4 outside gaming; features.md: 9 loaded peers; blocks documented |
| 3 Decide | Done | plan.md: The Vale Field Journal; ranked non-destructive features and per-template plan |
| 4 Foundation/title | Done | Shared tokens/panels/focus behavior; title-review.md records two Chrome rounds and fixes; tsc + 76 tests passed |
| 5 All templates | Done | rollout-review.md; 60 Chrome state captures and WCAG A/AA scans, no violations/errors; movement, focus, filters, purchases, lab retry and battle menus checked |
| 6 Verify | Done | verification.md; build/tsc/76 tests/diff checks; 60 clean axe states; 10 journey groups; narrow/short screens; title and saved-world Lighthouse |
| 7 Report | Done | report.md: before/after every original template, new guide, added features, scores, audits, limits and full approval list |

Runtime: Node 22.23.1 (mise global pin, no repo pin). pnpm wrapper initially tried installs without network and left links incomplete. Bundled pnpm with explicit hoisted local linking restored dependencies; no dependency version edits. Local Vite on 127.0.0.1:5174. Browser scripts require unsandboxed Chrome launch. Public reference access may be blocked by Cloudflare; never describe challenge pages as design references.

## Template tracking after Phase 5

Done: title; overworld/HUD; dialogue; home; lab interior; Trading Post; Dex including filtered/empty states; wild/trainer battle; bag/switch/revive target/results; summon form/validation/loading/error/retry/preview/full-party; fusion empty/picker/selection/loading/error/retry/preview; recovery; victory; field guide. Every template captured on desktop and phone. `browser-verification.json` records 60 scanned states, zero WCAG A/AA violations, zero page errors and no document horizontal overflow. Scores and fixes: rollout-review.md. Live AI service remains untested intentionally (paid calls prohibited); all verification uses simulated responses.

Phase 5 fixes found by browser checks: search x shortcut respected typing; focus restored after inert lifecycle updates; hidden trial controls remain hidden; inactive action prompt removed from accessibility tree; battle tool groups have valid semantics; reduced-motion encounter flash suppressed. Original PNGs retained; smaller title-only WebP copies reduce initial sprite transfer.

Phase 6: corrected touch action accessible name and added main landmark after Lighthouse. Final saved-world scores: mobile 99 performance/100 accessibility/100 best practices; desktop 100 across those categories. First-visit title final scores: mobile 95 performance/100 accessibility/100 best practices/92 SEO; desktop 100/100/100/92. No standalone lint exists; TypeScript lint-like checks pass. Paid service and physical-device/browser coverage remain limits, not claimed as tested.

Phase 7 complete. Phase 5 commit 966d263; Phase 6 commit 1d09aee. Report includes all template comparisons and the full approval list. Original user changes remain separate. No merge/deployment. Local preview remains available at 127.0.0.1:4174 while the process is running.

## Follow-up requested after report

Done: real emulated touch events, six-member parties and phone landscape checks. Firefox/WebKit executables are not installed; no extra browser downloads or paid requests made. Chrome tests reproduce HUD/movement overlap at 844×390, and HUD/tool overlap at 667×375. Near-NPC screenshots also show the contextual prompt underneath game tools in portrait. Root cause: independent fixed HUD/tool/prompt positions, with only a width breakpoint; short landscape uses desktop HUD height and narrow landscape uses a full-width HUD. Reproduction and failing overlap assertions: followup.cjs before. Fix reserves separate vertical/control regions while keeping all party content scrollable.

Follow-up complete: bounded/scrollable touch HUD, separate nearby-action prompt, compact landscape tools, named keyboard-focusable party list; arrows scroll party without moving player. Four touch cases have zero overlap/accessibility violations/page errors. Build/typecheck and 76 tests pass. Latest saved-world Lighthouse: mobile 97 performance / 100 accessibility / 100 best practices; desktop 100 across those categories. followup-review.md contains before/after captures. Existing user changes remain separate; no merge/deploy.
