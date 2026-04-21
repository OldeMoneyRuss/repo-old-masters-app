import { upsertMuseumAction } from "@/lib/cms/taxonomy-actions";
import { Field, TextInput, PrimaryButton } from "@/components/admin/ui";

type Museum = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  country: string | null;
  externalUrl: string | null;
};

export function MuseumForm({ museum }: { museum?: Museum }) {
  return (
    <form action={upsertMuseumAction} className="flex flex-col gap-4">
      {museum ? <input type="hidden" name="id" value={museum.id} /> : null}
      <Field label="Name" hint="Required.">
        <TextInput name="name" defaultValue={museum?.name ?? ""} required maxLength={200} />
      </Field>
      <Field label="Slug" hint="Auto-derived from name if blank.">
        <TextInput name="slug" defaultValue={museum?.slug ?? ""} maxLength={160} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="City">
          <TextInput name="city" defaultValue={museum?.city ?? ""} maxLength={120} />
        </Field>
        <Field label="Country">
          <TextInput name="country" defaultValue={museum?.country ?? ""} maxLength={120} />
        </Field>
      </div>
      <Field label="External URL" hint="Link to the museum's page for this collection.">
        <TextInput type="url" name="externalUrl" defaultValue={museum?.externalUrl ?? ""} maxLength={500} />
      </Field>
      <div>
        <PrimaryButton type="submit">
          {museum ? "Save changes" : "Create museum"}
        </PrimaryButton>
      </div>
    </form>
  );
}
