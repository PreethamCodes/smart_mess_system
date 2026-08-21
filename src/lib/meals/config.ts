import { MealType, RejectionReasonCode } from "@/types/database";

export interface MealSchedule {
  mealType: MealType;
  displayName: string;
  startHour: number; // 24-hr format
  startMinute: number;
  endHour: number;
  endMinute: number;
  description: string;
}

/**
 * Standard University Dining Meal Windows
 * 
 * Breakfast: 07:30 - 09:30
 * Lunch:     12:30 - 14:30
 * Dinner:    19:30 - 21:30
 */
export const MEAL_SCHEDULES: Record<MealType, MealSchedule> = {
  BREAKFAST: {
    mealType: "BREAKFAST",
    displayName: "Breakfast",
    startHour: 7,
    startMinute: 30,
    endHour: 9,
    endMinute: 30,
    description: "07:30 AM – 09:30 AM",
  },
  LUNCH: {
    mealType: "LUNCH",
    displayName: "Lunch",
    startHour: 12,
    startMinute: 30,
    endHour: 14,
    endMinute: 30,
    description: "12:30 PM – 02:30 PM",
  },
  DINNER: {
    mealType: "DINNER",
    displayName: "Dinner",
    startHour: 19,
    startMinute: 30,
    endHour: 21,
    endMinute: 30,
    description: "07:30 PM – 09:30 PM",
  },
};

export const ALL_MEAL_TYPES: MealType[] = ["BREAKFAST", "LUNCH", "DINNER"];

export const REJECTION_MESSAGES: Record<RejectionReasonCode, string> = {
  INVALID_CARD: "Invalid card",
  BLOCKED_CARD: "Blocked card",
  DEACTIVATED_CARD: "Deactivated card",
  WRONG_MESS: "Wrong mess",
  STUDENT_ON_LEAVE: "Student on leave",
  ALREADY_CONSUMED: "Meal already consumed",
  MEAL_UNAVAILABLE: "Meal unavailable",
  STUDENT_MISMATCH: "Student details mismatch",
  OTHER: "Verification rejected",
};

/**
 * Returns formatted ISO date YYYY-MM-DD for the current/given date
 */
export function getFormattedDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Checks whether a given meal is currently within its operational time window.
 * Allows override in development or testing environments when configured.
 */
export function isMealAvailableNow(
  mealType: MealType,
  now: Date = new Date(),
  bypassTimeRestriction: boolean = false
): boolean {
  if (bypassTimeRestriction) {
    return true;
  }

  // If environment variable explicitly bypasses meal window restrictions for testing
  if (process.env.NEXT_PUBLIC_ALLOW_ANY_MEAL_TIME === "true" || process.env.ALLOW_ANY_MEAL_TIME === "true") {
    return true;
  }

  const schedule = MEAL_SCHEDULES[mealType];
  if (!schedule) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = schedule.startHour * 60 + schedule.startMinute;
  const endMinutes = schedule.endHour * 60 + schedule.endMinute;

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Determines which regular meal (if any) is currently active based on system time.
 */
export function getCurrentActiveMeal(now: Date = new Date()): MealType | null {
  for (const meal of ALL_MEAL_TYPES) {
    if (isMealAvailableNow(meal, now)) {
      return meal;
    }
  }
  return null;
}

/**
 * Human-readable display name for a meal type
 */
export function getMealDisplayName(mealType: MealType): string {
  return MEAL_SCHEDULES[mealType]?.displayName || mealType;
}

/**
 * Human-readable timing window description
 */
export function getMealTimeWindow(mealType: MealType): string {
  return MEAL_SCHEDULES[mealType]?.description || "";
}
