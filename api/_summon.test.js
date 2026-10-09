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
  beforeEach(async () => {
    vi.resetModules();
    process.env.MAGICA_KEY = "test-key";
    process.env.SUMMON_DAILY_CAP = "3";
    started = [];
    vi.stubGlobal("fetch", async (url, init) => {
      if (url.endsWith("/run")) {
        started.push(JSON.parse(init.body).input);
        return { status: 202, ok: true, json: async () => ({ runId: `run-${started.length}-abcdefghijklmnop` }) };
      }
      return { ok: true, json: async () => ({ status: "SUCCEEDED", output: { result: ["https://cdn.magica.test/img.png"] } }) };
    });
    handler = (await import("./summon.js")).default;
  });
  afterEach(() => vi.unstubAllGlobals());

  it("ignores a client-supplied image URL and removes the background of our own image", async () => {
    const r = await call(handler, {
      body: { op: "bg", runId: "gen-run-abcdefghijklmnop", imageUrl: "https://attacker.example/x.png" },
    });
    expect(r.code).toBe(200);
    expect(started).toEqual([{ image_url: "https://cdn.magica.test/img.png" }]);
  });

  it("rejects bg without a valid gen runId", async () => {
    const r = await call(handler, { body: { op: "bg", imageUrl: "https://attacker.example/x.png" } });
    expect(r.code).toBe(400);
    expect(started).toEqual([]);
  });

  it("removes a background only once per generated image", async () => {
    const body = { op: "bg", runId: "gen-run-abcdefghijklmnop" };
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
});
