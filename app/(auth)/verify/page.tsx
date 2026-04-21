import Link from "next/link";
import { consumeVerificationToken } from "@/lib/auth/verification";

export const metadata = { title: "Verify email" };

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token
    ? await consumeVerificationToken(token)
    : { ok: false as const, reason: "missing" };

  return (
    <div>
      <h1 className="font-serif text-2xl text-zinc-900 dark:text-zinc-50">
        Verify email
      </h1>
      {result.ok ? (
        <p className="mt-4 text-sm text-zinc-700 dark:text-zinc-300">
          Your email is verified. You can now{" "}
          <Link href="/login" className="underline">
            sign in
          </Link>
          .
        </p>
      ) : (
        <p className="mt-4 text-sm text-red-600">
          That verification link is invalid or expired. Please request a new
          one from the{" "}
          <Link href="/login" className="underline">
            sign-in page
          </Link>
          .
        </p>
      )}
    </div>
  );
}
