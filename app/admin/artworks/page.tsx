import Link from "next/link";
import { desc, eq, ilike, or, and, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { artworks, artists } from "@/db/schema";
import { deleteArtworkAction } from "@/lib/cms/artwork-actions";
import {
  PageHeader,
  Table,
  Banner,
  PrimaryButton,
  SecondaryButton,
  TextInput,
  Select,
} from "@/components/admin/ui";

export const dynamic = "force-dynamic";

type Status = "all" | "draft" | "published" | "archived";

export default async function ArtworksPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: Status;
    saved?: string;
    deleted?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status: Status = (sp.status as Status) ?? "all";

  const filters: SQL[] = [];
  if (q) {
    filters.push(or(ilike(artworks.title, `%${q}%`), ilike(artworks.slug, `%${q}%`))!);
  }
  if (status !== "all") {
    filters.push(eq(artworks.publishStatus, status));
  }

  const where = filters.length ? and(...filters) : undefined;

  const rows = await db
    .select({
      id: artworks.id,
      title: artworks.title,
      slug: artworks.slug,
      publishStatus: artworks.publishStatus,
      rightsApproved: artworks.rightsApproved,
      updatedAt: artworks.updatedAt,
      artistName: artists.name,
    })
    .from(artworks)
    .leftJoin(artists, eq(artists.id, artworks.artistId))
    .where(where)
    .orderBy(desc(artworks.updatedAt))
    .limit(100);

  return (
    <div>
      <PageHeader
        title="Artworks"
        subtitle={`${rows.length} shown${q || status !== "all" ? " (filtered)" : ""}`}
        action={
          <Link href="/admin/artworks/new">
            <PrimaryButton type="button">New artwork</PrimaryButton>
          </Link>
        }
      />

      {sp.saved ? <Banner kind="success">Saved.</Banner> : null}
      {sp.deleted ? <Banner kind="info">Deleted.</Banner> : null}

      <form className="mb-6 flex flex-wrap items-end gap-3" method="get">
        <div>
          <label className="text-xs uppercase tracking-wide text-zinc-500">Search</label>
          <TextInput name="q" defaultValue={q} placeholder="Title or slug" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-zinc-500">Status</label>
          <Select name="status" defaultValue={status}>
            <option value="all">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </Select>
        </div>
        <SecondaryButton type="submit">Filter</SecondaryButton>
      </form>

      <Table
        head={
          <tr>
            <th className="px-4 py-2">Title</th>
            <th className="px-4 py-2">Artist</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Rights</th>
            <th className="px-4 py-2">Updated</th>
            <th className="px-4 py-2"></th>
          </tr>
        }
      >
        {rows.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
              No artworks match.
            </td>
          </tr>
        ) : (
          rows.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-2">
                <Link href={`/admin/artworks/${a.id}`} className="underline">
                  {a.title}
                </Link>
                <div className="font-mono text-xs text-zinc-500">{a.slug}</div>
              </td>
              <td className="px-4 py-2 text-zinc-600">{a.artistName ?? "—"}</td>
              <td className="px-4 py-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs ${
                    a.publishStatus === "published"
                      ? "bg-emerald-100 text-emerald-800"
                      : a.publishStatus === "archived"
                        ? "bg-zinc-200 text-zinc-700"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {a.publishStatus}
                </span>
              </td>
              <td className="px-4 py-2 text-zinc-600">
                {a.rightsApproved ? "✓" : "—"}
              </td>
              <td className="px-4 py-2 text-xs text-zinc-500">
                {new Date(a.updatedAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-2 text-right">
                <form action={deleteArtworkAction}>
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
