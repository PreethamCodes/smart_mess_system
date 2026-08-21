import { describe, it, expect } from "vitest";

describe("Initial University Mess Configuration (Mess 1 to Mess 10)", () => {
  const INITIAL_MESSES = [
    "Mess 1",
    "Mess 2",
    "Mess 3",
    "Mess 4",
    "Mess 5",
    "Mess 6",
    "Mess 7",
    "Mess 8",
    "Mess 9",
    "Mess 10",
  ];

  it("should contain exactly 10 messes in the initial university configuration", () => {
    expect(INITIAL_MESSES.length).toBe(10);
  });

  it("should have unique mess names for all 10 facilities", () => {
    const uniqueNames = new Set(INITIAL_MESSES);
    expect(uniqueNames.size).toBe(10);
  });

  it("should conform to the official Mess 1 through Mess 10 naming convention", () => {
    INITIAL_MESSES.forEach((name, index) => {
      expect(name).toBe(`Mess ${index + 1}`);
    });
  });
});
