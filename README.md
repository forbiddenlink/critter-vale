# Critter Vale

A browser creature-collecting RPG - raise a team, battle rival tamers, and use the
Wellspring / Summon Lab to generate new critters through AI image generation. See
[docs/WORLD_BIBLE.md](./docs/WORLD_BIBLE.md) for tone, lore, and the story systems (a living
design doc, not a spec - gameplay truth lives in the code).

## Quickstart

```bash
pnpm install
pnpm run dev
```

The Summon Lab calls a Vercel serverless function (`api/summon.js`) that proxies the Magica
API and needs `MAGICA_KEY` set server-side to work locally; without it the rest of the game
still runs.

## Scripts

```bash
pnpm run dev       # Vite dev server
pnpm run build     # tsc && vite build
pnpm run preview   # preview a production build
pnpm test          # vitest run
```

## Stack

Vanilla TypeScript (no framework) with Three.js for 3D rendering, built on Vite. pnpm for
package management, Vitest for unit tests. See [CLAUDE.md](./CLAUDE.md) for the full layout
and gotchas.

## Env vars

- `MAGICA_KEY` - server-side only, read in `api/summon.js`, never exposed to the client.

## Deploy

Deploys as a Vercel project (`api/` is a Vercel serverless function). Set `MAGICA_KEY` in the
project's environment variables before deploying.
