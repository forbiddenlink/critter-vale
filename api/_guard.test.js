import { describe, expect, it } from "vitest";
import { createGuard, sameOrigin } from "./_guard.js";

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
