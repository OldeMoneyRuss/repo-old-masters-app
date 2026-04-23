import { PageHeader, Banner } from "@/components/admin/ui";
import { MovementForm } from "@/components/admin/movement-form";

export const dynamic = "force-dynamic";

export default async function NewMovementPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div>
      <PageHeader title="New movement" />
      {error ? <Banner kind="error">Invalid input.</Banner> : null}
      <MovementForm />
    </div>
  );
}
