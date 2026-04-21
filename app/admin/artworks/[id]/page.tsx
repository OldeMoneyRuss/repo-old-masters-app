import { notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { artworks, assets, artworkSizeEligibility } from "@/db/schema";
import { PageHeader, Banner } from "@/components/admin/ui";
import { ArtworkForm } from "@/components/admin/artwork-form";
import { listTaxonomies } from "@/lib/cms/artwork-actions";
import { MasterUpload } from "@/components/admin/master-upload";

export const dynamic = "force-dynamic";

export default async function EditArtworkPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string; uploaded?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const [row] = await db.select().from(artworks).where(eq(artworks.id, id)).limit(1);
  if (!row) notFound();

  const [options, assetRows, eligibilityRows] = await Promise.all([
    listTaxonomies(),
    db.select().from(assets).where(eq(assets.artworkId, id)),
    db
      .select()
      .from(artworkSizeEligibility)
      .where(eq(artworkSizeEligibility.artworkId, id))
      .orderBy(asc(artworkSizeEligibility.printSize)),
  ]);

  const master = assetRows.find((a) => a.kind === "master");

  return (
    <div>
      <PageHeader
        title={`Edit · ${row.title}`}
        subtitle={`Slug: ${row.slug} · Status: ${row.publishStatus}`}
      />
      {sp.saved ? <Banner kind="success">Saved.</Banner> : null}
      {sp.uploaded ? <Banner kind="success">Image uploaded and processed.</Banner> : null}
      {sp.error === "invalid" ? <Banner kind="error">Invalid input.</Banner> : null}
      {sp.error === "rights_required" ? (
        <Banner kind="error">
          Rights must be approved before an artwork can be published.
        </Banner>
      ) : null}

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ArtworkForm artwork={row} options={options} />
        </div>
        <aside className="flex flex-col gap-6">
          <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-2 text-sm font-medium">Master image</h2>
            {master ? (
              <div className="mb-3 text-xs text-zinc-600">
                <div>{master.widthPx} × {master.heightPx}px</div>
                <div>{Math.round(master.sizeBytes / 1024)} KB · {master.mimeType}</div>
                {master.sha256 ? (
                  <div className="mt-1 font-mono break-all">{master.sha256.slice(0, 16)}…</div>
                ) : null}
              </div>
            ) : (
              <p className="mb-3 text-xs text-zinc-500">No master uploaded yet.</p>
            )}
            <MasterUpload artworkId={id} />
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="mb-2 text-sm font-medium">Print-size eligibility</h2>
            {eligibilityRows.length === 0 ? (
              <p className="text-xs text-zinc-500">Upload a master image to compute.</p>
            ) : (
              <ul className="text-xs">
                {eligibilityRows.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between border-b border-zinc-100 py-1.5 last:border-0 dark:border-zinc-800"
                  >
                    <span className="font-mono">{e.printSize}</span>
                    <span className="text-zinc-600">{e.dpi} DPI</span>
                    <span className={e.eligible ? "text-emerald-700" : "text-red-700"}>
                      {e.eligible ? "eligible" : "below 240"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
