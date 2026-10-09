# Upgrade progress

Branch: `design/upgrade`. Never merge/deploy. Existing package.json, pnpm-lock.yaml, debugger block in src/main.ts, .env.example, CLAUDE.md, and src/dev are user work; do not commit those changes.

| Phase | Status | Evidence / next action |
|---|---|---|
| 1 Understand | Done | profile.md; 30 desktop/mobile baseline captures; 16b3400 |
| 2 Research | Done with access limits | references.md: 13 live references, 4 outside gaming; features.md: 8 loaded peers; blocks documented |
| 3 Decide | Done | plan.md: The Vale Field Journal; ranked non-destructive features and per-template plan |
| 4 Foundation/title | Done | Shared tokens/panels/focus behavior; title-review.md records two Chrome rounds and fixes; tsc + 76 tests passed |
| 5 All templates | In progress | Foundation applied; implement HUD/guide/touch, Dex tools, battle cues, lab state improvements, then capture all templates |
| 6 Verify | Pending | Build, tsc, tests, lint availability, Lighthouse, browser journeys |
| 7 Report | Pending | Before/after evidence, scores and limitations |

Runtime: Node 22.23.1 (mise global pin, no repo pin). pnpm wrapper initially tried installs without network and left links incomplete. Bundled pnpm with explicit hoisted local linking restored dependencies; no dependency version edits. Local Vite on 127.0.0.1:5174. Browser scripts require unsandboxed Chrome launch. Public reference access may be blocked by Cloudflare; never describe challenge pages as design references.
