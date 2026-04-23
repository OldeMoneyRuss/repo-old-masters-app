import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { museums } from "@/db/schema";
import { PageHeader, Banner } from "@/components/admin/ui";
import { MuseumForm } from "@/components/admin/museum-form";

export const dynamic = "force-dynamic";

export default async function EditMuseumPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const [row] = await db.select().from(museums).where(eq(museums.id, id)).limit(1);
  if (!row) notFound();
  return (
    <div>
      <PageHeader title={`Edit · ${row.name}`} subtitle={`Slug: ${row.slug}`} />
      {error ? <Banner kind="error">Invalid input.</Banner> : null}
      <MuseumForm museum={row} />
    </div>
  );
}
