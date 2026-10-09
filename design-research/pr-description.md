## Problem and result

Critter Vale's screens used inconsistent panels and controls, and exploration depended on a keyboard. This upgrade gives every game screen a shared field-journal design and adds touch movement, clearer party/progression information, collection tools, and more usable battle and generation flows.

- Rebuild the starter screen and shared typography, colors, panels, buttons and forms around the original creature art.
- Add a field guide, touch controls, numeric HP/objectives, Dex search/filters, and battle matchup cues.
- Improve modal focus, reduced motion, form validation/retry/cancel states, full-party summon messaging, and fusion selection/cost warnings.
- Fix full-party portrait/landscape control collisions and make party scrolling keyboard accessible.
- Preserve routes, save schema, gameplay content and existing PNG sources. No new service or key.

## Integrated upstream behavior — keep draft

Current main `4616d7f` is integrated. API spend protection, pre-generation Sprig charging/refunds, save recovery, battle-flow/input fixes, CI, favicon assets and dependency upgrades are preserved. Fresh verification below covers the integrated result on Node24. Baseline screenshots depict `3fe9c2b`; fresh integrated captures are in `design-research/screenshots/integration/`.

Existing local Spector/debugger, root dependency edits and untracked user files are excluded from the pushed commits.

## Evidence

- [Full report: every template before/after, research, scores and limits](https://github.com/forbiddenlink/critter-vale/blob/design/upgrade/design-research/report.md)
- [Full-party touch review and before/after captures](https://github.com/forbiddenlink/critter-vale/blob/design/upgrade/design-research/followup-review.md)
- [Verification details and Lighthouse reports](https://github.com/forbiddenlink/critter-vale/blob/design/upgrade/design-research/verification.md)
- [Deferred changes requiring approval](https://github.com/forbiddenlink/critter-vale/blob/design/upgrade/design-research/needs-approval.md)

| Starter screen | Touch landscape |
|---|---|
| ![Starter screen](https://github.com/forbiddenlink/critter-vale/blob/design/upgrade/design-research/screenshots/integration/title-desktop.png?raw=true) | ![Full-party landscape](https://github.com/forbiddenlink/critter-vale/blob/design/upgrade/design-research/screenshots/integration/followup-integration-touch-landscape-small.png?raw=true) |

## Validation and release checklist

- [x] Node 24.21.0: frozen dependency install, typecheck, production build and all 115 unit tests pass.
- [x] 60 Chrome screen-state accessibility checks and 10 main journey groups pass using isolated fixtures.
- [x] Four additional full-party touch layouts: no collisions, WCAG A/AA violations or browser errors; touch release, keyboard scrolling and focus wrapping pass.
- [x] Integrated Lighthouse performance: title 94 mobile/100 desktop; saved world 97 mobile/100 desktop. Accessibility and best practices 100 throughout.
- [x] Integrate current main and preserve upstream safeguards; repeat checks, browser journeys and six wallet/save regression groups with isolated mocks.
- [ ] Confirm GitHub CI completes successfully for the integrated commit.
- [ ] Play-test on physical iOS/Android and check Safari/Firefox; locally unavailable engines were not tested.
- [ ] Approve and run a live summon/fusion smoke test using isolated game data. Existing generation uses paid credits; all completed tests used mocks.
- [ ] Review production crawl policy before adding robots/sitemap endpoints. Local-preview SEO is 92 due to the HTML fallback for robots.txt.

There is no standalone lint configuration on this branch; configured TypeScript lint-like checks pass. Vite's Three.js bundle-size advisory remains. No original-site Lighthouse baseline was collected, and the graphical world is not fully nonvisual-player accessible. No merge or production deployment is requested by this draft.
