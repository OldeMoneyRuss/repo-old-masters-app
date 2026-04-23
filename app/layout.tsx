import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { GtagScript } from "@/components/analytics/GtagScript";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <GtagScript />
        {children}
      </body>
    </html>
  );
}
