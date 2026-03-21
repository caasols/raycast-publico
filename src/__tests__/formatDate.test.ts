import { describe, it, expect } from "vitest";
import { formatDate } from "../utils/formatDate";

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
