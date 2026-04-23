import { upsertMovementAction } from "@/lib/cms/taxonomy-actions";
import {
  Field,
  TextInput,
  TextArea,
  PrimaryButton,
} from "@/components/admin/ui";

type Movement = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  dateRangeLabel: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

export function MovementForm({ movement }: { movement?: Movement }) {
  return (
    <form action={upsertMovementAction} className="flex flex-col gap-4">
      {movement ? <input type="hidden" name="id" value={movement.id} /> : null}
      <Field label="Name" hint="Required.">
        <TextInput name="name" defaultValue={movement?.name ?? ""} required maxLength={200} />
      </Field>
      <Field label="Slug" hint="Auto-derived from name if blank.">
        <TextInput name="slug" defaultValue={movement?.slug ?? ""} maxLength={160} />
      </Field>
      <Field label="Date range label" hint="e.g. “c. 1780–1830”">
        <TextInput name="dateRangeLabel" defaultValue={movement?.dateRangeLabel ?? ""} maxLength={100} />
      </Field>
      <Field label="Description">
        <TextArea name="description" rows={6} defaultValue={movement?.description ?? ""} />
      </Field>
      <Field label="SEO title">
        <TextInput name="seoTitle" defaultValue={movement?.seoTitle ?? ""} maxLength={200} />
      </Field>
      <Field label="SEO description">
        <TextArea name="seoDescription" rows={3} defaultValue={movement?.seoDescription ?? ""} />
      </Field>
      <div>
        <PrimaryButton type="submit">
          {movement ? "Save changes" : "Create movement"}
        </PrimaryButton>
      </div>
    </form>
  );
}
