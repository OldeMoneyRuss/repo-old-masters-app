import { Resend } from "resend";
import VerificationEmail from "@/emails/VerificationEmail";

const FROM = "Old Masters Print Shop <no-reply@oldmastersprintshop.com>";

function client(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  return new Resend(apiKey);
}

function appUrl(path: string): string {
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  return new URL(path, base).toString();
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(
      `[email:dev] Skipping verification email. Link: ${appUrl(
        `/verify?token=${token}`,
      )}`,
    );
    return;
  }
  await client().emails.send({
    from: FROM,
    to,
    subject: "Verify your email",
    react: VerificationEmail({
      name,
      verifyUrl: appUrl(`/verify?token=${token}`),
    }),
  });
}
