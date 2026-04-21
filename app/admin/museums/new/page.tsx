import { PageHeader, Banner } from "@/components/admin/ui";
import { MuseumForm } from "@/components/admin/museum-form";

export const dynamic = "force-dynamic";

export default async function NewMuseumPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div>
      <PageHeader title="New museum" />
      {error ? <Banner kind="error">Invalid input.</Banner> : null}
      <MuseumForm />
    </div>
  );
}
