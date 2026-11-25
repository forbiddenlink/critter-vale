import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function call(handler, { method = "POST", body, query = {}, headers = {} }) {
  const res = { code: 0, json: null };
  res.status = (c) => ((res.code = c), res);
  res.json = (j) => ((res.body = j), res);
  return handler({ method, body, query, headers: { host: "game.test", ...headers } }, res).then(() => res);
}

describe("api/summon handler", () => {
  let handler;
  let started;
  let headersSeen;
  beforeEach(async () => {
    vi.resetModules();
    process.env.SPIRAL_API_KEY = "test-key";
    process.env.SUMMON_DAILY_CAP = "3";
    for (const k of ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL", "KV_REST_API_TOKEN"]) delete process.env[k]; // in-memory path
    started = [];
    headersSeen = [];
    vi.stubGlobal("fetch", async (url, init) => {
      if (init?.method === "POST") {
        const body = JSON.parse(init.body);
        started.push(body);
        headersSeen.push(init.headers);
        return { status: 202, ok: true, json: async () => ({ id: `00000000-0000-4000-8000-00000000000${started.length}` }) };
      }
      return {
        ok: true,
        json: async () => ({
          status: "completed",
          output: { items: [{ type: "image", url: "https://g.spiral.test/img.png", mime_type: "image/png" }] },
        }),
      };
    });
    handler = (await import("./summon.js")).default;
  });
  afterEach(() => vi.unstubAllGlobals());

  it("ignores a client-supplied image URL and removes the background of our own image", async () => {
    const r = await call(handler, {
      body: { op: "bg", runId: "11111111-1111-4111-8111-111111111111", imageUrl: "https://attacker.example/x.png" },
    });
    expect(r.code).toBe(200);
    expect(started).toEqual([
      {
        provider: "wavespeed",
        model: "wavespeed-ai/image-background-remover",
        input: { image: "https://g.spiral.test/img.png" },
      },
    ]);
    expect(headersSeen[0]["Idempotency-Key"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(headersSeen[0].Authorization).toBe("Bearer test-key");
  });

  it("starts image gen on fal gpt-image-2 and returns the run id", async () => {
    const r = await call(handler, { body: { op: "gen", description: "a fox", element: "Ember" } });
    expect(r.code).toBe(200);
    expect(r.body).toEqual({ runId: "00000000-0000-4000-8000-000000000001" });
    expect(started[0]).toMatchObject({
      provider: "fal",
      model: "openai/gpt-image-2",
      input: { image_size: "square_hd", output_format: "png", num_images: 1 },
    });
  });

  it("maps polled runs to pending / done / failed", async () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const q = { runId: id };
    expect((await call(handler, { method: "GET", query: q })).body).toEqual({
      status: "done",
      result: ["https://g.spiral.test/img.png"],
    });
    vi.stubGlobal("fetch", async () => ({ ok: true, json: async () => ({ status: "running" }) }));
    expect((await call(handler, { method: "GET", query: q })).body).toEqual({ status: "pending" });
    vi.stubGlobal("fetch", async () => ({ ok: true, json: async () => ({ status: "failed" }) }));
    expect((await call(handler, { method: "GET", query: q })).body).toEqual({ status: "failed" });
  });

  it("rejects a non-UUID poll runId", async () => {
    expect((await call(handler, { method: "GET", query: { runId: "../v1/me/aaaaaaaa" } })).code).toBe(400);
  });

  it("rejects bg without a valid gen runId", async () => {
    const r = await call(handler, { body: { op: "bg", imageUrl: "https://attacker.example/x.png" } });
    expect(r.code).toBe(400);
    expect(started).toEqual([]);
  });

  it("removes a background only once per generated image", async () => {
    const body = { op: "bg", runId: "11111111-1111-4111-8111-111111111111" };
    expect((await call(handler, { body })).code).toBe(200);
    expect((await call(handler, { body })).code).toBe(409);
  });

  it("refuses cross-site POSTs", async () => {
    const r = await call(handler, {
      body: { op: "gen", description: "a fox", element: "Ember" },
      headers: { origin: "https://evil.example" },
    });
    expect(r.code).toBe(403);
    expect(started).toEqual([]);
  });

  it("stops at the daily budget", async () => {
    const codes = [];
    for (let i = 0; i < 4; i++) {
      const r = await call(handler, {
        body: { op: "gen", description: "a fox", element: "Ember" },
        headers: { "x-forwarded-for": `10.0.0.${i}` },
      });
      codes.push(r.code);
    }
    expect(codes).toEqual([200, 200, 200, 503]);
  });

  it("fails closed with 503 (no paid run) when Redis is configured but erroring", async () => {
    process.env.KV_REST_API_URL = "https://redis.test";
    process.env.KV_REST_API_TOKEN = "t";
    const boom = async () => {
      throw new Error("redis down");
    };
    vi.resetModules();
    vi.doMock("@upstash/redis", () => ({ Redis: class { incr = boom; expire = boom; set = boom; } }));
    vi.doMock("@upstash/ratelimit", () => ({
      Ratelimit: class {
        static slidingWindow() {
          return {};
        }
        limit = boom;
      },
    }));
    const h = (await import("./summon.js")).default;
    const r = await call(h, { body: { op: "gen", description: "a fox", element: "Ember" } });
    expect(r.code).toBe(503);
    expect(started).toEqual([]);
    vi.doUnmock("@upstash/redis");
    vi.doUnmock("@upstash/ratelimit");
  });

  it("returns 503 with zero paid calls when Redis config is only half set", async () => {
    for (const k of ["UPSTASH_REDIS_REST_URL", "KV_REST_API_TOKEN"]) {
      process.env[k] = "x";
      vi.resetModules();
      const h = (await import("./summon.js")).default;
      const r = await call(h, { body: { op: "gen", description: "a fox", element: "Ember" } });
      expect(r.code).toBe(503);
      expect(started).toEqual([]);
      delete process.env[k];
    }
  });
});
