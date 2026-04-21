"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  runCsvImportAction,
  type ImportReport,
} from "@/lib/cms/csv-import";

export function ImportForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [report, setReport] = useState<ImportReport | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await runCsvImportAction(data);
      setReport(r);
      router.refresh();
    });
  }

  return (
    <div>
      <form onSubmit={onSubmit} className="mb-6 flex flex-col gap-3">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="self-start rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {pending ? "Importing…" : "Upload & import"}
        </button>
      </form>

      {report ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <p className="mb-2 font-medium">
            {report.ok ? "Import complete." : "Import completed with errors."}
          </p>
          <ul className="mb-3 text-zinc-700 dark:text-zinc-300">
            <li>Processed: {report.processed}</li>
            <li>Created: {report.created}</li>
            <li>Updated: {report.updated}</li>
            <li>Skipped: {report.skipped}</li>
          </ul>
          {report.errors.length ? (
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500">
                Errors
              </p>
              <ul className="max-h-64 overflow-auto rounded bg-zinc-50 p-3 text-xs dark:bg-zinc-900">
                {report.errors.map((e, i) => (
                  <li key={i} className="font-mono">
                    Row {e.row}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
