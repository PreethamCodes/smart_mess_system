import { describe, it, expect } from "vitest";
import {
  generateOpaqueQRToken,
  isValidQRTokenFormat,
  doesPayloadContainPII,
} from "../src/lib/credentials/qr";

describe("Opaque QR Credential Generation & Zero-PII Guarantees", () => {
  it("should generate QR tokens adhering to the opaque MESS-CARD format", () => {
    const token = generateOpaqueQRToken();
    expect(token).toMatch(/^MESS-CARD-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
    expect(isValidQRTokenFormat(token)).toBe(true);
  });

  it("should generate 1,000 unique tokens with zero collisions (High Entropy)", () => {
    const tokens = new Set<string>();
    const TOTAL = 1000;

    for (let i = 0; i < TOTAL; i++) {
      const token = generateOpaqueQRToken();
      expect(tokens.has(token)).toBe(false);
      tokens.add(token);
    }

    expect(tokens.size).toBe(TOTAL);
  });

  it("should guarantee that QR tokens contain NO Personally Identifiable Information (Zero PII)", () => {
    const student = {
      name: "Preetham Kumar",
      student_id: "21MCMS01",
      email: "preetham@uohyd.ac.in",
      hostel: "Men's Hostel J",
    };

    // Test across 100 generated tokens
    for (let i = 0; i < 100; i++) {
      const token = generateOpaqueQRToken();
      const leaksPII = doesPayloadContainPII(token, student);
      expect(leaksPII).toBe(false);
    }
  });

  it("should correctly detect if a fake payload attempted to leak student PII", () => {
    const student = {
      name: "Preetham",
      student_id: "21MCMS01",
      email: "preetham@uohyd.ac.in",
      hostel: "Hostel-J",
    };

    expect(doesPayloadContainPII("MESS-CARD-Preetham-9999", student)).toBe(true);
    expect(doesPayloadContainPII("MESS-CARD-21MCMS01-A1B2", student)).toBe(true);
    expect(doesPayloadContainPII("MESS-CARD-preetham@uohyd.ac.in", student)).toBe(true);
    expect(doesPayloadContainPII("MESS-CARD-A1B2-C3D4-E5F6-7890", student)).toBe(false);
  });

  it("should validate valid and invalid token formats", () => {
    expect(isValidQRTokenFormat("MESS-CARD-8F72A91C")).toBe(true);
    expect(isValidQRTokenFormat("MESS-CARD-1234-5678-9ABC-DEF0")).toBe(true);
    expect(isValidQRTokenFormat("INVALID-CARD-1234")).toBe(false);
    expect(isValidQRTokenFormat("MESS-CARD-")).toBe(false);
    expect(isValidQRTokenFormat("")).toBe(false);
  });
});
