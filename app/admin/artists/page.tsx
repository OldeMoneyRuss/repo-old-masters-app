import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { artists } from "@/db/schema";
import { deleteArtistAction } from "@/lib/cms/taxonomy-actions";
import {
  PageHeader,
  Table,
  Banner,
  PrimaryButton,
  SecondaryButton,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string }>;
}) {
  const { saved, deleted } = await searchParams;
  const rows = await db.select().from(artists).orderBy(asc(artists.name));

  return (
    <div>
      <PageHeader
        title="Artists"
        subtitle={`${rows.length} total`}
        action={
          <Link href="/admin/artists/new">
            <PrimaryButton type="button">New artist</PrimaryButton>
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
            <th className="px-4 py-2">Years</th>
            <th className="px-4 py-2">Nationality</th>
            <th className="px-4 py-2"></th>
          </tr>
        }
      >
        {rows.length === 0 ? (
          <tr>
            <td colSpan={5} className="px-4 py-6 text-center text-zinc-500">
              No artists yet.
            </td>
          </tr>
        ) : (
          rows.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-2">
                <Link href={`/admin/artists/${a.id}`} className="underline">
                  {a.name}
                </Link>
              </td>
              <td className="px-4 py-2 font-mono text-xs text-zinc-600">
                {a.slug}
              </td>
              <td className="px-4 py-2 text-zinc-600">
                {a.birthYear ?? "?"}–{a.deathYear ?? "?"}
              </td>
              <td className="px-4 py-2 text-zinc-600">{a.nationality ?? "—"}</td>
              <td className="px-4 py-2 text-right">
                <form action={deleteArtistAction}>
                  <input type="hidden" name="id" value={a.id} />
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
