## Problem and result

Critter Vale's screens used inconsistent panels and controls, and exploration depended on a keyboard. This upgrade gives every game screen a shared field-journal design and adds touch movement, clearer party/progression information, collection tools, and more usable battle and generation flows.

- Rebuild the starter screen and shared typography, colors, panels, buttons and forms around the original creature art.
- Add a field guide, touch controls, numeric HP/objectives, Dex search/filters, and battle matchup cues.
- Improve modal focus, reduced motion, form validation/retry/cancel states, full-party summon messaging, and fusion selection/cost warnings.
- Fix full-party portrait/landscape control collisions and make party scrolling keyboard accessible.
- Preserve routes, save schema, gameplay content and existing PNG sources. No new service or key.

## Integration requirement — keep draft

This branch starts from `3fe9c2b`; current `main` is `4616d7f`. Upstream includes summon API spend protection, Sprig charging, save/battle/input fixes, favicon changes, CI and dependency upgrades. Integrate those changes without losing their behavior, resolve conflicts, and rerun verification before considering release. The results below validate the upgrade branch, **not an integrated result with current main**. Baseline screenshots also depict `3fe9c2b`, not current main.

Existing local Spector/debugger, root dependency edits and untracked user files are excluded from the pushed commits.

## Evidence

- [Full report: every template before/after, research, scores and limits](https://github.com/forbiddenlink/critter-vale/blob/design/upgrade/design-research/report.md)
- [Full-party touch review and before/after captures](https://github.com/forbiddenlink/critter-vale/blob/design/upgrade/design-research/followup-review.md)
- [Verification details and Lighthouse reports](https://github.com/forbiddenlink/critter-vale/blob/design/upgrade/design-research/verification.md)
- [Deferred changes requiring approval](https://github.com/forbiddenlink/critter-vale/blob/design/upgrade/design-research/needs-approval.md)

| Starter screen | Touch landscape |
|---|---|
| ![Starter screen](https://github.com/forbiddenlink/critter-vale/blob/design/upgrade/design-research/screenshots/after/title-desktop.png?raw=true) | ![Full-party landscape](https://github.com/forbiddenlink/critter-vale/blob/design/upgrade/design-research/screenshots/after/followup-after-touch-landscape-small.png?raw=true) |

## Validation and release checklist

- [x] Node 22.23.1: typecheck, production build and all 76 unit tests pass.
- [x] 60 Chrome screen-state accessibility checks and 10 main journey groups pass using isolated fixtures.
- [x] Four additional full-party touch layouts: no collisions, WCAG A/AA violations or browser errors; touch release, keyboard scrolling and focus wrapping pass.
- [x] Lighthouse performance: title 95 mobile/100 desktop; saved world 97 mobile/100 desktop. Accessibility and best practices 100 throughout.
- [ ] Integrate current main, preserve upstream safeguards and gameplay changes, then run its CI/runtime/dependency checks and repeat browser journeys.
- [ ] Play-test on physical iOS/Android and check Safari/Firefox; locally unavailable engines were not tested.
- [ ] Approve and run a live summon/fusion smoke test using isolated game data. Existing generation uses paid credits; all completed tests used mocks.
- [ ] Review production crawl policy before adding robots/sitemap endpoints. Local-preview SEO is 92 due to the HTML fallback for robots.txt.

There is no standalone lint configuration on this branch; configured TypeScript lint-like checks pass. Vite's Three.js bundle-size advisory remains. No original-site Lighthouse baseline was collected, and the graphical world is not fully nonvisual-player accessible. No merge or production deployment is requested by this draft.
