# Critter Vale upgrade report

Completed October 9, 2026 on `design/upgrade`. Local code and evidence only. Nothing merged or deployed; main and production untouched. Existing user debugger/package work remains uncommitted and preserved.

## Result and rationale

The Vale Field Journal gives this creature-collecting RPG one consistent identity: forest ink, parchment panels, editorial serif headings, catalogue metadata and large original creature art. It draws from Le Puzz, Nossara, Exemplar, Read-Only Memory, Bruno Simon and Interface In Game. The direction fits a small exploratory adventure and keeps the original creatures and 3D world recognizable. Research includes 13 loaded live design references (four outside gaming) and nine loaded category peers, with blocks and limits recorded.

Every existing screen family was upgraded, including home, research lab, shop, dialogue, collection, battle menus, generation states, recovery and victory. This is a single-route game; “pages” are its playable screens and overlays.

## Features added

- Phone movement pad and interaction button; clickable contextual prompts.
- Readable party HUD with numeric HP, Sprigs, collection count, crests and next objective.
- Field guide covering controls, elemental strategy, capture, locations, progression and local-save limits.
- Collection search, caught/seen/undiscovered and element filters, result count, no-results reset and owned evolution facts.
- Battle HP numbers and favorable/resisted/neutral move cues; consistent readable inventory and party pickers.
- Labeled summon inputs, inline validation, draft-preserving retry, loading cancellation, and accurate full-party collection messaging.
- Fusion selection count/pressed states, cost and consumed-parent warning, cancel/loading/error/retry/preview treatment.
- Shared modal focus trapping/restoration, inert background controls, movement blocking, reduced-motion treatment and accessible control labels.
- Smaller title image copies and skipped hidden/obscured world drawing. Existing sprite PNGs retained.

No new backend, account, save schema, route, paid service or key. Existing reset/fusion behavior and warnings remain.

## Before and after

All screenshots were taken in real Chrome. Standard desktop is 1440×960 and phone is 390×844. Panels scroll inside the viewport; a phone screenshot is not an artificially enlarged full panel. Uncommon states use the actual components with isolated documented fixture data, not invented HTML. Generation previews use local sprite artwork with mocked API responses.

| Template | Before desktop | After desktop | Before phone | After phone |
|---|---|---|---|---|
| Title / starter selection | [View](screenshots/before/title-desktop.png) | [View](screenshots/after/title-desktop.png) | [View](screenshots/before/title-mobile.png) | [View](screenshots/after/title-mobile.png) |
| Overworld / party HUD | [View](screenshots/before/overworld-desktop.png) | [View](screenshots/after/overworld-desktop.png) | [View](screenshots/before/overworld-mobile.png) | [View](screenshots/after/overworld-mobile.png) |
| NPC dialogue | [View](screenshots/before/dialog-desktop.png) | [View](screenshots/after/dialog-desktop.png) | [View](screenshots/before/dialog-mobile.png) | [View](screenshots/after/dialog-mobile.png) |
| Home | [View](screenshots/before/home-desktop.png) | [View](screenshots/after/home-desktop.png) | [View](screenshots/before/home-mobile.png) | [View](screenshots/after/home-mobile.png) |
| Lab interior | [View](screenshots/before/lab-desktop.png) | [View](screenshots/after/lab-desktop.png) | [View](screenshots/before/lab-mobile.png) | [View](screenshots/after/lab-mobile.png) |
| Trading Post | [View](screenshots/before/shop-desktop.png) | [View](screenshots/after/shop-desktop.png) | [View](screenshots/before/shop-mobile.png) | [View](screenshots/after/shop-mobile.png) |
| Critter-Dex | [View](screenshots/before/dex-desktop.png) | [View](screenshots/after/dex-desktop.png) | [View](screenshots/before/dex-mobile.png) | [View](screenshots/after/dex-mobile.png) |
| Wild / trainer battle | [View](screenshots/before/battle-desktop.png) | [View](screenshots/after/battle-desktop.png) | [View](screenshots/before/battle-mobile.png) | [View](screenshots/after/battle-mobile.png) |
| Battle bag / party menu family | [View](screenshots/before/battle-bag-desktop.png) | [View](screenshots/after/battle-bag-desktop.png) | [View](screenshots/before/battle-bag-mobile.png) | [View](screenshots/after/battle-bag-mobile.png) |
| Summon form | [View](screenshots/before/summon-desktop.png) | [View](screenshots/after/summon-desktop.png) | [View](screenshots/before/summon-mobile.png) | [View](screenshots/after/summon-mobile.png) |
| Summon validation | [View](screenshots/before/summon-error-desktop.png) | [View](screenshots/after/summon-error-desktop.png) | [View](screenshots/before/summon-error-mobile.png) | [View](screenshots/after/summon-error-mobile.png) |
| Fusion picker | [View](screenshots/before/fusion-desktop.png) | [View](screenshots/after/fusion-desktop.png) | [View](screenshots/before/fusion-mobile.png) | [View](screenshots/after/fusion-mobile.png) |
| Fusion empty state | [View](screenshots/before/fusion-empty-desktop.png) | [View](screenshots/after/fusion-empty-desktop.png) | [View](screenshots/before/fusion-empty-mobile.png) | [View](screenshots/after/fusion-empty-mobile.png) |
| Whiteout recovery | [View](screenshots/before/faint-desktop.png) | [View](screenshots/after/faint-desktop.png) | [View](screenshots/before/faint-mobile.png) | [View](screenshots/after/faint-mobile.png) |
| Champion victory | [View](screenshots/before/victory-desktop.png) | [View](screenshots/after/victory-desktop.png) | [View](screenshots/before/victory-mobile.png) | [View](screenshots/after/victory-mobile.png) |
| Field guide (new) | Not previously present | [View](screenshots/after/guide-desktop.png) | Not previously present | [View](screenshots/after/guide-mobile.png) |

Additional desktop/phone state pairs: `dex-empty`, `dex-caught`, `shop-purchased`, `summon-full-party`, `summon-loading`, `summon-server-error`, `summon-preview`, `fusion-selected`, `fusion-loading`, `fusion-error`, `fusion-preview`, `battle-switch`, `battle-revive`, `battle-result`, `battle-trainer`. They are in screenshots/after and indexed by browser-verification.json. Extra narrow/short scroll captures prove the last starter, final collection card and guide return are reachable.

## Rubric

[Title review](title-review.md) records two screenshot/score/fix rounds. [Rollout review](rollout-review.md) records each template, findings and fixes. All 14 screen families finish at **4/5 in each category**: point of view, typography, layout/rhythm, color/imagery, motion, audience fit, memorability and craft. These are self-assessments against the selected direction, not independent quality ratings. No screen below 4 was accepted: initial craft failures included overlapping title utilities, focus behavior, search shortcut interception, hidden battle controls and reduced-motion flash behavior; these were reworked and checked.

## Verification

Build and typecheck pass. All 76 tests pass. Sixty desktop/phone Chrome state scans show zero WCAG A/AA violations, zero page errors and zero horizontal overflows. Ten main journey groups pass, including local-save reload, healing, purchase, capture, collection updates and Champion gating/win/continue. The 320×568 and 1024×600 scroll checks pass. Additional actual-callback checks confirm cancelled generation adds nothing, full-party summons persist only in the Dex, kept fusion consumes fixture parents/charges 80/saves, and insufficient Sprigs disable fusion. See [extra state results](extra-states.json).

No standalone lint configuration exists; TypeScript's configured unused/fallthrough checks pass. The production build retains a Three.js bundle-size advisory; it does not fail the build. See [verification](verification.md), [journey results](journeys.json) and [browser results](browser-verification.json).

Lighthouse production preview reports: first-visit title 95 mobile / 100 desktop performance; saved-world 99 mobile / 100 desktop performance; accessibility and best practices 100 for both entries/devices. Title SEO 92 because the local preview returns HTML for robots.txt. Reports: [title mobile](lighthouse-mobile.html), [title desktop](lighthouse-desktop.html), [world mobile](lighthouse-overworld-mobile.html), [world desktop](lighthouse-overworld-desktop.html). No original-site Lighthouse baseline was taken; the 79→95 title performance comparison is between upgrade iterations, not a claim against the original game.

## Blocked and untested

- Godly now redirects to Recent Design; Land-book details and some reference/peer sites were blocked. Details and exclusions are in [references](references.md) and [features](features.md). No blocked site was used as a live design observation. Competitor inventories cover loaded pages, not entire paid games.
- Live generation provider, billing, credentials and production serverless behavior are untested. Mocked success/error/loading tests avoid spending credits.
- Physical phones, Safari, Firefox and gamepads are untested. Chrome phone viewports and pointer input were tested. The graphical 3D world is not a fully nonvisual game interface.
- No original-site Lighthouse baseline; crawl policy and production robots response unverified. No route changes made.
- Cloud saves, trading, multiplayer and new regions were intentionally deferred because they need infrastructure/content/risky changes.

## Full needs-approval list

- Cloud saves/accounts, trading, multiplayer, leaderboard, or cross-device sync: require backend infrastructure and database/schema design.
- New regions, routes, public share URLs, CMS changes, or replacement/removal of existing content/features: outside this non-destructive upgrade.
- Real summon/fusion generation during verification: existing generation can incur cost; use isolated mocked responses instead. Fusion also consumes parents and Sprigs; never execute against a real player save.
- New paid assets, font subscriptions, services, API keys, analytics, or third-party trackers: not added.
- Deleting/replacing existing files or resetting existing progress: not performed. Existing New Game and fusion behavior are retained with clear warnings.

- Public crawl policy / new robots.txt or sitemap endpoints: Lighthouse on the local preview receives the SPA HTML fallback for robots.txt. Confirm intended indexing policy and production hosting behavior before adding SEO endpoints; no URL or crawl-policy changes made.

## Phase commits

1. `16b3400` — map screens and preserve baseline evidence.
2. `626cb97` — live design/category research.
3. `5482ad0` — single field-journal direction and feature plan.
4. `1bd47db` — design foundation and title, two review rounds.
5. `966d263` — all templates, touch/guide/collection/battle/lab features and state evidence.
6. `1d09aee` — final audit reports, real journeys, edge sizes and semantic corrections.
7. Final report commit completes the branch. No merge.
