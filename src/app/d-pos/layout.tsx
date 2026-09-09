import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bum Bum Cafe - Desktop POS',
  manifest: '/d-pos-manifest.json',
};

export default function DPosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
