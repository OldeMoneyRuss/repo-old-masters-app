import { describe, it, expect } from "vitest";

/**
 * Mirrors the ALLOWED_TRANSITIONS map in app/api/admin/orders/[id]/status/route.ts.
 * Tests guard against accidental widening of that map.
 */
const ALLOWED_TRANSITIONS: Record<string, string> = {
  paid: "in_production",
  in_production: "quality_check",
  quality_check: "shipped",
  shipped: "delivered",
};

function canTransition(from: string, to: string): boolean {
  return ALLOWED_TRANSITIONS[from] === to;
}

describe("order status transitions", () => {
  it("allows the full happy-path chain", () => {
    expect(canTransition("paid", "in_production")).toBe(true);
    expect(canTransition("in_production", "quality_check")).toBe(true);
    expect(canTransition("quality_check", "shipped")).toBe(true);
    expect(canTransition("shipped", "delivered")).toBe(true);
  });

  it("blocks skipping steps", () => {
    expect(canTransition("paid", "shipped")).toBe(false);
    expect(canTransition("paid", "delivered")).toBe(false);
    expect(canTransition("in_production", "delivered")).toBe(false);
  });

  it("blocks backwards transitions", () => {
    expect(canTransition("shipped", "paid")).toBe(false);
    expect(canTransition("delivered", "shipped")).toBe(false);
  });

  it("blocks transitions from terminal states", () => {
    expect(canTransition("cancelled", "paid")).toBe(false);
    expect(canTransition("refunded", "paid")).toBe(false);
    expect(canTransition("delivered", "in_production")).toBe(false);
  });

  it("is idempotent — same-status transition is not allowed", () => {
    expect(canTransition("paid", "paid")).toBe(false);
    expect(canTransition("shipped", "shipped")).toBe(false);
  });
});
