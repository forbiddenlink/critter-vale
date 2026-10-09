# Title screen review

Rubric order: point of view, typography, layout/rhythm, color/imagery, motion, audience fit, memorability, craft. Scores are self-assessment against this project's requirements, not an external award claim.

| Round | Scores / 5 | Evidence | Findings and fixes |
|---|---|---|---|
| 1 | 4,4,4,4,4,4,4,3 | screenshots/rounds/title-1-desktop.png and title-1-mobile.png | Utilities cover masthead on phone/desktop. Initial first-card focus visually biases choice. Hide gameplay utilities during title, focus title container, add mobile scroll guidance, stop rendering hidden world. |
| 2 | 4,4,4,4,4,4,4,4 | screenshots/rounds/title-2-desktop.png and title-2-mobile.png | Strong hierarchy and consistent original art. Mobile title scrolls internally without horizontal overflow. Refine scroll guidance spacing by 10px after capture; verify final in rollout. |

Both rounds captured in real Chrome, 1440×960 and 390×844. Title content is scrollable on short viewports; screenshot shows viewport, not an artificial expanded mobile layout. No webfonts or additional large image requests. Original starter selection preserved, with a double-activation guard.

Foundation checks: TypeScript noEmit passed; 76/76 unit tests across 7 files passed. Full browser accessibility/performance verification is Phase 6.
