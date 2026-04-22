"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { addresses, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

const addressSchema = z.object({
  fullName: z.string().trim().min(1).max(160),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1).max(120),
  region: z.string().trim().max(120).optional().or(z.literal("")),
  postalCode: z.string().trim().min(1).max(40),
  country: z
    .string()
    .trim()
    .length(2)
    .transform((v) => v.toUpperCase()),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  isDefaultShipping: z.boolean().optional(),
});

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?next=/account");
  }
  return session.user.id;
}

export async function addAddressAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();

  const parsed = addressSchema.safeParse({
    fullName: formData.get("fullName"),
    line1: formData.get("line1"),
    line2: formData.get("line2") ?? "",
    city: formData.get("city"),
    region: formData.get("region") ?? "",
    postalCode: formData.get("postalCode"),
    country: formData.get("country"),
    phone: formData.get("phone") ?? "",
    isDefaultShipping: formData.get("isDefaultShipping") === "on",
  });

  if (!parsed.success) {
    redirect("/account/addresses?error=invalid");
  }

  const data = parsed.data;
  const makeDefault = Boolean(data.isDefaultShipping);

  await db.transaction(async (tx) => {
    if (makeDefault) {
      await tx
        .update(addresses)
        .set({ isDefaultShipping: false })
        .where(eq(addresses.userId, userId));
    }
    await tx.insert(addresses).values({
      userId,
      fullName: data.fullName,
      line1: data.line1,
      line2: data.line2 ? data.line2 : null,
      city: data.city,
      region: data.region ? data.region : null,
      postalCode: data.postalCode,
      country: data.country,
      phone: data.phone ? data.phone : null,
      isDefaultShipping: makeDefault,
    });
  });

  revalidatePath("/account/addresses");
  redirect("/account/addresses");
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();
  const addressId = String(formData.get("addressId") ?? "");

  if (!addressId) {
    redirect("/account/addresses?error=invalid");
  }

  await db
    .delete(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)));

  revalidatePath("/account/addresses");
  redirect("/account/addresses");
}

export async function setDefaultShippingAction(
  formData: FormData,
): Promise<void> {
  const userId = await requireUserId();
  const addressId = String(formData.get("addressId") ?? "");

  if (!addressId) {
    redirect("/account/addresses?error=invalid");
  }

  await db.transaction(async (tx) => {
    const [owned] = await tx
      .select({ id: addresses.id })
      .from(addresses)
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
      .limit(1);

    if (!owned) return;

    await tx
      .update(addresses)
      .set({ isDefaultShipping: false })
      .where(eq(addresses.userId, userId));

    await tx
      .update(addresses)
      .set({ isDefaultShipping: true })
      .where(eq(addresses.id, addressId));
  });

  revalidatePath("/account/addresses");
  redirect("/account/addresses");
}

const updateNameSchema = z.object({
  name: z.string().trim().min(1).max(160),
});

export async function updateNameAction(formData: FormData): Promise<void> {
  const userId = await requireUserId();

  const parsed = updateNameSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    redirect("/account/profile?error=invalid_name");
  }

  await db
    .update(users)
    .set({ name: parsed.data.name, updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath("/account/profile");
  redirect("/account/profile?nameUpdated=1");
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12).max(256),
});

export async function changePasswordAction(
  formData: FormData,
): Promise<void> {
  const userId = await requireUserId();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    redirect("/account/profile?error=invalid_password");
  }

  const [row] = await db
    .select({ id: users.id, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row) {
    redirect("/login?next=/account/profile");
  }

  const ok = await verifyPassword(row.passwordHash, parsed.data.currentPassword);
  if (!ok) {
    redirect("/account/profile?error=wrong_password");
  }

  const passwordHash = await hashPassword(parsed.data.newPassword);
  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, userId));

  revalidatePath("/account/profile");
  redirect("/account/profile?passwordChanged=1");
}
