import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkRateLimit } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the max within the window", () => {
    const key = `test-${Math.random()}`;
    expect(checkRateLimit(key, { max: 3 })).toBe(true);
    expect(checkRateLimit(key, { max: 3 })).toBe(true);
    expect(checkRateLimit(key, { max: 3 })).toBe(true);
  });

  it("blocks once the max attempts are exceeded within the window", () => {
    const key = `test-${Math.random()}`;
    checkRateLimit(key, { max: 2 });
    checkRateLimit(key, { max: 2 });
    expect(checkRateLimit(key, { max: 2 })).toBe(false);
  });

  it("resets the bucket after the window elapses", () => {
    const key = `test-${Math.random()}`;
    checkRateLimit(key, { max: 1, windowMs: 1000 });
    expect(checkRateLimit(key, { max: 1, windowMs: 1000 })).toBe(false);

    vi.advanceTimersByTime(1001);

    expect(checkRateLimit(key, { max: 1, windowMs: 1000 })).toBe(true);
  });

  it("tracks separate keys independently", () => {
    const keyA = `a-${Math.random()}`;
    const keyB = `b-${Math.random()}`;
    checkRateLimit(keyA, { max: 1 });
    expect(checkRateLimit(keyA, { max: 1 })).toBe(false);
    expect(checkRateLimit(keyB, { max: 1 })).toBe(true);
  });
});
