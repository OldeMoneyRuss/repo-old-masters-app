import type { Metadata } from "next";
import { Cormorant_Garamond, EB_Garamond, Jost } from "next/font/google";
import { GtagScript } from "@/components/analytics/GtagScript";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://oldmastersprint.shop";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Old Masters Print Shop",
    template: "%s | Old Masters Print Shop",
  },
  description:
    "Museum-quality giclée prints of the Old Masters, sourced from public-domain and rights-cleared originals.",
  openGraph: {
    type: "website",
    siteName: "Old Masters Print Shop",
    title: "Old Masters Print Shop",
    description:
      "Museum-quality giclée prints of the Old Masters. Archival papers, pigment inks, worldwide shipping.",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "Old Masters Print Shop",
    description:
      "Museum-quality giclée prints of the Old Masters. Archival papers, pigment inks, worldwide shipping.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${ebGaramond.variable} ${jost.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <GtagScript />
        {children}
      </body>
    </html>
  );
}
