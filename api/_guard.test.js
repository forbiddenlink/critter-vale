import { describe, expect, it, vi } from "vitest";
import { createGuard, createRedisGuard, redisEnv, selectGuard, sameOrigin } from "./_guard.js";

describe("createGuard", () => {
  it("throttles an IP after the per-minute limit and frees it a minute later", () => {
    let t = 0;
    const g = createGuard({ perMinute: 2, now: () => t });
    expect(g.throttled("a")).toBe(false);
    expect(g.throttled("a")).toBe(false);
    expect(g.throttled("a")).toBe(true);
    expect(g.throttled("b")).toBe(false);
    t = 60_001;
    expect(g.throttled("a")).toBe(false);
  });

  it("stops paid runs at the daily cap and resets after a day", () => {
    let t = 0;
    const g = createGuard({ dailyCap: 2, now: () => t });
    expect(g.takeBudget()).toBe(true);
    expect(g.takeBudget()).toBe(true);
    expect(g.takeBudget()).toBe(false);
    t = 86_400_000;
    expect(g.takeBudget()).toBe(true);
  });

  it("lets each generated image be background-removed only once", () => {
    const g = createGuard();
    expect(g.claimGenRun("run-1")).toBe(true);
    expect(g.claimGenRun("run-1")).toBe(false);
  });
});

describe("sameOrigin", () => {
  it("accepts a matching origin and a missing one", () => {
    expect(sameOrigin({ origin: "https://critter.vercel.app", host: "critter.vercel.app" })).toBe(true);
    expect(sameOrigin({ host: "critter.vercel.app" })).toBe(true);
  });
  it("rejects another site and garbage", () => {
    expect(sameOrigin({ origin: "https://evil.example", host: "critter.vercel.app" })).toBe(false);
    expect(sameOrigin({ origin: "not a url", host: "critter.vercel.app" })).toBe(false);
  });
});

function fakeRedis() {
  const data = new Map();
  const ttl = new Map();
  return {
    data,
    ttl,
    incr: async (k) => {
      data.set(k, (data.get(k) ?? 0) + 1);
      return data.get(k);
    },
    expire: async (k, s) => void ttl.set(k, s),
    set: async (k, v, opts) => {
      if (opts?.nx && data.has(k)) return null;
      data.set(k, v);
      if (opts?.ex) ttl.set(k, opts.ex);
      return "OK";
    },
  };
}

describe("redisEnv", () => {
  it("reads Upstash or Vercel KV names and needs both url and token", () => {
    expect(redisEnv({ UPSTASH_REDIS_REST_URL: "u", UPSTASH_REDIS_REST_TOKEN: "t" })).toEqual({ url: "u", token: "t" });
    expect(redisEnv({ KV_REST_API_URL: "u", KV_REST_API_TOKEN: "t" })).toEqual({ url: "u", token: "t" });
    expect(redisEnv({ UPSTASH_REDIS_REST_URL: "u" })).toBeNull();
    expect(redisEnv({})).toBeNull();
  });
});

describe("createRedisGuard", () => {
  const limiterFor = (allow) => ({ limit: async () => ({ success: allow() }) });

  it("throttles through the shared limiter", async () => {
    let ok = true;
    const g = createRedisGuard({ redis: fakeRedis(), limiter: limiterFor(() => ok) });
    expect(await g.throttled("a")).toBe(false);
    ok = false;
    expect(await g.throttled("a")).toBe(true);
  });

  it("counts the daily budget with INCR, sets EXPIRE once, and stops at the cap", async () => {
    const redis = fakeRedis();
    const g = createRedisGuard({ redis, limiter: limiterFor(() => true), dailyCap: 2, now: () => Date.UTC(2026, 9, 15) });
    expect(await g.takeBudget()).toBe(true);
    expect(await g.takeBudget()).toBe(true);
    expect(await g.takeBudget()).toBe(false);
    expect([...redis.ttl.entries()]).toEqual([["cv:budget:2026-10-15", 86400]]);
  });

  it("uses a new counter on the next UTC day", async () => {
    let t = Date.UTC(2026, 9, 15);
    const g = createRedisGuard({ redis: fakeRedis(), limiter: limiterFor(() => true), dailyCap: 1, now: () => t });
    expect(await g.takeBudget()).toBe(true);
    expect(await g.takeBudget()).toBe(false);
    t = Date.UTC(2026, 9, 16);
    expect(await g.takeBudget()).toBe(true);
  });

  it("claims a gen run once via SET NX with a TTL", async () => {
    const redis = fakeRedis();
    const g = createRedisGuard({ redis, limiter: limiterFor(() => true) });
    expect(await g.claimGenRun("run-1")).toBe(true);
    expect(await g.claimGenRun("run-1")).toBe(false);
    expect(redis.ttl.get("cv:genrun:run-1")).toBe(86400);
  });

  it("falls back to the in-memory guard when Redis errors", async () => {
    const boom = async () => {
      throw new Error("down");
    };
    const g = createRedisGuard({
      redis: { incr: boom, expire: boom, set: boom },
      limiter: { limit: boom },
      fallback: createGuard({ perMinute: 1, dailyCap: 1 }),
    });
    expect(await g.throttled("a")).toBe(false);
    expect(await g.throttled("a")).toBe(true);
    expect(await g.takeBudget()).toBe(true);
    expect(await g.takeBudget()).toBe(false);
    expect(await g.claimGenRun("r")).toBe(true);
    expect(await g.claimGenRun("r")).toBe(false);
  });
});

describe("selectGuard", () => {
  class FakeRedis {
    constructor(creds) {
      this.creds = creds;
    }
  }
  class FakeRatelimit {
    static slidingWindow(n, w) {
      return { n, w };
    }
    constructor(opts) {
      this.opts = opts;
    }
  }
  const loadDeps = async () => ({ Redis: FakeRedis, Ratelimit: FakeRatelimit });

  it("uses memory when no Redis credentials are set, without loading the packages", async () => {
    const spy = vi.fn(loadDeps);
    const g = await selectGuard({}, { loadDeps: spy });
    expect(g.kind).toBe("memory");
    expect(spy).not.toHaveBeenCalled();
    expect(g.takeBudget()).toBe(true);
  });

  it("uses Redis when Upstash or KV credentials are set", async () => {
    expect((await selectGuard({ UPSTASH_REDIS_REST_URL: "u", UPSTASH_REDIS_REST_TOKEN: "t" }, { loadDeps })).kind).toBe("redis");
    expect((await selectGuard({ KV_REST_API_URL: "u", KV_REST_API_TOKEN: "t" }, { loadDeps })).kind).toBe("redis");
  });

  it("falls back to memory if the Redis packages fail to load", async () => {
    const g = await selectGuard(
      { KV_REST_API_URL: "u", KV_REST_API_TOKEN: "t" },
      { loadDeps: async () => { throw new Error("missing"); } }
    );
    expect(g.kind).toBe("memory");
  });
});
