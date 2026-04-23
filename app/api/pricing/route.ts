import { NextResponse } from "next/server";
import { getPricing } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export async function GET() {
  const snap = await getPricing();
  return NextResponse.json(snap, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
  });
}
