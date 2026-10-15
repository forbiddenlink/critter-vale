import { describe, expect, it, vi } from "vitest";
import { createGuard, createRedisGuard, GuardUnavailableError, redisEnv, selectGuard, sameOrigin } from "./_guard.js";

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

  it("treats a ratelimit reason:timeout as a failure, not an allow", async () => {
    const g = createRedisGuard({ redis: fakeRedis(), limiter: { limit: async () => ({ success: true, reason: "timeout" }) } });
    await expect(g.throttled("a")).rejects.toBeInstanceOf(GuardUnavailableError);
  });

  it("bounds hanging INCR/SET calls", async () => {
    const hang = () => new Promise(() => {});
    const g = createRedisGuard({ redis: { incr: hang, expire: hang, set: hang }, limiter: { limit: hang }, timeoutMs: 20 });
    await expect(g.takeBudget()).rejects.toBeInstanceOf(GuardUnavailableError);
    await expect(g.claimGenRun("r")).rejects.toBeInstanceOf(GuardUnavailableError);
    await expect(g.throttled("a")).rejects.toBeInstanceOf(GuardUnavailableError);
  });

  it("fails closed (throws) when Redis errors", async () => {
    const boom = async () => {
      throw new Error("down");
    };
    const g = createRedisGuard({ redis: { incr: boom, expire: boom, set: boom }, limiter: { limit: boom } });
    await expect(g.throttled("a")).rejects.toBeInstanceOf(GuardUnavailableError);
    await expect(g.takeBudget()).rejects.toBeInstanceOf(GuardUnavailableError);
    await expect(g.claimGenRun("r")).rejects.toBeInstanceOf(GuardUnavailableError);
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

  it("fails closed on partial config (URL only or token only), loading nothing", async () => {
    const spy = vi.fn(loadDeps);
    for (const env of [
      { UPSTASH_REDIS_REST_URL: "u" },
      { UPSTASH_REDIS_REST_TOKEN: "t" },
      { KV_REST_API_URL: "u" },
      { KV_REST_API_TOKEN: "t" },
    ]) {
      await expect(selectGuard(env, { loadDeps: spy })).rejects.toBeInstanceOf(GuardUnavailableError);
    }
    expect(spy).not.toHaveBeenCalled();
  });

  it("fails closed if credentials are set but the Redis packages fail to load", async () => {
    await expect(
      selectGuard(
        { KV_REST_API_URL: "u", KV_REST_API_TOKEN: "t" },
        { loadDeps: async () => { throw new Error("missing"); } }
      )
    ).rejects.toBeInstanceOf(GuardUnavailableError);
  });
});

describe("selectGuard with the real Upstash SDK and a hanging network", () => {
  it("rejects every guard call instead of allowing the request", async () => {
    vi.stubGlobal("fetch", () => new Promise(() => {})); // never resolves
    try {
      const g = await selectGuard(
        { UPSTASH_REDIS_REST_URL: "https://redis.invalid", UPSTASH_REDIS_REST_TOKEN: "t" },
        { timeoutMs: 50 }
      );
      expect(g.kind).toBe("redis");
      await expect(g.throttled("1.2.3.4")).rejects.toBeInstanceOf(GuardUnavailableError);
      await expect(g.takeBudget()).rejects.toBeInstanceOf(GuardUnavailableError);
      await expect(g.claimGenRun("run-abcdefghijklmnop")).rejects.toBeInstanceOf(GuardUnavailableError);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
