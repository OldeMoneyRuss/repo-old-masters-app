"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select, PrimaryButton } from "@/components/admin/ui";

const ROLES = ["customer", "admin", "super_admin"] as const;

type Props = {
  userId: string;
  currentRole: string;
};

export function UserRoleForm({ userId, currentRole }: Props) {
  const router = useRouter();
  const [role, setRole] = useState(currentRole);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    if (role === currentRole) return;
    setError(null);
    setSaved(false);
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to update role.");
      return;
    }
    setSaved(true);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      {error && (
        <p className="w-full text-sm text-red-700">{error}</p>
      )}
      {saved && (
        <p className="w-full text-sm text-emerald-700">Role updated.</p>
      )}
      <Select value={role} onChange={(e) => setRole(e.target.value)}>
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r.replace(/_/g, " ")}
          </option>
        ))}
      </Select>
      <PrimaryButton type="button" onClick={save} disabled={isPending || role === currentRole}>
        {isPending ? "Saving…" : "Save role"}
      </PrimaryButton>
    </div>
  );
}
