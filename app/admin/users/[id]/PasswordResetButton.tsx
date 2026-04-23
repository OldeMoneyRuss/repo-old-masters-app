"use client";

import { useState, useTransition } from "react";
import { SecondaryButton } from "@/components/admin/ui";

type Props = { userId: string };

export function PasswordResetButton({ userId }: Props) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function trigger() {
    startTransition(async () => {
      setMessage(null);
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setIsError(true);
        setMessage(body.error ?? "Failed to send reset email.");
      } else {
        setIsError(false);
        setMessage("Password reset email sent.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <SecondaryButton type="button" onClick={trigger} disabled={isPending}>
        {isPending ? "Sending…" : "Send reset email"}
      </SecondaryButton>
      {message && (
        <p className={`text-sm ${isError ? "text-red-700" : "text-emerald-700"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
