import { describe, expect, it } from "vitest";
import { urlBase64ToUint8Array } from "./utils";

describe("urlBase64ToUint8Array", () => {
  it("decodes a base64url string without padding", () => {
    // "hola" en base64 es "aG9sYQ==" -> base64url sin padding: "aG9sYQ"
    const result = urlBase64ToUint8Array("aG9sYQ");
    expect(Buffer.from(result).toString("utf-8")).toBe("hola");
  });

  it("handles the -/_ base64url alphabet", () => {
    const original = Buffer.from([0xfb, 0xff, 0xbf]);
    const base64url = original.toString("base64url");
    const result = urlBase64ToUint8Array(base64url);
    expect(Buffer.from(result)).toEqual(original);
  });
});
