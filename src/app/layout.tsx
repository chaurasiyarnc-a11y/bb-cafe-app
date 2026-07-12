import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bb-cafe-app.vercel.app"),
  title: "Bum Bum Cafe | Premium Ordering",
  description: "Luxury Dining Experience at bbcafe.in",
  manifest: "/manifest.json", // === 1. IS LINE KO METADATA ME WAPAS JOD DIYA HAI ===
  openGraph: {
    title: "Bum Bum Cafe | Premium Ordering",
    description: "Luxury Dining Experience at bbcafe.in",
    url: "https://bb-cafe-app.vercel.app",
    siteName: "Bum Bum Cafe",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* === 2. HEAD KE ANDAR SE MANUALLY LINK TAG KO DELETE HI RAKHA HAI === */}
        <meta name="theme-color" content="#ff5e00" />
      </head>
      <body>{children}</body>
    </html>
  );
}
