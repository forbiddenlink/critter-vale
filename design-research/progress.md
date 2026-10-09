# Upgrade progress

Branch: `design/upgrade`. Never merge/deploy. Existing package.json, pnpm-lock.yaml, debugger block in src/main.ts, .env.example, CLAUDE.md, and src/dev are user work; do not commit those changes.

| Phase | Status | Evidence / next action |
|---|---|---|
| 1 Understand | Done | profile.md; 30 desktop/mobile baseline captures; 16b3400 |
| 2 Research | Done with access limits | references.md: 13 live references, 4 outside gaming; features.md: 9 loaded peers; blocks documented |
| 3 Decide | Done | plan.md: The Vale Field Journal; ranked non-destructive features and per-template plan |
| 4 Foundation/title | Done | Shared tokens/panels/focus behavior; title-review.md records two Chrome rounds and fixes; tsc + 76 tests passed |
| 5 All templates | Done | rollout-review.md; 60 Chrome state captures and WCAG A/AA scans, no violations/errors; movement, focus, filters, purchases, lab retry and battle menus checked |
| 6 Verify | In progress | Build/tsc/76 tests pass; Lighthouse first pass 100 accessibility, image-loading improvements underway; full journeys running |
| 7 Report | Pending | Before/after evidence, scores and limitations |

Runtime: Node 22.23.1 (mise global pin, no repo pin). pnpm wrapper initially tried installs without network and left links incomplete. Bundled pnpm with explicit hoisted local linking restored dependencies; no dependency version edits. Local Vite on 127.0.0.1:5174. Browser scripts require unsandboxed Chrome launch. Public reference access may be blocked by Cloudflare; never describe challenge pages as design references.

## Template tracking after Phase 5

Done: title; overworld/HUD; dialogue; home; lab interior; Trading Post; Dex including filtered/empty states; wild/trainer battle; bag/switch/revive target/results; summon form/validation/loading/error/retry/preview/full-party; fusion empty/picker/selection/loading/error/retry/preview; recovery; victory; field guide. Every template captured on desktop and phone. `browser-verification.json` records 60 scanned states, zero WCAG A/AA violations, zero page errors and no document horizontal overflow. Scores and fixes: rollout-review.md. Live AI service remains untested intentionally (paid calls prohibited); all verification uses simulated responses.

Phase 5 fixes found by browser checks: search x shortcut respected typing; focus restored after inert lifecycle updates; hidden trial controls remain hidden; inactive action prompt removed from accessibility tree; battle tool groups have valid semantics; reduced-motion encounter flash suppressed. Original PNGs retained; smaller title-only WebP copies reduce initial sprite transfer.
