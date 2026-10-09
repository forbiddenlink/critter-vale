# Template rollout review

Chrome captures: 1440×960 and 390×844. Original game components are used; uncommon states use isolated fixtures through response instrumentation. Generated images use mocked API responses and existing local artwork. No live credits or real saves are used.

Rubric order: point of view / typography / layout and rhythm / color and imagery / motion / audience fit / memorability / craft. Scores are project self-assessments, not independent ratings. A score of 4 means the interface meets the chosen direction and works at the checked sizes; it does not claim a new production-grade game backend.

| Template | Final scores / 5 | Checks and refinements |
|---|---|---|
| Title | 4/4/4/4/4/4/4/4 | Two prior rounds in title-review.md; final accessible naming corrected, original art optimized without replacing PNG sources |
| Overworld/HUD | 4/4/4/4/4/4/4/4 | Party HP, next objective, Sprigs/crests, phone controls; movement blocked behind overlays |
| Dialogue | 4/4/4/4/4/4/4/4 | Paper panel, clear speaker and continuation; actual keyboard advance |
| Home | 4/4/4/4/4/4/4/4 | Shared interior panel; rest and save preserved |
| Lab interior | 4/4/4/4/4/4/4/4 | Explicit summon/fusion actions and close/leave paths |
| Trading Post | 4/4/4/4/4/4/4/4 | Descriptions, price, owned counts, affordability, purchase feedback |
| Dex | 4/4/4/4/4/4/4/4 | Search, state/element filters, empty clear/reset; typing x no longer closes the panel |
| Wild/trainer battle | 4/4/4/4/4/4/4/4 | Numeric HP and matchups; corrected inherited orange move style and hidden controls overriding trial restrictions |
| Battle menus | 4/4/4/4/4/4/4/4 | Bag, switch, revive target, cancel and result states; shared readable menu material |
| Summon | 4/4/4/4/4/4/4/4 | Form/inline validation/loading/server error/retry/preview/full-party messaging; drafts survive retry |
| Fusion | 4/4/4/4/4/4/4/4 | Empty/picker/selection/loading/error/retry/preview; cost/consumed-parent warning retained |
| Recovery | 4/4/4/4/4/4/4/4 | Clear continue action and focused recovery panel |
| Victory | 4/4/4/4/4/4/4/4 | Distinct forest chapter, original achievement and continue behavior retained |
| Field guide (new) | 4/4/4/4/4/4/4/4 | Controls, elements, locations, progression and save limitations; keyboard close and focus restoration |

The original 3D landscape, species art, progression and rules remain. No routes, services, database or save schema changed. New assets are compressed title-only copies of the existing three starters.

Phase 6 must confirm automated accessibility, performance, production build and end-to-end journey results before this review counts as final verification. See browser-verification.json and verification.md when those checks finish.
