import { describe, it, expect } from "vitest";
import { getErrorMessage } from "../utils/errors";

describe("getErrorMessage", () => {
  it("returns the message of an Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("stringifies non-Error thrown values", () => {
    expect(getErrorMessage("plain string")).toBe("plain string");
    expect(getErrorMessage(42)).toBe("42");
  });

  it("returns null for absent errors", () => {
    expect(getErrorMessage(null)).toBeNull();
    expect(getErrorMessage(undefined)).toBeNull();
  });
});
