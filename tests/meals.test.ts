import { describe, it, expect } from "vitest";
import {
  MEAL_SCHEDULES,
  ALL_MEAL_TYPES,
  isMealAvailableNow,
  getCurrentActiveMeal,
  getMealDisplayName,
  getMealTimeWindow,
  getFormattedDate,
} from "../src/lib/meals/config";

describe("Meal Configurations & Schedules", () => {
  it("should have all 3 standard meal services configured", () => {
    expect(ALL_MEAL_TYPES).toEqual(["BREAKFAST", "LUNCH", "DINNER"]);
    expect(MEAL_SCHEDULES.BREAKFAST).toBeDefined();
    expect(MEAL_SCHEDULES.LUNCH).toBeDefined();
    expect(MEAL_SCHEDULES.DINNER).toBeDefined();
  });

  it("should return human-readable meal names and window descriptions", () => {
    expect(getMealDisplayName("BREAKFAST")).toBe("Breakfast");
    expect(getMealDisplayName("LUNCH")).toBe("Lunch");
    expect(getMealDisplayName("DINNER")).toBe("Dinner");

    expect(getMealTimeWindow("BREAKFAST")).toContain("07:30 AM");
    expect(getMealTimeWindow("LUNCH")).toContain("12:30 PM");
    expect(getMealTimeWindow("DINNER")).toContain("07:30 PM");
  });

  it("should format dates in standard ISO YYYY-MM-DD format", () => {
    const fixedDate = new Date(2026, 7, 21); // 21 Aug 2026
    expect(getFormattedDate(fixedDate)).toBe("2026-08-21");
  });

  describe("Meal Operational Availability Window Evaluations", () => {
    it("should accept breakfast within 07:30 to 09:30", () => {
      const duringBreakfast = new Date(2026, 7, 21, 8, 15); // 08:15 AM
      expect(isMealAvailableNow("BREAKFAST", duringBreakfast)).toBe(true);

      const beforeBreakfast = new Date(2026, 7, 21, 7, 0); // 07:00 AM
      expect(isMealAvailableNow("BREAKFAST", beforeBreakfast)).toBe(false);

      const afterBreakfast = new Date(2026, 7, 21, 10, 0); // 10:00 AM
      expect(isMealAvailableNow("BREAKFAST", afterBreakfast)).toBe(false);
    });

    it("should accept lunch within 12:30 to 14:30", () => {
      const duringLunch = new Date(2026, 7, 21, 13, 0); // 01:00 PM
      expect(isMealAvailableNow("LUNCH", duringLunch)).toBe(true);

      const beforeLunch = new Date(2026, 7, 21, 11, 45); // 11:45 AM
      expect(isMealAvailableNow("LUNCH", beforeLunch)).toBe(false);

      const afterLunch = new Date(2026, 7, 21, 15, 0); // 03:00 PM
      expect(isMealAvailableNow("LUNCH", afterLunch)).toBe(false);
    });

    it("should accept dinner within 19:30 to 21:30", () => {
      const duringDinner = new Date(2026, 7, 21, 20, 30); // 08:30 PM
      expect(isMealAvailableNow("DINNER", duringDinner)).toBe(true);

      const beforeDinner = new Date(2026, 7, 21, 18, 0); // 06:00 PM
      expect(isMealAvailableNow("DINNER", beforeDinner)).toBe(false);

      const afterDinner = new Date(2026, 7, 21, 22, 0); // 10:00 PM
      expect(isMealAvailableNow("DINNER", afterDinner)).toBe(false);
    });

    it("should determine the active meal accurately based on system time", () => {
      const lunchTime = new Date(2026, 7, 21, 13, 15);
      expect(getCurrentActiveMeal(lunchTime)).toBe("LUNCH");

      const dinnerTime = new Date(2026, 7, 21, 20, 0);
      expect(getCurrentActiveMeal(dinnerTime)).toBe("DINNER");

      const midnight = new Date(2026, 7, 21, 23, 59);
      expect(getCurrentActiveMeal(midnight)).toBeNull();
    });

    it("should allow explicit bypass of time restrictions when requested", () => {
      const midnight = new Date(2026, 7, 21, 0, 0);
      expect(isMealAvailableNow("LUNCH", midnight, false)).toBe(false);
      expect(isMealAvailableNow("LUNCH", midnight, true)).toBe(true);
    });
  });
});
