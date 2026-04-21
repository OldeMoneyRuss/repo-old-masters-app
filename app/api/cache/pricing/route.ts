import { NextRequest, NextResponse } from "next/server";
import { invalidatePricingCache } from "@/lib/pricing";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest) {
  void req;
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  invalidatePricingCache();
  return NextResponse.json({ ok: true });
}
