import { getPricing } from "@/lib/pricing";
import { updatePricingAction } from "@/lib/pricing/actions";
import { PRINT_SIZES } from "@/lib/images/sizes";
import {
  PageHeader,
  Field,
  TextInput,
  PrimaryButton,
  Banner,
} from "@/components/admin/ui";

const PAPER_TYPES = [
  { key: "archival_matte", label: "Archival Matte" },
  { key: "lustre", label: "Lustre" },
  { key: "fine_art_cotton", label: "Fine-Art Cotton Rag" },
] as const;

export const dynamic = "force-dynamic";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;
  const snap = await getPricing();

  return (
    <div>
      <PageHeader
        title="Pricing"
        subtitle="Base price + per-size and per-paper modifiers (cents). Cache TTL is 60s."
      />
      {saved ? <Banner kind="success">Saved.</Banner> : null}
      {error ? <Banner kind="error">Invalid input. Check the form.</Banner> : null}

      <form action={updatePricingAction} className="flex flex-col gap-8">
        <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Base price
          </h2>
          <Field label="Base price (cents)" hint="Applied to every print.">
            <TextInput
              type="number"
              name="basePriceCents"
              min={0}
              defaultValue={snap.basePriceCents}
              required
            />
          </Field>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Size modifiers (cents)
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {PRINT_SIZES.map((size) => (
              <Field key={size} label={size}>
                <TextInput
                  type="number"
                  name={`size_${size}`}
                  defaultValue={snap.sizeModifiers[size] ?? 0}
                />
              </Field>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="mb-4 text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Paper modifiers (cents)
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {PAPER_TYPES.map((paper) => (
              <Field key={paper.key} label={paper.label}>
                <TextInput
                  type="number"
                  name={`paper_${paper.key}`}
                  defaultValue={snap.paperModifiers[paper.key] ?? 0}
                />
              </Field>
            ))}
          </div>
        </section>

        <div className="flex items-center gap-3">
          <PrimaryButton type="submit">Save pricing</PrimaryButton>
          <span className="text-xs text-zinc-500">
            Last updated {new Date(snap.updatedAt).toLocaleString()}
          </span>
        </div>
      </form>
    </div>
  );
}
