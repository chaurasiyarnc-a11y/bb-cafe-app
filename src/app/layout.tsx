import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // metadataBase डालना बहुत ज़रूरी है ताकि Next.js आपकी opengraph-image.jpg को ढूंढ सके
  metadataBase: new URL("https://bb-cafe-app.vercel.app"), 
  title: "Bum Bum Cafe | Premium Ordering",
  description: "Luxury Dining Experience at bbcafe.in",
  openGraph: {
    title: "Bum Bum Cafe | Premium Ordering",
    description: "Luxury Dining Experience at bbcafe.in",
    url: "https://bb-cafe-app.vercel.app",
    siteName: "Bum Bum Cafe",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bum Bum Cafe | Premium Ordering",
    description: "Luxury Dining Experience at bbcafe.in",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
