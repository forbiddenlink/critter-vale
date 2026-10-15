// Spend guards for api/summon.js. The underscore keeps Vercel from serving this as a function.
// Two implementations share one async-friendly interface (throttled / takeBudget / claimGenRun):
//  - createGuard: in-memory, per warm instance. It bounds what one instance can spend, but a cold
//    start or a second instance starts fresh. Used only when no Redis env is configured.
//  - createRedisGuard: Upstash Redis, shared across every instance and cold start.
// selectGuard picks Redis when its env vars are set and memory otherwise; with Redis configured
// a Redis failure fails closed (503), never back to memory.

const WINDOW_MS = 60_000;
const DAY_MS = 86_400_000;

export function createGuard({ perMinute = 6, dailyCap = 50, now = () => Date.now() } = {}) {
  const hits = new Map(); // ip -> timestamps in the last minute
  const usedGenRuns = new Set(); // gen runIds already sent to background removal
  let day = { start: now(), count: 0 };

  return {
    /** True when this IP has made too many paid requests in the last minute. */
    throttled(ip) {
      const t = now();
      const recent = (hits.get(ip) ?? []).filter((x) => t - x < WINDOW_MS);
      if (recent.length >= perMinute) {
        hits.set(ip, recent);
        return true;
      }
      recent.push(t);
      hits.set(ip, recent);
      return false;
    },
    /** Reserves one paid run against the daily budget; false when the budget is spent. */
    takeBudget() {
      const t = now();
      if (t - day.start >= DAY_MS) day = { start: t, count: 0 };
      if (day.count >= dailyCap) return false;
      day.count += 1;
      return true;
    },
    /** Each generated image may be background-removed once. */
    claimGenRun(runId) {
      if (usedGenRuns.has(runId)) return false;
      usedGenRuns.add(runId);
      return true;
    },
    kind: "memory",
  };
}

const DAY_SECONDS = 86_400;

/** Thrown when the shared store is configured but unreachable; the paid route must refuse. */
export class GuardUnavailableError extends Error {
  constructor() {
    super("spend guard unavailable");
    this.name = "GuardUnavailableError";
  }
}

/**
 * Redis-backed guard. `limiter` is an @upstash/ratelimit instance (sliding window per IP) and
 * `redis` an @upstash/redis client. Fails CLOSED: a Redis error throws GuardUnavailableError,
 * because falling back to per-instance memory would silently lift the shared spend cap.
 */
export function createRedisGuard({ redis, limiter, dailyCap = 50, now = () => Date.now() }) {
  const closed = async (fn) => {
    try {
      return await fn();
    } catch {
      throw new GuardUnavailableError();
    }
  };
  return {
    throttled: (ip) => closed(async () => !(await limiter.limit(ip)).success),
    takeBudget: () =>
      closed(async () => {
        // One counter per UTC day; the date in the key keeps a missed EXPIRE harmless.
        const key = `cv:budget:${new Date(now()).toISOString().slice(0, 10)}`;
        const n = await redis.incr(key);
        if (n === 1) await redis.expire(key, DAY_SECONDS);
        return n <= dailyCap;
      }),
    claimGenRun: (runId) =>
      closed(async () => (await redis.set(`cv:genrun:${runId}`, 1, { nx: true, ex: DAY_SECONDS })) === "OK"),
    kind: "redis",
  };
}

/** Upstash credentials from either the Upstash or the Vercel KV env names, or null. */
export function redisEnv(env) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

/**
 * Chooses the guard for this deploy: memory only when no Redis env is present, otherwise Redis
 * (throwing GuardUnavailableError if it cannot be set up). `loadDeps` is injectable for tests; by default the Upstash
 * packages are imported only when credentials exist.
 */
export async function selectGuard(
  env,
  { perMinute = 6, dailyCap = 50, loadDeps = defaultLoadDeps } = {}
) {
  const creds = redisEnv(env);
  if (!creds) return createGuard({ perMinute, dailyCap });
  try {
    const { Redis, Ratelimit } = await loadDeps();
    const redis = new Redis(creds);
    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(perMinute, "60 s"),
      prefix: "cv:rl",
    });
    return createRedisGuard({ redis, limiter, dailyCap });
  } catch {
    throw new GuardUnavailableError(); // creds are set: never degrade to per-instance memory
  }
}

async function defaultLoadDeps() {
  const [{ Redis }, { Ratelimit }] = await Promise.all([import("@upstash/redis"), import("@upstash/ratelimit")]);
  return { Redis, Ratelimit };
}

/** Browsers send Origin on cross-site POSTs; only accept our own host. Not proof against curl. */
export function sameOrigin(headers) {
  const origin = headers.origin;
  if (!origin) return true; // same-origin fetches may omit it; the throttle and budget still apply
  const host = String(headers["x-forwarded-host"] || headers.host || "");
  try {
    return new URL(String(origin)).host === host;
  } catch {
    return false;
  }
}

export const RUN_ID = /^[a-zA-Z0-9-]{16,64}$/;
