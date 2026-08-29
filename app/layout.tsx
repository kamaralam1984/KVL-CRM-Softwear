import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/crm/ToastSystem";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = "https://maxness.kvlbusinesssolutions.com";
const SITE_DESCRIPTION =
  "Maxness is an AI-powered enterprise CRM that unifies sales, marketing, customer success, finance, and automation for modern revenue teams.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Maxness — Enterprise CRM Platform",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Maxness — Enterprise CRM Platform",
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: "Maxness",
    type: "website",
    images: [{ url: "/kvl-logo-trans.png" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Maxness — Enterprise CRM Platform",
    description: SITE_DESCRIPTION,
    images: ["/kvl-logo-trans.png"],
  },
  // Phase 34 — PWA installability. The push/VAPID infra already existed
  // (Phase 17); this was the missing manifest + theme-color wiring.
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Maxness" },
};

// Server-rendered regardless of app/page.tsx being a client component — the
// AI Website Analyzer's SEO check (and real search engines) see this even
// though the SPA body below only fills in after hydration.
const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Maxness",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: SITE_DESCRIPTION,
  url: SITE_URL,
};

export const viewport: Viewport = {
  themeColor: "#080c14",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
        />
      </head>
      <body className="h-full overflow-hidden"><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
