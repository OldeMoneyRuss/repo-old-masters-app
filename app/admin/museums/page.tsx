import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { museums } from "@/db/schema";
import { deleteMuseumAction } from "@/lib/cms/taxonomy-actions";
import {
  PageHeader,
  Table,
  Banner,
  PrimaryButton,
  SecondaryButton,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function MuseumsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string }>;
}) {
  const { saved, deleted } = await searchParams;
  const rows = await db.select().from(museums).orderBy(asc(museums.name));

  return (
    <div>
      <PageHeader
        title="Museums"
        subtitle={`${rows.length} total`}
        action={
          <Link href="/admin/museums/new">
            <PrimaryButton type="button">New museum</PrimaryButton>
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
            <th className="px-4 py-2">Location</th>
            <th className="px-4 py-2"></th>
          </tr>
        }
      >
        {rows.length === 0 ? (
          <tr>
            <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
              No museums yet.
            </td>
          </tr>
        ) : (
          rows.map((m) => (
            <tr key={m.id}>
              <td className="px-4 py-2">
                <Link href={`/admin/museums/${m.id}`} className="underline">
                  {m.name}
                </Link>
              </td>
              <td className="px-4 py-2 font-mono text-xs text-zinc-600">
                {m.slug}
              </td>
              <td className="px-4 py-2 text-zinc-600">
                {[m.city, m.country].filter(Boolean).join(", ") || "—"}
              </td>
              <td className="px-4 py-2 text-right">
                <form action={deleteMuseumAction}>
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
