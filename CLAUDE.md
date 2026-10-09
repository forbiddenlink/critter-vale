# CLAUDE.md

Guidance for Claude Code (and other AI agents via the AGENTS.md symlink) working in this repo.

## What this is

Critter Vale - a browser creature-collecting RPG ("Pokemon but better"): raise a team,
battle rival tamers, and use the Wellspring / Summon Lab to generate new critters via AI
image generation. See `docs/WORLD_BIBLE.md` for tone, lore, and story systems (gameplay
truth lives in the code, per that doc's own framing - treat it as a snapshot, not current
spec).

## Stack

- Vanilla TypeScript (no framework) + Three.js for 3D rendering, built with Vite
- Package manager: pnpm (`pnpm-lock.yaml`)
- Vitest for unit tests
- `api/summon.js` is a Vercel serverless function proxying AI image generation (Magica API)
  for the Summon Lab - keeps the API key server-side, throttles by IP, validates inputs

## Commands

```bash
pnpm install       # install dependencies
pnpm run dev        # Vite dev server
pnpm run build       # tsc && vite build
pnpm run preview     # preview a production build
pnpm test          # vitest run
```

## Layout

- `src/main.ts` - entry point; sets up the Three.js scene (bloom post-processing pipeline),
  wires the overworld, battle UI, dex, summon/fusion labs, and save system together
- `src/world/` - `overworld.ts` (scene/NPCs, `Overworld` class, `BLOOM_LAYER`), `sprites.ts`
- `src/game/` - core game logic: `battle.ts` (`Critter`, `makeCritter`, `MOVESETS`),
  `critters.ts` (`SPECIES`, `STARTERS`, `Element` type), `customSpecies.ts` (AI-summoned
  critters), `items.ts` (`ITEMS`, `SHOP_ORDER`, bag/reward logic), `traits.ts`,
  `save.ts` (`loadSave`/`writeSave`/`clearSave`). Most files have a co-located `.test.ts`.
- `src/ui/` - `battleUI.ts`, `dex.ts`, `summonLab.ts`, `fusionLab.ts`, `summonApi.ts`
  (client side of the `api/summon.js` polling flow)
- `src/audio.ts` - sound effects and music
- `api/summon.js` - Vercel serverless function; see Stack above
- `public/sprites/`, `public/audio/` - static game assets
- `docs/WORLD_BIBLE.md` - lore/story/system design doc

## Env vars

`MAGICA_KEY` - server-side only, read in `api/summon.js`, never exposed to the client.
`SUMMON_DAILY_CAP` - optional, paid Magica runs per instance per day (default 50).

## Gotchas

- `api/summon.js` spend guards live in `api/_guard.js`: 6 paid POSTs per IP per minute, a
  daily budget of paid runs (`SUMMON_DAILY_CAP`, default 50), and a same-origin check. All of
  it is per warm instance and resets on cold start; a shared store (e.g. Upstash) is the real
  limiter if traffic grows.
- Background removal (`op:"bg"`) takes a gen `runId`, not an image URL: the server reads that
  run's output itself, once per run, so the endpoint cannot clean arbitrary images.
- `runId` values from the Magica API are validated against a strict allowlist
  (`/^[a-zA-Z0-9-]{16,64}$/`) before being used in a follow-up request, to stop a crafted
  value from reaching other Magica endpoints through the server's key.
