import { afterEach, describe, expect, it } from "vitest";
import { expectedOrigin, rpID } from "./webauthn-config";

const ORIGINAL_URL = process.env.NEXTAUTH_URL;

describe("webauthn-config", () => {
  afterEach(() => {
    process.env.NEXTAUTH_URL = ORIGINAL_URL;
  });

  it("falls back to localhost:3000 when NEXTAUTH_URL is unset", () => {
    delete process.env.NEXTAUTH_URL;
    expect(rpID()).toBe("localhost");
    expect(expectedOrigin()).toBe("http://localhost:3000");
  });

  it("derives rpID and origin from a production NEXTAUTH_URL", () => {
    process.env.NEXTAUTH_URL = "https://bytebite.example.com";
    expect(rpID()).toBe("bytebite.example.com");
    expect(expectedOrigin()).toBe("https://bytebite.example.com");
  });

  it("ignores the path/query of NEXTAUTH_URL", () => {
    process.env.NEXTAUTH_URL = "https://bytebite.example.com/some/path?x=1";
    expect(rpID()).toBe("bytebite.example.com");
    expect(expectedOrigin()).toBe("https://bytebite.example.com");
  });
});
