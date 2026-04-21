import { describe, it, expect } from "vitest";
import { fitPadDpi, computeEligibility } from "./fit-pad";
import { MIN_DPI } from "./sizes";

describe("fitPadDpi", () => {
  it("returns correct DPI for square image on 8x10 print", () => {
    // 2400×2400 square image on 8×10 print — height fills (tighter axis)
    const dpi = fitPadDpi(2400, 2400, "8x10");
    // printRatio=0.8, srcRatio=1 → width fills → 2400/8=300
    expect(dpi).toBe(300);
  });

  it("returns correct DPI when width fills the print", () => {
    // 3000×2000 landscape image on 16×20 print
    // Orient: source landscape → print 20×16 (landscape)
    // srcRatio = 3000/2000 = 1.5, printRatio = 20/16 = 1.25
    // fillByWidth (1.5 >= 1.25) → dpi = 3000/20 = 150
    const dpi = fitPadDpi(3000, 2000, "16x20");
    expect(dpi).toBe(150);
  });

  it("returns correct DPI when height fills the print", () => {
    // 2000×3000 portrait on 11×14 print
    // Orient: source portrait → print 11×14
    // srcRatio = 2000/3000 ≈ 0.667, printRatio = 11/14 ≈ 0.786
    // fillByWidth = false (0.667 < 0.786) → dpi = 3000/14 ≈ 214
    const dpi = fitPadDpi(2000, 3000, "11x14");
    expect(dpi).toBe(Math.floor(3000 / 14));
  });

  it("floors the result", () => {
    const dpi = fitPadDpi(2000, 3000, "11x14");
    expect(Number.isInteger(dpi)).toBe(true);
  });
});

describe("computeEligibility", () => {
  it("marks all 6 sizes for a large high-res image", () => {
    const results = computeEligibility(6000, 7500);
    expect(results).toHaveLength(6);
  });

  it("marks small image ineligible for large print sizes", () => {
    // 2400×3000 — marginal resolution
    const results = computeEligibility(2400, 3000);
    const ineligible = results.filter((r) => !r.eligible);
    // At least the largest size (30x40) should be ineligible at 2400px wide
    expect(ineligible.some((r) => r.size === "30x40")).toBe(true);
  });

  it(`marks eligible when dpi >= ${MIN_DPI}`, () => {
    const results = computeEligibility(2400, 3000);
    for (const r of results) {
      expect(r.eligible).toBe(r.dpi >= MIN_DPI);
    }
  });
});
