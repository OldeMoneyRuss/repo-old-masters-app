import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { CART_COOKIE_NAME, mergeGuestCart } from "@/lib/cart";

export const dynamic = "force-dynamic";

const mergeSchema = z.object({
  guestToken: z.string().min(1).max(64),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = mergeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  await mergeGuestCart(parsed.data.guestToken, session.user.id);

  const res = NextResponse.json({ ok: true });
  const cookieStore = await cookies();
  if (cookieStore.get(CART_COOKIE_NAME)) {
    res.cookies.set(CART_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return res;
}
