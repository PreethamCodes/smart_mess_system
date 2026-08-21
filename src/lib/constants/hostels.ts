export type Gender = "Male" | "Female";

export const MALE_HOSTELS = [
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
] as const;

export const FEMALE_HOSTELS = [
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
] as const;

export const ALL_HOSTELS = [...MALE_HOSTELS, ...FEMALE_HOSTELS] as const;

export type MaleHostel = (typeof MALE_HOSTELS)[number];
export type FemaleHostel = (typeof FEMALE_HOSTELS)[number];
export type Hostel = (typeof ALL_HOSTELS)[number];

/**
 * Authoritative University Hostel -> Mess Name Mapping
 * Exactly 2 hostels per mess across 12 total messes
 */
export const HOSTEL_TO_MESS_NAME_MAP: Record<Hostel, string> = {
  // Male Hostels -> Mess 1 to Mess 7
  "MH - A": "Mess 1",
  "MH - B": "Mess 1",
  "MH - C": "Mess 2",
  "MH - D": "Mess 2",
  "MH - E(ANN)": "Mess 3",
  "MH - E(NRS)": "Mess 3",
  "MH - F": "Mess 4",
  "MH - G": "Mess 4",
  "MH - H": "Mess 5",
  "MH - I": "Mess 5",
  "MH - J": "Mess 6",
  "MH - K": "Mess 6",
  "MH - L": "Mess 7",
  "MH - M": "Mess 7",

  // Female Hostels -> Mess 8 to Mess 12
  "LH - 1": "Mess 8",
  "LH - 2": "Mess 8",
  "LH - 3": "Mess 9",
  "LH - 4": "Mess 9",
  "LH - 5": "Mess 10",
  "LH - 6": "Mess 10",
  "LH - 7": "Mess 11",
  "LH - 8": "Mess 11",
  "LH - 9": "Mess 12",
  "LH - 10": "Mess 12",
};

export function getHostelsForGender(gender: Gender): readonly string[] {
  return gender === "Male" ? MALE_HOSTELS : FEMALE_HOSTELS;
}

export function isValidHostel(hostel: string): hostel is Hostel {
  return (ALL_HOSTELS as readonly string[]).includes(hostel);
}

export function getMessNameForHostel(hostel: string): string | null {
  if (isValidHostel(hostel)) {
    return HOSTEL_TO_MESS_NAME_MAP[hostel];
  }
  return null;
}
