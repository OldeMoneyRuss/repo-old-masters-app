import { PageHeader, Banner } from "@/components/admin/ui";
import { ArtworkForm } from "@/components/admin/artwork-form";
import { listTaxonomies } from "@/lib/cms/artwork-actions";

export const dynamic = "force-dynamic";

export default async function NewArtworkPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const options = await listTaxonomies();
  return (
    <div>
      <PageHeader
        title="New artwork"
        subtitle="Create the record first. You can upload the master image on the edit page."
      />
      {error === "invalid" ? <Banner kind="error">Invalid input.</Banner> : null}
      {error === "rights_required" ? (
        <Banner kind="error">
          Rights must be approved before an artwork can be published.
        </Banner>
      ) : null}
      <ArtworkForm options={options} />
    </div>
  );
}
