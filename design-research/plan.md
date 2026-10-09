# Design and implementation plan

## One direction: The Vale Field Journal
A small, tactile adventure journal, with the creatures as the heroes. Draw from Le Puzz's expressive catalogue and distinct typography; Nossara's forest palette and quiet framing; Exemplar's editorial serif contrast; Read-Only Memory's catalogue discipline; Bruno Simon's direct playable world; Interface In Game's explicit functional grouping. No reference assets or copy reused.

- Type: Georgia/Baskerville editorial display and headings; system sans-serif for compact readable UI; monospace only for catalogue indexes and keyboard keys. Locally available fonts avoid external requests and licensing dependencies.
- Color: parchment #f5f0e5, ivory #fffcf5, forest ink #203c32, muted moss #58694f, warm line #cfcbbb, ember #a34727, aqua #23616d, leaf #42613a. Existing species accent colors remain meaningful as imagery/indicators, not low-contrast text.
- Scale: 4, 8, 12, 16, 24, 32, 48, 64px. 12px supporting text minimum, 16px controls/body, 32–48px modal headings, fluid 64–116px title. 44px minimum primary controls and close buttons.
- Layout: title has a journal masthead, editorial introduction, three large specimen cards, numbered entry labels and a quiet controls footer. Desktop game HUD leaves the centre of the world open; mobile HUD becomes compact. Overlays use the same paper panels and forest header hierarchy. Scroll internally on small/short viewports; preserve browser zoom.
- Imagery: original transparent creature sprites, large and uncropped, with soft elemental specimen backplates and restrained shadows. No invented landscape artwork or stock photography.
- Motion: 150–250ms hover/focus and panel entrance; existing gameplay feedback retained. No unnecessary new infinite animations. Respect reduced motion, pause world updates during overlays, stop hidden canvas rendering, clear held controls on blur.

## Ranked features
1. Mobile D-pad and action button. Essential to make the primary journey playable on touch devices. No schema/API changes.
2. Modal keyboard focus, proper labels, escape handling, underlying input blocking and restoration. Essential usability/accessibility foundation.
3. Clear party HUD with numeric HP, collection count, Sprigs, crests, and next objective. All values derive from existing state.
4. Persistent field guide: controls, element triangle, capture process, existing locations, save/storage explanation, progression. No invented objectives.
5. Collection search, caught/seen/all filter, element filter, live result count, empty reset, evolution information for owned creatures. Preserve discovery fog.
6. Battle HP numbers and elemental advantage cues on moves. Existing mechanics unchanged.
7. Summon labels, inline validation, preserved drafts on retry, cancellable loading, preview/error states. Existing service unchanged; mocked verification only.
8. Fusion selection count, pressed states, clear consumed-parent warning, cancellable loading. Preserve existing fusion mechanics.
9. Rendering budget: avoid drawing obscured canvases; pause hidden tabs; conservative pixel ratio on phones. No rendering-library replacement.

Needs approval: accounts/cloud saves, multiplayer/trading, new regions/routes, CMS/database, paid assets/services/API keys. See needs-approval.md. No plan items requiring these are implemented.

## Template rollout
- Title: journal composition, large starter art, stats/element strengths, explicit start affordance, controls and save explanation. Keep original choose-partner action.
- Overworld: masthead/location, party rows, next objective, collection access, field guide and touch controls.
- NPC dialogue: paper dialogue, name hierarchy, visible continuation control, keyboard semantics.
- Home and lab: shared interior panel, readable descriptions, explicit primary/secondary controls.
- Shop: readable item descriptions, quantities, clear costs, feedback after purchase and unaffordable state.
- Dex: journal specimen grid, search/filters/result count/evolution facts/empty state.
- Battle: forest arena, paper nameplates and command area, numeric HP and advantage cues; readable bag/party/target pickers; trainer restrictions unchanged.
- Summon: paper form with field labels, inline errors, loading/cancel, preview keep/discard, retry.
- Fusion: same lab panel, empty state, pressed selection/status/cost warning; loading/cancel, preview and error.
- Recovery and victory: distinct full-screen journal chapters, clear continuation, correct keyboard focus.
- Field guide (new overlay, same route): concise controls, elemental strategy, locations, progression, local-save explanation.

## Verification
Two title screenshot/score/fix rounds. Every template at 1440×960 and 390×844, plus narrow/short checks. Actual Chrome via Playwright; rare states use documented fixtures. API responses mocked, never spend existing generation credits. Test core journeys separately with real clicks/keys. Run Node 22.23.1 build, typecheck, unit tests, available lint checks, Lighthouse, and browser accessibility checks. Record omissions honestly; no untested template marked done.
