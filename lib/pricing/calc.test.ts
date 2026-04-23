import { describe, it, expect } from "vitest";
import { unitPriceCents } from "./calc";

const baseSnap = {
  basePriceCents: 5000,
  sizeModifiers: { "8x10": 0, "11x14": 1000, "16x20": 2500, "24x36": 5000 },
  paperModifiers: { archival_matte: 0, lustre: 500, fine_art_cotton: 1500 },
  updatedAt: new Date(0),
};

describe("unitPriceCents", () => {
  it("returns base price for base size + paper", () => {
    expect(unitPriceCents(baseSnap, { printSize: "8x10", paperType: "archival_matte" })).toBe(5000);
  });

  it("adds size modifier", () => {
    expect(unitPriceCents(baseSnap, { printSize: "11x14", paperType: "archival_matte" })).toBe(6000);
  });

  it("adds paper modifier", () => {
    expect(unitPriceCents(baseSnap, { printSize: "8x10", paperType: "lustre" })).toBe(5500);
  });

  it("adds both modifiers", () => {
    expect(unitPriceCents(baseSnap, { printSize: "16x20", paperType: "fine_art_cotton" })).toBe(9000);
  });

  it("returns 0 for negative total (floor at 0)", () => {
    const snap = { ...baseSnap, basePriceCents: 100, sizeModifiers: { small: -500 }, paperModifiers: {} };
    expect(unitPriceCents(snap, { printSize: "small", paperType: "any" })).toBe(0);
  });

  it("defaults missing modifier to 0", () => {
    expect(unitPriceCents(baseSnap, { printSize: "unknown", paperType: "unknown" })).toBe(5000);
  });
});
