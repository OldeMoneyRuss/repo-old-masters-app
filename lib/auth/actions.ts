"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { hashPassword } from "./password";
import { issueVerificationToken } from "./verification";
import { sendVerificationEmail } from "@/lib/email";
import { signIn } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().min(1).max(160),
  email: z.string().email().max(320),
  password: z.string().min(12).max(256),
});

export async function registerAction(formData: FormData) {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    redirect("/register?error=invalid");
  }
  const { name, email, password } = parsed.data;
  const normalized = email.toLowerCase();

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, normalized))
    .limit(1);
  if (existing) {
    redirect("/register?error=already_registered");
  }

  const passwordHash = await hashPassword(password);
  const [row] = await db
    .insert(users)
    .values({
      email: normalized,
      passwordHash,
      name,
      role: "customer",
    })
    .returning({ id: users.id });

  const token = await issueVerificationToken(row.id);
  await sendVerificationEmail(normalized, name, token);

  redirect("/verify?sent=1");
}

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/account");
  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: next,
    });
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes("CredentialsSignin")
        ? "CredentialsSignin"
        : "UnknownError";
    redirect(`/login?error=${message}`);
  }
}
