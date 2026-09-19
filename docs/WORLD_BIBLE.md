# Critter Vale - World & Story Bible

Snapshot as of 2026-08-16. Written against commit c3d0f50 (main). Identity:
**"Pokemon but better"** - a combat-forward creature-collecting RPG with a cozy,
hand-crafted world and one signature twist no other game has (the Wellspring / Summon Lab).
This is the destination doc for tone, lore, and systems; gameplay truth lives in the code.

---

## 1. Logline

*In a valley where wild critters are born from a living spring of pure imagination, a new
tamer must raise a team, out-think rival tamers, and discover why the Wellspring has begun
dreaming up critters no one has ever seen.*

## 2. The pitch (why "better than Pokemon")

Pokemon's loop is beloved but its bones are 1996. Critter Vale keeps the loop and fixes the
friction, and adds one thing Pokemon structurally cannot:

- **The Wellspring (Summon Lab) is canon.** Every other creature game ships a fixed roster.
  Here, the world's lore *is* that new critters are dreamed into being - so a player can walk
  into the Lab, describe a critter, and it is genuinely created (AI-generated) and joins the
  living world. Infinite roster, diegetically justified. This is the hook.
- **No dead-loss matchups.** Every critter has a neutral move, so no encounter is unwinnable
  (already true in code). Fairer than the type-lock frustration of the genre.
- **Fast, juicy battles.** Slide-ins, hit flash, damage numbers, screen shake, holo Dex cards.
  Snappy, no bloat.
- **A hand-made valley, not a sprawl.** One rich region (Sprout Hollow + routes) that is
  dense and warm, not 8 hours of filler towns.

## 3. Setting

**The Vale.** A green, sheltered valley ringed by misty peaks. At its heart, the town of
**Sprout Hollow** - cobbled paths, cozy lantern-lit cottages, a pond, tall grass at the
edges where wild critters roam. Beyond town, **routes** climb toward the peaks and the
**Wellspring** at the valley's source.

**Tone:** warm, adventurous, a little magical. Golden-hour light (the sky is literally a
dynamic Sky shader). HD-2D - 3D world, 2D billboard critters. Cozy but with real stakes.

## 4. Cosmology - the three elements

Critters are woven from three primal strands of the Vale's life-force. They cycle:

> **Ember** warms **Leaf** into growth · **Leaf** drinks **Aqua** · **Aqua** quenches **Ember**.

(In battle: Ember > Leaf > Aqua > Ember, 2x / 0.5x. "Normal" is un-elemental - the plain
moves every critter knows.) The cycle isn't just combat math; it's the valley's seasons,
its weather, its balance. When one strand runs wild, the Vale suffers.

## 5. Lore - the Wellspring

At the valley's source is the **Wellspring**: a spring that runs not with water but with raw
*imagining*. Wild critters are the Vale dreaming out loud - shapes the Wellspring throws off
as it flows. **Prof. Hollis** built the **Summon Lab** to study this: a device that lets a
tamer *describe* a critter and coax the Wellspring to dream it into being, right there.

Diegetic rules (so the AI feature has in-world logic):
- Summoned critters are real, wild-born critters - just newly dreamed, so they're always a
  little unique.
- They start young (~Lv 7), one element, and grow like any other.
- The Lab costs the tamer a small offering to run (ties to the economy: currency + a soft cap).

**The hook of the story:** lately the Wellspring has been dreaming on its own - critters
appearing that no one described, some restless. Something is stirring at the source.

## 6. The journey (progression arc)

Classic-but-tight tamer arc, ~a few hours:

1. **Arrival.** New tamer reaches Sprout Hollow, picks a starter from Prof. Hollis. (Done.)
2. **First steps.** Learn to catch, battle, evolve. Beat the first route tamer. (Partly done.)
3. **The Wardens.** Four **Vale Wardens** guard the routes to the peaks - this game's "gyms."
   Each themed around an element (Ember Warden, Aqua Warden, Leaf Warden) + a Warden of the
   neutral/wild. Beat them to earn **Vale Crests** and passage upward.
4. **The Rival.** A recurring rival tamer (childhood friend or Hollis's other student) who
   raises a team alongside you and shows up at milestones. Warm rivalry, not villainy.
5. **The Wellspring stirs.** Story beat: strange summons, the source restless. Player climbs
   to the Wellspring.
6. **Champion.** A final tamer gauntlet + a resolution at the Wellspring. Victory screen,
   Champion status, post-game (Dex completion, tougher rematches, endless Summoning).

## 7. Cast

- **Prof. Hollis** - kind valley scholar, built the Summon Lab, gives the starter, your guide.
  (Exists as an NPC.)
- **The Rival** - *(new)* upbeat, competitive, mirrors your team, appears at milestones.
- **The Four Vale Wardens** - *(new)* route-guarding "gym" tamers, each an element theme +
  a signature critter. Personality each (grizzled, playful, serene, wild).
- **Villagers** - Maple, Finn, Ranger Bex (exist) + shopkeeper at the **Trading Post**,
  the **Home** caretaker, route trainers. Small stories, hints, side quests.
- **The Wellspring** - not a character, but the mystery that drives Act 2.

## 8. Systems vision (what makes the loop deep)

Reframed Tier list, in lore terms:

**Tier 1 - the tamer's loop (build next):**
- **Sprigs (currency).** Earn from winning battles + selling. The Vale's soft currency.
- **Trading Post (real shop).** Buy **Dew Potions** (heal), **Vale Balls / Gilded Balls**
  (better catch odds), maybe a **Revive**. Shell already exists.
- **Inventory in battle.** Use potions/balls from the battle menu (balls replace the current
  always-available catch).
- **Wardens + Champion arc.** 3-4 Warden battles gating routes + a Champion gauntlet +
  victory screen. Turns the demo into a game with a *point*.

**Tier 2 - shine & reach:**
- **Critter cards.** Export any critter (esp. summoned) as a holo trading-card PNG. Viral.
- **Mobile/touch controls.** On-screen d-pad so it plays (and gets shared) on phones.

**Tier 3 - depth:**
- Status/utility moves (burn, heal, buff) + a 3rd move slot.
- A second area/route up toward the Wellspring.
- Day/night + seasonal spawns; separate battle music; bundle code-split.

**Tier 4 - quality gate:**
- Visual-regression + gameplay-capture harness (locks the 3D so refactors don't break it).

## 9. Economy of the Summon Lab (tying AI to the loop)

To keep the signature feature special (and cost-safe): summoning costs **Sprigs** (earned in
game) and/or a per-day soft cap. Diegetically, coaxing the Wellspring takes an offering. This
makes summons feel earned, paces the real API cost, and folds the hook into the core loop.

## 10. Art & audio direction

- **Critters:** chibi, expressive, painterly HD-2D sprites on a clean field (matches the
  Magica pipeline already used). Consistent style prompt lives in the summon function + gen scripts.
- **World:** stylized-3D, rounded shapes, golden light, soft shadows, bloom on lanterns.
- **Audio:** cozy town theme (exists) + a distinct battle theme (todo) + a Wellspring theme
  for the finale. SFX for hits/catch/level (exist).

---

*Living doc for a solo build. When lore and code disagree, code wins and this gets updated.
Re-stamp the commit hash on major revisions.*
