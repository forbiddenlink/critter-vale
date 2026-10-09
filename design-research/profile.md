# Critter Vale — current site profile

Captured October 9, 2026. Baseline: existing working tree on `feat/spectorjs-debugger`, preserved on new `design/upgrade` branch.

## Purpose and audience
Critter Vale is a browser creature-collecting RPG where players explore Sprout Hollow, build a party, battle tamers, and summon or fuse original creatures.

Audience inferred from the playable product: people who enjoy approachable monster-taming games and original creature art. Primary action: choose a starter and begin exploring; returning players automatically resume a local save. No claims about commercial positioning, age rating, launch status, or player count are supported.

## Routes and templates
Only `/` exists; no router, CMS, or database. Screens are DOM overlays above a Three.js canvas. `?spector` is an existing development debugger flag, not a public route.

| Template | Implementation | Current journey |
|---|---|---|
| Title / starter selection | src/main.ts showTitle | Pick Emberpup, Tadmite, or Leaflet; starts at level 6 |
| Overworld / HUD | src/main.ts drawHud; src/world/overworld.ts | Move with WASD/arrows, E to talk/enter; grass triggers battles |
| NPC dialogue | src/main.ts world.onInteract | Advance dialogue; eligible trainers lead into battles |
| Home interior | src/main.ts showInterior | Rest, heal all party members, save |
| Research lab interior | src/main.ts showInterior | Open summon or fusion |
| Trading Post | src/main.ts openShop | Purchase four item types with Sprigs |
| Collection / Critter-Dex | src/ui/dex.ts | Caught, seen silhouettes, unknown creatures; 15 built-in species |
| Wild / trainer battle | src/ui/battleUI.ts | Two moves, bag, switch, wild-only run/catch |
| Bag / party pickers | src/ui/battleUI.ts | Choose items/targets or active party member |
| Summon form/loading/error/preview | src/ui/summonLab.ts | Choose element, describe, generate, keep/discard |
| Fusion picker/empty/loading/error/preview | src/ui/fusionLab.ts | Two parents and 80 Sprigs; parents consumed on keep |
| Whiteout recovery | src/main.ts showFaintScreen | All fainted; continue heals and respawns |
| Champion victory | src/main.ts showVictory | Three Warden crests unlock champion; continue exploration |

## Shared design
src/style.css: 954 lines. System UI / Segoe UI sans-serif only. Neon orange `#ff7a45`, aqua `#39c6ff`, leaf `#6be36b`, translucent navy panels, white collection cards, blue title and battle gradients. Inconsistent panel borders (1–3px), corner radii (8–18px), and button treatments. Shared card shimmer, toast, prompt, interior panel, modal panels, stat/name plates, HP bars, confetti and encounter flash. Reduced-motion CSS exists but toast disappearance relies on animation and lacks a static alternative.

## Content and systems
Species, movesets, elemental multipliers, per-critter quirks, evolutions, items, NPC stories and trials are TypeScript data. Assets: 16 PNG sprites and local audio. State uses `critter-vale-save-v1` localStorage with optional backward-compatible fields. Serverless `/api/summon` proxies an existing generation service; do not read secrets or spend money during verification.

Journeys: starter → exploration → encounters → catch/train/evolve → crests → champion; home → rest/save; shop → buy → bag → battle; lab → summon/fuse → custom species registration → saved party/dex. Save writes on events, periodically, and on unload. New game already asks confirmation before clearing progress.

## Baseline evidence
Real Chrome screenshots in `screenshots/before/`, desktop 1440×960 and mobile 390×844. Rare overlays use actual component functions with isolated fixture state injected through Playwright response instrumentation; no production test entry point or fabricated screenshot HTML. Main journey tests remain separate from fixture captures.

## Problems and unknowns
No mobile movement controls. Title cards wrap vertically beyond the phone viewport. HUD is a dense text block and overlays can leave world movement active. No collection search/filter, discoverable guide, live numeric battle HP, or clear next objective. Modal keyboard focus is unmanaged. Summon input has only placeholders and invalid submissions replace the form. Three.js canvas renders continuously even when fully hidden.

Unknown: intended device floor, hosting budget, production API availability, future roadmap, desired age rating, supported assistive technologies. Proceed with no new services, routes, generation spend, schema changes, or content removal.
