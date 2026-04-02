import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Ruswaps - MVA & EC Claims Calculator',
  description: 'India\'s First Web App for Motor Vehicle Accident Claims Compensation & Disability Calculations. Calculate accident claims, employee compensation, disability benefits and more.',
  keywords: 'MVA claims, accident compensation, disability calculator, employee compensation, hit and run claims, legal calculator, court compensation calculator',
  metadataBase: new URL('https://ruswaps.in'),
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Ruswaps - MVA & EC Claims Calculator',
    description: 'India\'s First Web App for Motor Vehicle Accident Claims Compensation & Disability Calculations',
    type: 'website',
    siteName: 'Ruswaps',
    url: 'https://ruswaps.in',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
