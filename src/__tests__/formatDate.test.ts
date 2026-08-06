import { describe, it, expect } from "vitest";
import { formatDate, parseApiDate } from "../utils/formatDate";

describe("formatDate", () => {
  it("formats a valid ISO date string", () => {
    const result = formatDate("2024-03-15T10:30:00Z");
    // Should contain day, month name, year, and time
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2024/);
  });

  it("returns original string for invalid date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });

  it("returns original string for empty string", () => {
    // new Date("") is Invalid Date
    expect(formatDate("")).toBe("");
  });

  it("handles date-only strings", () => {
    const result = formatDate("2024-01-01");
    expect(result).toMatch(/2024/);
    expect(result).toMatch(/1/); // day
  });

  it("formats dates in Portuguese locale", () => {
    const result = formatDate("2024-06-15T14:00:00Z");
    // Portuguese month names: janeiro, fevereiro, março, abril, maio, junho...
    // June = "junho"
    expect(result.toLowerCase()).toMatch(/junh/);
  });
});

describe("parseApiDate", () => {
  it("trusts an explicit offset", () => {
    // /api/list/ultimas sends this form.
    expect(parseApiDate("2026-08-06T00:30:00+01:00")?.toISOString()).toBe(
      "2026-08-05T23:30:00.000Z",
    );
  });

  it("reads an offsetless summer timestamp as Lisbon, which is UTC+1", () => {
    // /api/list/opiniao and /api/content/news/{id} send this form for the
    // same instant. Without normalization it was read as machine-local, so
    // the two feeds disagreed anywhere but UTC+1.
    expect(parseApiDate("2026-08-06T00:30:00")?.toISOString()).toBe(
      "2026-08-05T23:30:00.000Z",
    );
  });

  it("reads an offsetless winter timestamp as Lisbon, which is UTC+0", () => {
    // Lisbon observes DST, so a fixed offset would be wrong half the year.
    expect(parseApiDate("2026-01-15T12:00:00")?.toISOString()).toBe(
      "2026-01-15T12:00:00.000Z",
    );
  });

  it("returns null for unparseable input", () => {
    expect(parseApiDate("not-a-date")).toBeNull();
    expect(parseApiDate("")).toBeNull();
  });
});
