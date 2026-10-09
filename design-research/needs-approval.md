# Needs approval — not performed

- Cloud saves/accounts, trading, multiplayer, leaderboard, or cross-device sync: require backend infrastructure and database/schema design.
- New regions, routes, public share URLs, CMS changes, or replacement/removal of existing content/features: outside this non-destructive upgrade.
- Real summon/fusion generation during verification: existing generation can incur cost; use isolated mocked responses instead. Fusion also consumes parents and Sprigs; never execute against a real player save.
- New paid assets, font subscriptions, services, API keys, analytics, or third-party trackers: not added.
- Deleting/replacing existing files or resetting existing progress: not performed. Existing New Game and fusion behavior are retained with clear warnings.

- Public crawl policy / new robots.txt or sitemap endpoints: Lighthouse on the local preview receives the SPA HTML fallback for robots.txt. Confirm intended indexing policy and production hosting behavior before adding SEO endpoints; no URL or crawl-policy changes made.

- Branch deletion: remote fix/summon-cost-abuse is associated with merged PR #14, but its original commit is not an ancestor because the change was squash-merged. Confirm deletion separately; it was retained. Local feat/spectorjs-debugger and its uncommitted debugger work are retained. main and active design/upgrade are retained. Renovate's open pnpm branch/PR #20 and dependency dashboard #6 are active automation work, not stale cleanup targets.
- Deleting verification/backup directories: /Volumes/LizsDisk/_wt/critter-vale-upgrade-integration (clean detached integration checkout), /Volumes/LizsDisk/_wt/critter-vale-node-modules-before-integration (preserved incompatible dependency install), and /Volumes/LizsDisk/_wt/critter-vale-local-work-backup.patch (original tracked debugger edits). Retained under the original no-file-deletion rule; the active checkout is synchronized and has a fresh working install.


- Gameplay rebalance: replacing the XP curve, wild-level cap, trial restrictions or enemy-party levels changes the difficulty of existing saves. The ordinary-progression audit supports a deliberate pacing pass, but no numerical rebalance was applied here.
- Battle-system redesign: expanding move sets, status/speed/turn-order rules, enemy AI and generated-species mechanics changes core combat/save contracts. Define and validate these changes before implementation.
- Reserve storage or releasing/replacing partners when the six-member party is full: reserve storage requires save-schema work; releasing/removing partners is destructive. Existing party membership remains intact.
- New quests, regions, rematches or post-Champion reward economy: require game-design decisions and potentially saved progression changes. Existing one-time challenges/content were retained.
