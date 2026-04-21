"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MasterUpload({ artworkId }: { artworkId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("file") as HTMLInputElement | null;
    if (!input?.files?.[0]) {
      setError("Choose a file.");
      return;
    }
    setError(null);
    setBusy(true);
    const data = new FormData();
    data.append("file", input.files[0]);
    try {
      const res = await fetch(`/api/admin/artworks/${artworkId}/upload`, {
        method: "POST",
        body: data,
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        setError(json.error ?? `Upload failed (${res.status})`);
      } else {
        form.reset();
        router.replace(`/admin/artworks/${artworkId}?uploaded=1`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "upload_failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2">
      <input
        type="file"
        name="file"
        accept="image/tiff,image/png,image/jpeg"
        required
        className="text-xs"
      />
      <button
        type="submit"
        disabled={busy}
        className="self-start rounded-full bg-zinc-900 px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {busy ? "Processing…" : "Upload & process"}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <p className="text-xs text-zinc-500">
        TIFF / PNG / JPEG, ≥2400px longest edge, ≤200 MB.
      </p>
    </form>
  );
}
