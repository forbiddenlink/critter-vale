import "fake-indexeddb/auto";
import { describe, it, expect, vi } from "vitest";
import { cacheCustomSprite, registerSpriteUrl, spriteUrl, spriteEvents, pruneCustomSprites } from "./customSpecies";
import type { SpriteReadyDetail } from "./customSpecies";
import { idbStore, spriteKey } from "./spriteCache";

const png = () => new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });

describe("late IndexedDB hydration with an expired CDN URL", () => {
  it("announces the cached sprite so already-rendered images can switch off the dead URL", async () => {
    const id = "custom-late-1";
    const dead = "https://cdn.example/expired.png";
    registerSpriteUrl(id, dead);
    expect(spriteUrl(id)).toBe(dead); // what a HUD rendered after the 1.5s boot timeout would show

    // IDB holds the bytes but answers late; the remote URL is 404.
    await idbStore.put(spriteKey(id), png());
    const realGet = idbStore.get;
    idbStore.get = async (k) => {
      await new Promise((r) => setTimeout(r, 30));
      return realGet(k);
    };
    vi.stubGlobal("fetch", async () => new Response("gone", { status: 404 }));
    const seen: SpriteReadyDetail[] = [];
    const on = (e: Event) => seen.push((e as CustomEvent<SpriteReadyDetail>).detail);
    spriteEvents.addEventListener("sprite-ready", on);

    await cacheCustomSprite({ id, imageUrl: dead });

    expect(seen).toHaveLength(1);
    expect(seen[0].previous).toBe(dead);
    expect(seen[0].next).toMatch(/^blob:/);
    expect(spriteUrl(id)).toBe(seen[0].next);

    spriteEvents.removeEventListener("sprite-ready", on);
    idbStore.get = realGet;
    vi.unstubAllGlobals();
  });

  it("prunes cached sprites and object URLs not referenced by the save", async () => {
    const id = "custom-orphan-1";
    await idbStore.put(spriteKey(id), png());
    registerSpriteUrl(id, "https://cdn.example/o.png");
    await cacheCustomSprite({ id, imageUrl: "https://cdn.example/o.png" });
    expect(spriteUrl(id)).toMatch(/^blob:/);
    await pruneCustomSprites([]);
    expect(await idbStore.get(spriteKey(id))).toBeNull();
    expect(spriteUrl(id)).toBe("https://cdn.example/o.png");
  });
});
