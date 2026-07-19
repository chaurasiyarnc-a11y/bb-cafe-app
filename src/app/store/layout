import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Bum Bum Cafe Godown",
  description: "Stock and Godown Management App for Bum Bum Cafe",
  manifest: "/bbcafehelper_manifest.json", // यह हमारे कस्टम मैनिफ़ेस्ट फ़ाइल को लिंक करेगा
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BumBumCafe",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF6B00",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// चूंकि यह एक नेस्टेड लेआउट है, इसलिए इसमें <html> या <body> टैग की आवश्यकता नहीं होती
export default function BbCafeHelperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
