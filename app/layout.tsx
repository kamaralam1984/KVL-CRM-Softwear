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

export const metadata: Metadata = {
  title: "KVl CRM — Enterprise CRM Platform",
  description: "AI-powered enterprise CRM for modern sales teams",
  // Phase 34 — PWA installability. The push/VAPID infra already existed
  // (Phase 17); this was the missing manifest + theme-color wiring.
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "KVl CRM" },
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
      <body className="h-full overflow-hidden"><ToastProvider>{children}</ToastProvider></body>
    </html>
  );
}
