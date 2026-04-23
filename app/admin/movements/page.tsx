import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { movements } from "@/db/schema";
import { deleteMovementAction } from "@/lib/cms/taxonomy-actions";
import {
  PageHeader,
  Table,
  Banner,
  PrimaryButton,
  SecondaryButton,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string }>;
}) {
  const { saved, deleted } = await searchParams;
  const rows = await db.select().from(movements).orderBy(asc(movements.name));

  return (
    <div>
      <PageHeader
        title="Movements"
        subtitle={`${rows.length} total`}
        action={
          <Link href="/admin/movements/new">
            <PrimaryButton type="button">New movement</PrimaryButton>
          </Link>
        }
      />
      {saved ? <Banner kind="success">Saved.</Banner> : null}
      {deleted ? <Banner kind="info">Deleted.</Banner> : null}

      <Table
        head={
          <tr>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2">Slug</th>
            <th className="px-4 py-2">Date range</th>
            <th className="px-4 py-2"></th>
          </tr>
        }
      >
        {rows.length === 0 ? (
          <tr>
            <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
              No movements yet.
            </td>
          </tr>
        ) : (
          rows.map((m) => (
            <tr key={m.id}>
              <td className="px-4 py-2">
                <Link href={`/admin/movements/${m.id}`} className="underline">
                  {m.name}
                </Link>
              </td>
              <td className="px-4 py-2 font-mono text-xs text-zinc-600">
                {m.slug}
              </td>
              <td className="px-4 py-2 text-zinc-600">{m.dateRangeLabel ?? "—"}</td>
              <td className="px-4 py-2 text-right">
                <form action={deleteMovementAction}>
                  <input type="hidden" name="id" value={m.id} />
                  <SecondaryButton type="submit">Delete</SecondaryButton>
                </form>
              </td>
            </tr>
          ))
        )}
      </Table>
    </div>
  );
}
