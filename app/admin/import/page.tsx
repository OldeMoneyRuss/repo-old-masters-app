import { PageHeader } from "@/components/admin/ui";
import { ImportForm } from "@/components/admin/import-form";

export const dynamic = "force-dynamic";

const SAMPLE = [
  "title,slug,artist_slug,movement_slug,museum_slug,year_label,short_description,publish_status,rights_approved,sort_weight",
  '"View of Delft",view-of-delft,johannes-vermeer,dutch-golden-age,mauritshuis,"c. 1660-1661","A luminous cityscape of Delft from across the Schie.",draft,true,0',
].join("\n");

export default function ImportPage() {
  return (
    <div>
      <PageHeader
        title="Bulk CSV import"
        subtitle="Upload a CSV to create or update artworks in bulk. Matches existing records by slug."
      />

      <section className="mb-8 rounded-lg border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-2 font-medium">Accepted columns</h2>
        <p className="mb-3 text-zinc-600">
          Header row required (case-insensitive). Unknown columns are ignored. Taxonomy
          columns (<code>artist_slug</code>, <code>movement_slug</code>, <code>museum_slug</code>)
          must reference existing records. Rows with{" "}
          <code>publish_status=published</code> require{" "}
          <code>rights_approved=true</code>.
        </p>
        <pre className="overflow-x-auto rounded bg-zinc-100 p-3 text-xs dark:bg-zinc-900">
{SAMPLE}
        </pre>
      </section>

      <ImportForm />
    </div>
  );
}
