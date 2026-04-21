import { PageHeader, Banner } from "@/components/admin/ui";
import { ArtistForm } from "@/components/admin/artist-form";

export const dynamic = "force-dynamic";

export default async function NewArtistPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div>
      <PageHeader title="New artist" />
      {error ? <Banner kind="error">Invalid input.</Banner> : null}
      <ArtistForm />
    </div>
  );
}
