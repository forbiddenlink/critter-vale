# Critter Vale

A browser creature-collecting RPG. You raise a team, battle rival tamers, and use the Wellspring / Summon Lab to generate new critters with AI image generation. It is for casual game players who like creature-collecting games.

Play it: https://critter-vale.vercel.app

## Features

- Explore the overworld, talk to characters and enter buildings. Progress (team, caught critters, player position) is saved in the browser with localStorage (`src/game/save.ts`).
- Turn-based battles against rival tamers, with Wardens and Crests.
- A Critter-Dex with detail cards, a shop, a Fusion Lab and a Summon Lab (`src/ui/`).
- Summon Lab generates new critters through a Vercel serverless function (`api/summon.js`) that proxies the Magica image API. It validates input, throttles by IP and enforces a daily cap.
- Keyboard and touch controls.

See [docs/WORLD_BIBLE.md](./docs/WORLD_BIBLE.md) for tone, lore and story systems. It is a living design doc, not a spec; gameplay truth lives in the code.

## Controls

| Input | Action |
|---|---|
| WASD or arrow keys | Move |
| E or Space | Talk or enter a building |
| C | Open the Critter-Dex |
| H | Open the field guide |
| Esc | Close most panels |
| Touch | On-screen direction buttons and a nearby-action prompt |

## Stack

- Vanilla TypeScript (no framework), Three.js, Vite
- Vitest and `fake-indexeddb` for tests
- Upstash Redis (`@upstash/ratelimit`, `@upstash/redis`) for the shared Summon Lab spend guard
- A Vercel serverless function in `api/`

## Getting started

Prerequisites: Node and pnpm (pinned by `packageManager` in `package.json`).

```bash
pnpm install
pnpm run dev
```

Without `MAGICA_KEY`, the rest of the game runs and only the Summon Lab is unavailable.

### Scripts

```bash
pnpm run dev       # Vite dev server
pnpm run build     # tsc && vite build
pnpm run preview   # preview a production build
pnpm test          # vitest run
```

### Environment variables

There is no `.env.example`. These are read in `api/` only and are never exposed to the client:

- `MAGICA_KEY` (required for the Summon Lab)
- `SUMMON_DAILY_CAP` (optional; defaults to 50 generations per day)
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, or `KV_REST_API_URL` and `KV_REST_API_TOKEN` (optional; when a pair is set, the throttle and daily cap are shared across instances through Redis, otherwise they are per warm instance, see `api/_guard.js`)

## Project structure

```
src/
├── game/      # battle, critters, items, save, custom species
├── ui/        # dex, Fusion Lab, Summon Lab, field guide, touch controls
├── world/     # overworld and sprites
└── main.ts    # entry
api/           # summon.js and _guard.js (Vercel serverless)
public/        # icons, og image, robots and sitemap
scripts/       # audio generation
docs/          # WORLD_BIBLE.md, audits
design-research/  # design review notes
```

See [CLAUDE.md](./CLAUDE.md) for the full layout and gotchas.

## Deploy

Deploys as a Vercel project (`vercel.json` sets security headers; `api/` is served as serverless functions). Set `MAGICA_KEY` in the project's environment variables before deploying.

## License

MIT. See [LICENSE](./LICENSE).
