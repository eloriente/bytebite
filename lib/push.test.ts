import { describe, expect, it } from "vitest";
import { isExpiredSubscriptionError } from "./push";

describe("isExpiredSubscriptionError", () => {
  it("recognizes 404 and 410 as expired", () => {
    expect(isExpiredSubscriptionError({ statusCode: 404 })).toBe(true);
    expect(isExpiredSubscriptionError({ statusCode: 410 })).toBe(true);
  });

  it("does not treat other errors as expired", () => {
    expect(isExpiredSubscriptionError({ statusCode: 500 })).toBe(false);
    expect(isExpiredSubscriptionError(new Error("network"))).toBe(false);
    expect(isExpiredSubscriptionError(null)).toBe(false);
  });
});
