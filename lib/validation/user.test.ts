import { describe, expect, it } from "vitest";
import { nameUpdateSchema, reminderUpdateSchema } from "./user";

describe("nameUpdateSchema", () => {
  it("trims and accepts a valid name", () => {
    const result = nameUpdateSchema.safeParse({ name: "  Ana  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.name).toBe("Ana");
  });

  it("rejects an empty name", () => {
    expect(nameUpdateSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("rejects a name over 100 characters", () => {
    expect(nameUpdateSchema.safeParse({ name: "a".repeat(101) }).success).toBe(false);
  });
});

describe("reminderUpdateSchema", () => {
  it("accepts a disabled reminder with a null hour", () => {
    expect(
      reminderUpdateSchema.safeParse({ reminderEnabled: false, reminderHour: null }).success,
    ).toBe(true);
  });

  it("accepts an enabled reminder with a valid hour", () => {
    expect(
      reminderUpdateSchema.safeParse({ reminderEnabled: true, reminderHour: 20 }).success,
    ).toBe(true);
  });

  it("rejects an out-of-range hour", () => {
    expect(
      reminderUpdateSchema.safeParse({ reminderEnabled: true, reminderHour: 24 }).success,
    ).toBe(false);
    expect(
      reminderUpdateSchema.safeParse({ reminderEnabled: true, reminderHour: -1 }).success,
    ).toBe(false);
  });
});
