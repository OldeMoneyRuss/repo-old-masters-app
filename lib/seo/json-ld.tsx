type JsonLdObject = Record<string, unknown>;

// JSON-LD is server-rendered structured data from our own DB — not user HTML.
export function JsonLd({ data }: { data: JsonLdObject }) {
  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function artworkProductJsonLd({
  title,
  artistName,
  description,
  imageUrl,
  pageUrl,
  basePriceCents,
}: {
  title: string;
  artistName: string | null;
  description: string | null;
  imageUrl: string | null;
  pageUrl: string;
  basePriceCents: number;
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: title,
    ...(description ? { description } : {}),
    ...(artistName ? { brand: { "@type": "Person", name: artistName } } : {}),
    ...(imageUrl ? { image: imageUrl } : {}),
    url: pageUrl,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: (basePriceCents / 100).toFixed(2),
      offerCount: 6,
      availability: "https://schema.org/InStock",
    },
  };
}

export function breadcrumbJsonLd(
  items: Array<{ name: string; url: string }>,
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
