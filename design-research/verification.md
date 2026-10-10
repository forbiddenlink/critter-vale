# Verification

October 9, 2026. Local development and production preview only; no merge or deployment. Node 22.23.1 matches the live mise runtime. No project-specific runtime pin exists. Existing user package and debugger work is preserved outside upgrade commits.

## Checks

- TypeScript `--noEmit`: passed, including configured unused-local/parameter and fallthrough checks.
- Production Vite build: passed. The existing Three.js-heavy entry remains above Vite's 500 kB advisory threshold (642 kB raw, 167 kB gzip); this is a warning, not a failed build.
- Vitest: 76 tests passed across 7 files.
- Whitespace/diff checks: passed.
- Lint: no lint script, ESLint configuration, or standalone linter is configured. No claim of a nonexistent lint run. The project's TypeScript lint-like checks passed.
- Chrome/axe: 60 desktop/phone screen-state scans with WCAG 2 A/AA and WCAG 2.1 AA tags; zero violations, zero page errors, zero document horizontal overflows. See browser-verification.json. Automated checks do not prove full accessibility.
- Focus restoration, movement blocking, real pointer-held phone controls, collection search/filter/reset, shop purchase, draft retention on generation error/retry, fusion selection/retry, battle revive/switch/win and trial restrictions passed assertions in verify-browser.cjs.
- Main journeys: all 10 groups in journeys.json passed. Actual keys/clicks enter buildings, heal, buy, capture, run, resume a save, view collection, gate Champion, defeat Champion, continue and save. Position placement, deterministic capture RNG, three crests and high-level Champion team are explicit isolated fixtures. Core game mechanics remain covered by the existing unit suite.
- Additional actual-callback checks: cancel adds nothing; a full-party summon persists to the Dex without exceeding six; keeping fusion consumes both fixture parents, adds the hybrid, charges 80 Sprigs and saves; unaffordable fusion stays disabled. Desktop/phone results: extra-states.json. Visible battle result banners captured after appearing.
- Narrow/short screens: 320×568 and 1024×600; last starter, last Dex card and guide return button reachable by scrolling, no horizontal overflow. See edge-sizes.json and the six extra screenshots.

## Lighthouse

Real Chrome against the production preview at 127.0.0.1:4174. Default simulated mobile and official Lighthouse desktop configuration. Returning-player runs preserve a synthetic local save; no personal browser data used. Desktop and mobile HTML/JSON reports are retained.

| Entry | Device | Performance | Accessibility | Best practices | SEO |
|---|---|---:|---:|---:|---:|
| First visit/title | Mobile | 95 | 100 | 100 | 92 |
| First visit/title | Desktop | 100 | 100 | 100 | 92 |
| Saved adventure/overworld | Mobile | 97 | 100 | 100 | Not requested |
| Saved adventure/overworld | Desktop | 100 | 100 | 100 | Not requested |

Title first-pass mobile performance was 79 with 5.3s simulated LCP. Compressed title-only copies reduced three sprite requests from about 532 kB to 105 kB; the subsequent pass reached 95 with 2.7s LCP, 50ms blocking time and zero layout shift. This is an iteration comparison, not an original-site Lighthouse baseline. The first desktop invocation incorrectly used a CLI preset flag with the programmatic API; it was corrected to the official desktop configuration before recording final results.

Lighthouse exposed visible/accessibility label mismatch on the touch action and a missing main landmark; both were corrected and returning-player audits reached 100 accessibility. Existing local-preview robots.txt requests fall through to HTML and fail SEO validation; no crawl policy or new public endpoint was invented. Source maps are absent and smaller image sizes remain a noncritical opportunity. See needs-approval.md for public crawl-policy work.

## Limits

- Paid generation not called: success/error/loading use simulated service responses and original local artwork. Actual provider credentials, latency, billing and production serverless behavior are untested.
- Desktop Chrome with phone viewport and pointer simulation was used; physical iOS/Android hardware, Safari, Firefox, gamepads and full nonvisual navigation of the graphical 3D world were not tested.
- The new UI does not make a Three.js world fully screen-reader playable. Commands, dialogs, forms, HP and collection content are labeled and keyboard tested.
- Gallery access blocks and competitor inventory limitations are in references.md/features.md. No blocked page is treated as a design observation.
- No original-site Lighthouse baseline was collected; no numerical performance-regression claim is made against it.
- No cloud save, account, database, new route, paid service or analytics was added; saves remain in the same browser and schema.

## Post-report continuation

Four additional six-member-party touch layouts (390×844, 844×390, 667×375, 320×568) pass with zero overlaps, WCAG A/AA violations and browser errors. Tests dispatch actual emulated touch events, verify hold/release, guide focus wrapping, last-party-member access and keyboard scrolling without player movement. Typecheck, build and all 76 unit tests pass again. See followup-review.md and followup-after.json. Firefox/WebKit executables are unavailable locally; coverage remains Chrome emulation.

Latest saved-world Lighthouse after the follow-up fix: mobile 97 performance, desktop 100; accessibility and best practices 100 on both. First-visit title scores remain the prior Phase 6 measurements because title behavior was unchanged.
