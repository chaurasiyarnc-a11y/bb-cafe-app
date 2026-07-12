import { Metadata } from 'next';

export const metadata: Metadata = {
  manifest: '/kitchen-manifest.json',
};

export default function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
