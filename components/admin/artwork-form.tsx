import { upsertArtworkAction } from "@/lib/cms/artwork-actions";
import {
  Field,
  TextInput,
  TextArea,
  Select,
  PrimaryButton,
} from "@/components/admin/ui";

type Option = { id: string; name: string };

type Artwork = {
  id: string;
  slug: string;
  title: string;
  artistId: string | null;
  movementId: string | null;
  museumId: string | null;
  yearLabel: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  provenanceNote: string | null;
  subjectTags: string[];
  publishStatus: "draft" | "published" | "archived";
  rightsApproved: boolean;
  sortWeight: number;
  seoTitle: string | null;
  seoDescription: string | null;
};

export function ArtworkForm({
  artwork,
  options,
}: {
  artwork?: Artwork;
  options: { artists: Option[]; movements: Option[]; museums: Option[] };
}) {
  return (
    <form action={upsertArtworkAction} className="flex flex-col gap-4">
      {artwork ? <input type="hidden" name="id" value={artwork.id} /> : null}
      <Field label="Title" hint="Required.">
        <TextInput name="title" defaultValue={artwork?.title ?? ""} required maxLength={300} />
      </Field>
      <Field label="Slug" hint="Auto-derived from title if blank.">
        <TextInput name="slug" defaultValue={artwork?.slug ?? ""} maxLength={200} />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Artist">
          <Select name="artistId" defaultValue={artwork?.artistId ?? ""}>
            <option value="">— none —</option>
            {options.artists.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Movement">
          <Select name="movementId" defaultValue={artwork?.movementId ?? ""}>
            <option value="">— none —</option>
            {options.movements.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Museum / provenance">
          <Select name="museumId" defaultValue={artwork?.museumId ?? ""}>
            <option value="">— none —</option>
            {options.museums.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Year label" hint="e.g. “c. 1665”">
        <TextInput name="yearLabel" defaultValue={artwork?.yearLabel ?? ""} maxLength={80} />
      </Field>

      <Field label="Short description" hint="1–2 sentences for catalog cards.">
        <TextArea
          name="shortDescription"
          rows={3}
          defaultValue={artwork?.shortDescription ?? ""}
        />
      </Field>

      <Field label="Long description">
        <TextArea
          name="longDescription"
          rows={10}
          defaultValue={artwork?.longDescription ?? ""}
        />
      </Field>

      <Field label="Provenance note">
        <TextArea
          name="provenanceNote"
          rows={3}
          defaultValue={artwork?.provenanceNote ?? ""}
        />
      </Field>

      <Field
        label="Subject tags"
        hint="Comma-separated (e.g. portrait, dutch-golden-age, interior)."
      >
        <TextInput
          name="subjectTags"
          defaultValue={artwork?.subjectTags.join(", ") ?? ""}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Publish status">
          <Select name="publishStatus" defaultValue={artwork?.publishStatus ?? "draft"}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </Select>
        </Field>
        <Field
          label="Rights approved"
          hint="Required before publishing (DB-enforced)."
        >
          <label className="mt-1 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="rightsApproved"
              defaultChecked={artwork?.rightsApproved ?? false}
            />
            <span>Cleared for publication</span>
          </label>
        </Field>
        <Field label="Sort weight" hint="Higher = earlier in catalog.">
          <TextInput
            type="number"
            name="sortWeight"
            defaultValue={artwork?.sortWeight ?? 0}
          />
        </Field>
      </div>

      <Field label="SEO title">
        <TextInput name="seoTitle" defaultValue={artwork?.seoTitle ?? ""} maxLength={200} />
      </Field>
      <Field label="SEO description">
        <TextArea name="seoDescription" rows={3} defaultValue={artwork?.seoDescription ?? ""} />
      </Field>

      <div>
        <PrimaryButton type="submit">
          {artwork ? "Save changes" : "Create artwork"}
        </PrimaryButton>
      </div>
    </form>
  );
}
