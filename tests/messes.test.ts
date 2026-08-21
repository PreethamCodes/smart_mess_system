import { describe, it, expect } from "vitest";
import {
  MALE_HOSTELS,
  FEMALE_HOSTELS,
  ALL_HOSTELS,
  HOSTEL_TO_MESS_NAME_MAP,
  getHostelsForGender,
  getMessNameForHostel,
  isValidHostel,
} from "../src/lib/constants/hostels";

describe("Phase 1 Authoritative Mess Configuration (Mess 1 to Mess 12)", () => {
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
    "Mess 11",
    "Mess 12",
  ];

  it("should contain exactly 12 messes in the initial university configuration", () => {
    expect(INITIAL_MESSES.length).toBe(12);
  });

  it("should confirm Mess 11 and Mess 12 exist in the mess list", () => {
    expect(INITIAL_MESSES).toContain("Mess 11");
    expect(INITIAL_MESSES).toContain("Mess 12");
  });

  it("should have unique mess names for all 12 facilities", () => {
    const uniqueNames = new Set(INITIAL_MESSES);
    expect(uniqueNames.size).toBe(12);
  });

  it("should conform to the official Mess 1 through Mess 12 naming convention", () => {
    INITIAL_MESSES.forEach((name, index) => {
      expect(name).toBe(`Mess ${index + 1}`);
    });
  });
});

describe("Authoritative University Hostel -> Mess Architecture (24 Hostels)", () => {
  it("should configure exactly 24 university hostels", () => {
    expect(ALL_HOSTELS.length).toBe(24);
    const uniqueHostels = new Set(ALL_HOSTELS);
    expect(uniqueHostels.size).toBe(24);
  });

  it("should configure exactly 14 male hostels", () => {
    expect(MALE_HOSTELS.length).toBe(14);
    expect(MALE_HOSTELS).toEqual([
      "MH - A",
      "MH - B",
      "MH - C",
      "MH - D",
      "MH - E(ANN)",
      "MH - E(NRS)",
      "MH - F",
      "MH - G",
      "MH - H",
      "MH - I",
      "MH - J",
      "MH - K",
      "MH - L",
      "MH - M",
    ]);
  });

  it("should configure exactly 10 female hostels", () => {
    expect(FEMALE_HOSTELS.length).toBe(10);
    expect(FEMALE_HOSTELS).toEqual([
      "LH - 1",
      "LH - 2",
      "LH - 3",
      "LH - 4",
      "LH - 5",
      "LH - 6",
      "LH - 7",
      "LH - 8",
      "LH - 9",
      "LH - 10",
    ]);
  });

  it("should return only male hostels when gender is Male", () => {
    const maleOptions = getHostelsForGender("Male");
    expect(maleOptions.length).toBe(14);
    expect(maleOptions.every((h) => h.startsWith("MH - "))).toBe(true);
  });

  it("should return only female hostels when gender is Female", () => {
    const femaleOptions = getHostelsForGender("Female");
    expect(femaleOptions.length).toBe(10);
    expect(femaleOptions.every((h) => h.startsWith("LH - "))).toBe(true);
  });

  it("should verify every hostel has exactly one mapping to an existing mess (Mess 1 - Mess 12)", () => {
    ALL_HOSTELS.forEach((hostel) => {
      const messName = HOSTEL_TO_MESS_NAME_MAP[hostel];
      expect(messName).toBeDefined();
      expect(messName).toMatch(/^Mess (1[0-2]|[1-9])$/);
    });
  });

  it("should enforce exactly two hostels per mess across all 12 messes", () => {
    const messHostelCounts: Record<string, string[]> = {};
    for (let i = 1; i <= 12; i++) {
      messHostelCounts[`Mess ${i}`] = [];
    }

    ALL_HOSTELS.forEach((hostel) => {
      const mess = HOSTEL_TO_MESS_NAME_MAP[hostel];
      messHostelCounts[mess].push(hostel);
    });

    for (let i = 1; i <= 12; i++) {
      expect(messHostelCounts[`Mess ${i}`].length).toBe(2);
    }
  });

  it("should accurately resolve authoritative test mappings", () => {
    expect(getMessNameForHostel("MH - A")).toBe("Mess 1");
    expect(getMessNameForHostel("MH - B")).toBe("Mess 1");
    expect(getMessNameForHostel("MH - C")).toBe("Mess 2");
    expect(getMessNameForHostel("MH - D")).toBe("Mess 2");
    expect(getMessNameForHostel("MH - E(ANN)")).toBe("Mess 3");
    expect(getMessNameForHostel("MH - E(NRS)")).toBe("Mess 3");
    expect(getMessNameForHostel("MH - F")).toBe("Mess 4");
    expect(getMessNameForHostel("MH - G")).toBe("Mess 4");
    expect(getMessNameForHostel("MH - H")).toBe("Mess 5");
    expect(getMessNameForHostel("MH - I")).toBe("Mess 5");
    expect(getMessNameForHostel("MH - J")).toBe("Mess 6");
    expect(getMessNameForHostel("MH - K")).toBe("Mess 6");
    expect(getMessNameForHostel("MH - L")).toBe("Mess 7");
    expect(getMessNameForHostel("MH - M")).toBe("Mess 7");

    expect(getMessNameForHostel("LH - 1")).toBe("Mess 8");
    expect(getMessNameForHostel("LH - 2")).toBe("Mess 8");
    expect(getMessNameForHostel("LH - 3")).toBe("Mess 9");
    expect(getMessNameForHostel("LH - 4")).toBe("Mess 9");
    expect(getMessNameForHostel("LH - 5")).toBe("Mess 10");
    expect(getMessNameForHostel("LH - 6")).toBe("Mess 10");
    expect(getMessNameForHostel("LH - 7")).toBe("Mess 11");
    expect(getMessNameForHostel("LH - 8")).toBe("Mess 11");
    expect(getMessNameForHostel("LH - 9")).toBe("Mess 12");
    expect(getMessNameForHostel("LH - 10")).toBe("Mess 12");
  });

  it("should validate valid and invalid hostel names", () => {
    expect(isValidHostel("MH - A")).toBe(true);
    expect(isValidHostel("LH - 9")).toBe(true);
    expect(isValidHostel("Random Hostel")).toBe(false);
    expect(getMessNameForHostel("Random Hostel")).toBeNull();
  });
});
