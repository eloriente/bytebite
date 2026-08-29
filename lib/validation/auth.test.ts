import { describe, expect, it } from "vitest";
import { passkeyRegisterOptionsSchema } from "./auth";

describe("passkeyRegisterOptionsSchema", () => {
  it("accepts valid input and normalizes the email", () => {
    const result = passkeyRegisterOptionsSchema.safeParse({
      name: "Ana",
      email: "ANA@Example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("ana@example.com");
    }
  });

  it("rejects an empty name", () => {
    expect(passkeyRegisterOptionsSchema.safeParse({ name: "  ", email: "a@b.com" }).success).toBe(
      false,
    );
  });

  it("rejects an invalid email", () => {
    expect(
      passkeyRegisterOptionsSchema.safeParse({ name: "Ana", email: "not-an-email" }).success,
    ).toBe(false);
  });
});
