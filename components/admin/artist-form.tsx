import { upsertArtistAction } from "@/lib/cms/taxonomy-actions";
import {
  Field,
  TextInput,
  TextArea,
  PrimaryButton,
} from "@/components/admin/ui";

type Artist = {
  id: string;
  slug: string;
  name: string;
  bio: string | null;
  birthYear: number | null;
  deathYear: number | null;
  nationality: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

export function ArtistForm({ artist }: { artist?: Artist }) {
  return (
    <form action={upsertArtistAction} className="flex flex-col gap-4">
      {artist ? <input type="hidden" name="id" value={artist.id} /> : null}
      <Field label="Name" hint="Required.">
        <TextInput name="name" defaultValue={artist?.name ?? ""} required maxLength={200} />
      </Field>
      <Field label="Slug" hint="Auto-derived from name if blank.">
        <TextInput name="slug" defaultValue={artist?.slug ?? ""} maxLength={160} />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Birth year">
          <TextInput
            type="number"
            name="birthYear"
            defaultValue={artist?.birthYear ?? ""}
          />
        </Field>
        <Field label="Death year">
          <TextInput
            type="number"
            name="deathYear"
            defaultValue={artist?.deathYear ?? ""}
          />
        </Field>
      </div>
      <Field label="Nationality">
        <TextInput name="nationality" defaultValue={artist?.nationality ?? ""} maxLength={100} />
      </Field>
      <Field label="Bio">
        <TextArea name="bio" rows={6} defaultValue={artist?.bio ?? ""} />
      </Field>
      <Field label="SEO title">
        <TextInput name="seoTitle" defaultValue={artist?.seoTitle ?? ""} maxLength={200} />
      </Field>
      <Field label="SEO description">
        <TextArea name="seoDescription" rows={3} defaultValue={artist?.seoDescription ?? ""} />
      </Field>
      <div>
        <PrimaryButton type="submit">
          {artist ? "Save changes" : "Create artist"}
        </PrimaryButton>
      </div>
    </form>
  );
}
