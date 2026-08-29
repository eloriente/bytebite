import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = new Map<string, { id: string; kind: string; data: string; expiresAt: Date }>();
let nextId = 0;

vi.mock("./prisma", () => ({
  prisma: {
    pendingAuthAction: {
      create: vi.fn(async ({ data }: { data: { kind: string; data: string; expiresAt: Date } }) => {
        const id = `row-${nextId++}`;
        const row = { id, ...data };
        db.set(id, row);
        return row;
      }),
      delete: vi.fn(async ({ where: { id } }: { where: { id: string } }) => {
        const row = db.get(id);
        if (!row) throw new Error("Record to delete does not exist.");
        db.delete(id);
        return row;
      }),
    },
  },
}));

import {
  putPendingLogin,
  putPendingRegistration,
  putPostAuthToken,
  takePendingLogin,
  takePendingRegistration,
  takePostAuthToken,
} from "./webauthn-store";

beforeEach(() => {
  vi.useFakeTimers();
  db.clear();
  nextId = 0;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("pending registration challenges", () => {
  it("round-trips a challenge and is consumed only once", async () => {
    const cid = await putPendingRegistration("chal-1", "Ana", "ana@example.com");
    await expect(takePendingRegistration(cid)).resolves.toEqual({
      challenge: "chal-1",
      name: "Ana",
      email: "ana@example.com",
    });
    await expect(takePendingRegistration(cid)).resolves.toBeNull();
  });

  it("expires after the TTL", async () => {
    const cid = await putPendingRegistration("chal-1", "Ana", "ana@example.com");
    vi.advanceTimersByTime(5 * 60_000 + 1);
    await expect(takePendingRegistration(cid)).resolves.toBeNull();
  });

  it("returns null for an unknown cid", async () => {
    await expect(takePendingRegistration("does-not-exist")).resolves.toBeNull();
  });

  it("does not leak into the login/token namespaces", async () => {
    const cid = await putPendingRegistration("chal-1", "Ana", "ana@example.com");
    await expect(takePendingLogin(cid)).resolves.toBeNull();
    await expect(takePostAuthToken(cid)).resolves.toBeNull();
  });
});

describe("pending login challenges", () => {
  it("round-trips and is one-shot", async () => {
    const cid = await putPendingLogin("chal-2");
    await expect(takePendingLogin(cid)).resolves.toEqual({ challenge: "chal-2" });
    await expect(takePendingLogin(cid)).resolves.toBeNull();
  });
});

describe("post-auth tokens", () => {
  it("resolves to the user id exactly once", async () => {
    const token = await putPostAuthToken("user-1");
    await expect(takePostAuthToken(token)).resolves.toBe("user-1");
    await expect(takePostAuthToken(token)).resolves.toBeNull();
  });

  it("expires after its (shorter) TTL", async () => {
    const token = await putPostAuthToken("user-1");
    vi.advanceTimersByTime(60_000 + 1);
    await expect(takePostAuthToken(token)).resolves.toBeNull();
  });
});
