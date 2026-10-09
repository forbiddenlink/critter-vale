// Spend guards for api/summon.js. The underscore keeps Vercel from serving this as a function.
// All state is per warm instance: it bounds what one instance can spend, but a cold start or a
// second instance starts fresh. A shared store (e.g. Upstash) is the real fix if traffic grows.

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
  };
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
