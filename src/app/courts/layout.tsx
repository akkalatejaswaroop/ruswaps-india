import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'eCourts AP | Ruswaps',
  description: 'Court records synced daily from eCourts India - Andhra Pradesh',
};

export default function CourtsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
