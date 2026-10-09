# Post-report touch regression review

The user requested continuation after the seven-phase report. Work stayed on `design/upgrade`; no merge, deployment, paid generation, route or schema changes.

## Findings and fix

A six-member party exposed two layout problems not covered by the original starter-only overworld scans:

- Landscape at 844×390: the tall HUD covered the movement pad.
- Landscape at 667×375: the full-width HUD covered game tools, movement and the nearby-person prompt.
- Portrait at 390×844 and 320×568: game tools covered part of the nearby-person prompt.

The failing `followup.cjs before` run reproduced these overlaps with real Chrome rectangles and screenshots. Root cause: the HUD, tools and prompt were independently fixed in place; the width breakpoint did not reserve room for short landscape or nearby actions. Targeted responsive rules now give the HUD a bounded scroll area, place landscape tools in the upper right, and keep contextual prompts apart from both groups. No party information was removed.

The full-party accessibility scan also caught `scrollable-region-focusable` on the party list. The list is now a named, keyboard-focusable region. Arrow keys scroll it without reaching the world's movement handler. Tests prove scroll position changes while player position stays unchanged.

## Evidence

| Emulated touch viewport | Before | After | All six party members |
|---|---|---|---|
| 390×844 portrait | [View](screenshots/after/followup-before-touch-portrait.png) | [View](screenshots/after/followup-after-touch-portrait.png) | [Scroll end](screenshots/after/followup-after-touch-portrait-party-bottom.png) |
| 844×390 landscape | [View](screenshots/after/followup-before-touch-landscape.png) | [View](screenshots/after/followup-after-touch-landscape.png) | [Scroll end](screenshots/after/followup-after-touch-landscape-party-bottom.png) |
| 667×375 landscape | [View](screenshots/after/followup-before-touch-landscape-small.png) | [View](screenshots/after/followup-after-touch-landscape-small.png) | [Scroll end](screenshots/after/followup-after-touch-landscape-small-party-bottom.png) |
| 320×568 portrait | [View](screenshots/after/followup-before-touch-small.png) | [View](screenshots/after/followup-after-touch-small.png) | [Scroll end](screenshots/after/followup-after-touch-small-party-bottom.png) |

Final checks (`followup-after.json`): no HUD/control/prompt collisions; no WCAG A/AA violations; no browser errors. Actual emulated touch events hold and release movement correctly. Guide focus wraps in both directions. Keyboard party scrolling works without moving the character, and the last party member remains reachable.

Self-assessment for the newly checked touch layouts: craft was 3/5 before the fixes, now 4/5; the other seven rubric categories remain 4/5. These remain self-scores, not independent ratings.

Typecheck, production build and all 76 tests passed again after the fix. Vite's existing large-bundle advisory remains. Saved-world Lighthouse was rerun; current results are recorded in verification.md and the saved-world HTML/JSON reports.

## Coverage limits

Chrome touch emulation is additional browser evidence, not a physical phone test. Firefox and WebKit executable paths were checked and are not installed locally; no browser downloads or system settings changes were made. Physical iOS/Android, Safari/Firefox, paid provider behavior and fully nonvisual 3D play remain untested.
