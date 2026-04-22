import { Resend } from "resend";
import VerificationEmail from "@/emails/VerificationEmail";
import OrderConfirmationEmail, {
  type OrderConfirmationEmailProps,
} from "@/emails/OrderConfirmationEmail";
import ShippedEmail, { type ShippedEmailProps } from "@/emails/ShippedEmail";
import CancellationEmail, {
  type CancellationEmailProps,
} from "@/emails/CancellationEmail";
import PasswordResetEmail from "@/emails/PasswordResetEmail";

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

export async function sendOrderConfirmationEmail(
  to: string,
  props: OrderConfirmationEmailProps,
): Promise<void> {
  const subject = `Order confirmed — #${props.orderNumber}`;
  if (!process.env.RESEND_API_KEY) {
    console.warn(
      `[email:dev] Skipping order confirmation email for #${props.orderNumber} to ${to}.`,
    );
    return;
  }
  await client().emails.send({
    from: FROM,
    to,
    subject,
    react: OrderConfirmationEmail(props),
  });
}

export async function sendShippedEmail(
  to: string,
  props: ShippedEmailProps,
): Promise<void> {
  const subject = `Your order #${props.orderNumber} has shipped`;
  if (!process.env.RESEND_API_KEY) {
    console.warn(
      `[email:dev] Skipping shipped email for #${props.orderNumber} to ${to}. Tracking: ${props.trackingCarrier} ${props.trackingNumber}`,
    );
    return;
  }
  await client().emails.send({
    from: FROM,
    to,
    subject,
    react: ShippedEmail(props),
  });
}

export async function sendCancellationEmail(
  to: string,
  props: CancellationEmailProps,
): Promise<void> {
  const subject = `Your order #${props.orderNumber} has been cancelled`;
  if (!process.env.RESEND_API_KEY) {
    console.warn(
      `[email:dev] Skipping cancellation email for #${props.orderNumber} to ${to}.`,
    );
    return;
  }
  await client().emails.send({
    from: FROM,
    to,
    subject,
    react: CancellationEmail(props),
  });
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  const resetUrl = appUrl(`/reset-password?token=${token}`);
  if (!process.env.RESEND_API_KEY) {
    console.warn(
      `[email:dev] Skipping password reset email. Link: ${resetUrl}`,
    );
    return;
  }
  await client().emails.send({
    from: FROM,
    to,
    subject: "Reset your password",
    react: PasswordResetEmail({ name, resetUrl }),
  });
}
