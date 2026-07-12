import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Isme koi manifest link nahi hona chahiye */}
        <meta name="theme-color" content="#ff5e00" />
      </head>
      <body>{children}</body>
    </html>
  );
}
