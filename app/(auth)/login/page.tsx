import Link from "next/link";
import { signInAction } from "@/lib/auth/actions";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = "/account", error } = await searchParams;
  return (
    <div>
      <h1 className="font-serif text-2xl text-zinc-900 dark:text-zinc-50">
        Sign in
      </h1>
      <form action={signInAction} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="next" value={next} />
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Email</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-zinc-700 dark:text-zinc-300">Password</span>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        {error ? (
          <p className="text-sm text-red-600">
            {error === "CredentialsSignin"
              ? "Invalid email or password."
              : "Sign-in failed. Try again."}
          </p>
        ) : null}
        <button
          type="submit"
          className="mt-2 rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          Sign in
        </button>
      </form>
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        No account?{" "}
        <Link href="/register" className="underline">
          Register
        </Link>
      </p>
    </div>
  );
}
