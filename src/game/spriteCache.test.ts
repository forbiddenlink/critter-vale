import { describe, it, expect, vi } from "vitest";
import { spriteKey, isRemoteUrl, pickSpriteSource, loadOrCache } from "./spriteCache";
import type { SpriteStore } from "./spriteCache";

const png = () => new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" });

function memStore(seed: Record<string, Blob> = {}): SpriteStore & { data: Map<string, Blob> } {
  const data = new Map(Object.entries(seed));
  return {
    data,
    get: async (k) => data.get(k) ?? null,
    put: async (k, b) => void data.set(k, b),
  };
}

const okFetch = () => vi.fn(async () => new Response(png(), { status: 200 })) as unknown as typeof fetch;

describe("spriteKey / isRemoteUrl", () => {
  it("derives a stable key per species id", () => {
    expect(spriteKey("custom-foo-ab12")).toBe("sprite:custom-foo-ab12");
    expect(spriteKey("a")).not.toBe(spriteKey("b"));
  });
  it("only treats http(s) as remote", () => {
    expect(isRemoteUrl("https://cdn.example/x.png")).toBe(true);
    expect(isRemoteUrl("http://cdn.example/x.png")).toBe(true);
    expect(isRemoteUrl("blob:abc")).toBe(false);
    expect(isRemoteUrl("/sprites/a.png")).toBe(false);
  });
});

describe("pickSpriteSource fallback order", () => {
  it("prefers cached bytes, then the remote URL, then the bundled PNG", () => {
    expect(pickSpriteSource("x", "blob:1", "https://r/x.png")).toBe("blob:1");
    expect(pickSpriteSource("x", undefined, "https://r/x.png")).toBe("https://r/x.png");
    expect(pickSpriteSource("x")).toBe("/sprites/x.png");
  });
});

describe("loadOrCache", () => {
  it("returns stored bytes without touching the network", async () => {
    const store = memStore({ [spriteKey("a")]: png() });
    const fetchImpl = okFetch();
    expect(await loadOrCache("a", "https://r/a.png", { store, fetchImpl })).not.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fetches a missing sprite and stores it", async () => {
    const store = memStore();
    const fetchImpl = okFetch();
    const blob = await loadOrCache("a", "https://r/a.png", { store, fetchImpl });
    expect(blob?.type).toBe("image/png");
    expect(store.data.has(spriteKey("a"))).toBe(true);
  });

  it("returns null (caller keeps the remote URL) on CORS/network failure", async () => {
    const store = memStore();
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    expect(await loadOrCache("a", "https://r/a.png", { store, fetchImpl })).toBeNull();
    expect(store.data.size).toBe(0);
  });

  it("returns null on a 404 or a non-image response and stores nothing", async () => {
    const store = memStore();
    const gone = vi.fn(async () => new Response("no", { status: 404 })) as unknown as typeof fetch;
    const html = vi.fn(async () => new Response(new Blob(["<html>"], { type: "text/html" }))) as unknown as typeof fetch;
    expect(await loadOrCache("a", "https://r/a.png", { store, fetchImpl: gone })).toBeNull();
    expect(await loadOrCache("a", "https://r/a.png", { store, fetchImpl: html })).toBeNull();
    expect(store.data.size).toBe(0);
  });

  it("skips the network for non-remote URLs", async () => {
    const fetchImpl = okFetch();
    expect(await loadOrCache("a", "/sprites/a.png", { store: memStore(), fetchImpl })).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("still returns the bytes when storage fails or is unreadable", async () => {
    const broken: SpriteStore = {
      get: async () => {
        throw new Error("denied");
      },
      put: async () => {
        throw new Error("quota");
      },
    };
    expect(await loadOrCache("a", "https://r/a.png", { store: broken, fetchImpl: okFetch() })).not.toBeNull();
  });
});
