# Gameplay audit — in progress

Baseline: integrated design branch 80d5f1c (game code also matches isolated checkout 1a2c2ed). This is a game-quality assessment, not another visual score. Browser: real Chrome, isolated local saves. No paid generation, player data, schema changes or main/production changes.

## Evidence and limits

- gameplay-run.cjs drives actual keyboard/click movement and battles with normal RNG, stats, XP, currency and timers. Read-only instrumentation observes position and party/save state; combat reads visible DOM values. Navigation knows the map coordinates, so this cannot measure an unfamiliar human player's discoverability. It chooses the elemental move except when resisted, builds an elemental team, heals and restocks balls.
- Early harness iterations needed correction: trainer retries were repeated automatically before changing strategy; capture/battle transitions raced locators; returning to an already occupied healing zone did not cross its entry boundary. These are harness limits, not additional game bugs. The run resumed exact previously recorded natural saves; it is not an uninterrupted human session. Early repeated retries and healing visits make raw elapsed totals unsuitable as a clean time-to-completion metric. Final outcome remains pending.
- gameplay-balance.json derives XP/move/content facts from the live source. It is a calculation, not a claim that a player must reach Champion's level. Capture/stat fixtures and deterministic RNG in gameplay-regressions.cjs are separate from ordinary-progression observations.
- Figma and Canva connector tools are available. No standalone Magica or Antigravity tools were exposed. The existing game has a Magica-backed API; it was not called. These tools do not establish whether the core progression is fun.
- Qlty 0.622.0 is installed but metrics require a project configuration. No qlty configuration or broad formatting changes were introduced for this audit. TypeScript/Vitest/browser checks remain available.

## Reproduced findings and decisions

| Priority | Finding | Evidence | Decision |
|---|---|---|---|
| High | Capturing gives no XP, defeating gives XP | Actual catch leaves active XP unchanged; failing capture-xp browser regression; throwBall never awards XP | Fix reward omission with existing XP rules, including living bench share and evolution |
| High | No way to choose a healthy lead before a no-switch trial | Battle picks first healthy party member; failing choose-lead regression | Add reversible lead selection to existing party HUD; reuse existing team order/save schema |
| Medium | Escape dismissing trainer dialogue starts combat | Failing escape-trainer regression; close always calls afterDialog | Separate cancellation from completing dialogue; keep normal battle continuation |
| Medium | Potion says it restored 40 HP when only 5 was missing | Failing accurate-healing browser regression | Report actual restored HP |
| High | Evolution/progression pacing needs a deliberate balance pass | 3,608 XP from Lv6 to Lv12; estimated 53 wins at uniform capped Lv8–11 wild band (optimistic early, no trainer XP or XP quirk). Wild band stops scaling above party Lv10. | Recommend a bounded shorter progression curve; defer numerical rebalance until end-to-end evidence and approval of gameplay changes |
| High | Move choices mostly collapse to the element triangle | 45 built-in species/target-element comparisons at Lv12: elemental move wins 30; Normal wins the 15 resisted matchups. Enemy always uses slot 0. No status/PP/speed decision in current move model. | Future battle-system work; no new schema or untested mechanics in this patch |
| High | Generated critters lack progression depth | Summons have no evolution, start at Lv7, and share elemental + Normal move pattern; fusion keeps parent A's element and generic moves | Future generation/game-design work; asset volume alone does not solve this |
| Medium | Story, exploration and replay content need deeper assessment | Source has one map, eight NPCs, five one-time trainer challenges, three buildings and 15 built-in species; beaten trainers do not rematch | Record content roadmap after playthrough; new content/removal requires original approval rule |

## Safe implementation direction

Keep the field-journal UI. Make the existing HUD a useful preparation tool: show XP progress and each partner's element/quirk, and offer a clear lead action on healthy benched partners. Preserve current party membership, all HP/XP/traits, save schema, routes and existing content. Hide/disable actions under overlays and for fainted partners. Use the same responsive HUD boundaries and verify full-party touch layouts again.

Fix capture rewards, accidental trainer engagement and inaccurate healing messages. Add a cap regression because the save validator accepts levels through 100 while gainXp currently has no cap. Do not rebalance prices, XP curve, wild bands, enemies or paid generation costs during the ordinary-play baseline.

## Next checkpoints

1. Finish baseline progression or record the exact blocker; do not claim Champion coverage from a high-level fixture.
2. Run failing tests, implement safe fixes, then repeat browser state/touch/journey checks and build/unit suite.
3. Update this document with observed end-to-end outcome, ranked roadmap, screenshots and remaining limits. Keep PR draft; never merge.
