import { describe, expect, it } from "vitest";
import { chatModeSchema, chatTextSchema, goalUpdateSchema, messageActionSchema } from "./chat";

describe("chatTextSchema", () => {
  it("trims whitespace", () => {
    const result = chatTextSchema.safeParse("  hola  ");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe("hola");
  });

  it("rejects text longer than 2000 characters", () => {
    expect(chatTextSchema.safeParse("a".repeat(2001)).success).toBe(false);
  });
});

describe("chatModeSchema", () => {
  it("only accepts ask/edit", () => {
    expect(chatModeSchema.safeParse("ask").success).toBe(true);
    expect(chatModeSchema.safeParse("edit").success).toBe(true);
    expect(chatModeSchema.safeParse("delete").success).toBe(false);
  });
});

describe("messageActionSchema", () => {
  it("only accepts apply/discard", () => {
    expect(messageActionSchema.safeParse({ action: "apply" }).success).toBe(true);
    expect(messageActionSchema.safeParse({ action: "discard" }).success).toBe(true);
    expect(messageActionSchema.safeParse({ action: "other" }).success).toBe(false);
  });
});

describe("goalUpdateSchema", () => {
  it("only accepts known goals", () => {
    expect(goalUpdateSchema.safeParse({ goal: "perder_peso" }).success).toBe(true);
    expect(goalUpdateSchema.safeParse({ goal: "volar" }).success).toBe(false);
  });
});
