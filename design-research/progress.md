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

## Draft PR requested

Preparing a draft from `design/upgrade` to `main`. Live base check: upgrade starts at 3fe9c2b; current origin/main is 4616d7f and includes upstream API spend protection, Sprig charging, save/battle/input fixes, CI and dependency changes. These have not been integrated into this branch. PR description explicitly scopes verification to the upgrade branch and keeps integration/revalidation, physical phones/Safari/Firefox and approved paid-generation testing unchecked. Existing local debugger/dependency/untracked user work is excluded. No merge/deploy.

Draft published: https://github.com/forbiddenlink/critter-vale/pull/21 and attached to this chat. GitHub confirms OPEN, draft, head design/upgrade, base main, mergeable CONFLICTING / merge state DIRTY. Do not treat recorded branch checks as verification of the eventual integration. Repository automation created a successful Vercel preview on push; no production deployment was initiated and nothing was merged. Socket Security report was still running at the status check. Next engineering step is upstream integration with safeguards preserved, followed by fresh dependency/runtime, build, tests and browser validation before marking ready.


## PR integration and cleanup requested

Current origin/main 4616d7f integrated in an isolated checkout so local debugger/dependency work remains excluded. Seven conflicts resolved: title metadata and corrupt-save notice, unified InputState for keyboard/directional touch controls, upstream pre-generation wallet charging in both labs, battle accessibility semantics and the journal CSS. API guards, game/save/battle-flow helpers, input abstraction, dependency manifests/lockfile, CI and favicon assets match origin/main exactly. No upstream safeguard was replaced with the older implementation.

Fresh validation: Node 24.21.0 (matches CI major), frozen dependency installation; build, explicit typecheck and 115 tests across 11 files pass. 60 Chrome desktop/mobile states have zero WCAG A/AA violations and zero page errors; 10 main journey groups pass. Four full-party emulated-touch layouts pass collision, movement/release, keyboard scroll and guide focus checks. Six wallet/save regression groups pass with mocked generation and isolated saves. Browser tests updated for upstream wallet signatures and index-keyed party targets. Evidence and fresh screenshots are integration-prefixed/in screenshots/integration. No paid generation or real player save used.

Lighthouse on the integrated production build: title mobile 94 performance / 100 accessibility / 100 best practices, desktop 100 throughout; saved world mobile 97/100/100, desktop 100 throughout. Title mobile is one point below the earlier run, with zero layout shift and 60ms blocking; routine measurement variation is possible, and no pre-upgrade Lighthouse baseline exists. Existing bundle-size advisory remains. No standalone linter is configured.

Cleanup audit: dependency dashboard #6 tracks pending updates; retain it. Renovate pnpm PR #20 is unrelated and remains open. Remote fix/summon-cost-abuse was squash-merged via #14; local feat/spectorjs-debugger represents user work. Branch/file deletion is deferred under the original non-destructive rule, with details in needs-approval.md. Keep upgrade PR draft; do not merge or deploy production.

Published integration commit 1a2c2ed. GitHub reports MERGEABLE/CLEAN; CI verify, Socket reports and Vercel preview all pass. Local design/upgrade is synchronized, preserving the Spector block, spectorjs dependency/lock entries, original local CLAUDE.md, .env.example and src/dev as uncommitted work. Local main was not changed. Frozen pnpm10 installation and build/115 tests also pass with those local debugger changes present. The earlier pnpm11 hoisted node_modules layout could not be reused without a purge; it was preserved intact at /Volumes/LizsDisk/_wt/critter-vale-node-modules-before-integration, then a fresh pinned installation was created. The original tracked user patch is backed up at /Volumes/LizsDisk/_wt/critter-vale-local-work-backup.patch. No user edits were committed. Temporary integration servers stopped after verification; isolated checkout retained pending the original deletion rule.

## Gameplay audit authorized

Phase A initial findings documented in gameplay-audit.md. Four browser regressions fail for the intended reasons: capture XP omitted, Escape starts trainer combat, healing feedback overstates recovered HP, no pre-trial lead selection. Source-backed balance analysis is in gameplay-balance.json. Ordinary progression is still running on frozen baseline port 5185 in the isolated checkout; current development/fixture verification uses root port 5184. No RNG/stat/currency changes in the ordinary run, no paid generation. Read the documented harness limitations before interpreting elapsed time or repeated events. Safe fixes and final natural-run outcome remain pending; retain all original local user edits.


Gameplay Phase B complete: capture now awards the existing active/healthy-bench XP and checks both evolutions; healthy lead selection persists through the existing save format; HUD shows element, quirk and numeric XP; guide explains preparation, quirks, healing reentry and actual generation charging. Escape cancels trainer dialogue; potion feedback reports actual healing. Added level-100 cap matching the existing save validator, after reproducing invalid saves above the limit. A keyboard regression found Space on Lead also talked to an NPC; interactive controls now keep their native activation. Five isolated Chrome regressions pass, including capture evolution and persisted no-switch trial lead. 118 unit tests, explicit typecheck and production build pass. Fresh 60 screen-state scans: zero WCAG A/AA violations/page errors. Four full-party phone layouts pass touch, scroll/focus and collision checks. Production Lighthouse: title mobile95/desktop100 and saved world mobile95/desktop100 performance, accessibility/best-practices100 throughout; world measurement is two points below the previous run under concurrent browser work, so recheck after ordinary play ends. Qlty metrics unavailable without project config; no standalone lint configured. Ordinary baseline progression still running; two crests, repeated Marlow defeats. No claim of Champion completion yet.
