import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./csrf";

const ORIGIN = "https://bytebite.app";

function req(method: string, headers: Record<string, string> = {}) {
  return new Request(`${ORIGIN}/api/diets`, { method, headers });
}

describe("isSameOriginRequest", () => {
  it("allows safe methods regardless of headers", () => {
    expect(isSameOriginRequest(req("GET"), ORIGIN)).toBe(true);
    expect(isSameOriginRequest(req("HEAD"), ORIGIN)).toBe(true);
  });

  it("allows a mutation with Sec-Fetch-Site: same-origin", () => {
    expect(isSameOriginRequest(req("POST", { "sec-fetch-site": "same-origin" }), ORIGIN)).toBe(
      true,
    );
  });

  it("allows a mutation with Sec-Fetch-Site: none (direct navigation, no browser)", () => {
    expect(isSameOriginRequest(req("POST", { "sec-fetch-site": "none" }), ORIGIN)).toBe(true);
  });

  it("rejects a mutation with Sec-Fetch-Site: cross-site", () => {
    expect(isSameOriginRequest(req("POST", { "sec-fetch-site": "cross-site" }), ORIGIN)).toBe(
      false,
    );
  });

  it("falls back to Origin when Sec-Fetch-Site is absent", () => {
    expect(isSameOriginRequest(req("POST", { origin: ORIGIN }), ORIGIN)).toBe(true);
    expect(isSameOriginRequest(req("POST", { origin: "https://evil.example" }), ORIGIN)).toBe(
      false,
    );
  });

  it("rejects a mutation with neither header", () => {
    expect(isSameOriginRequest(req("POST"), ORIGIN)).toBe(false);
  });
});
