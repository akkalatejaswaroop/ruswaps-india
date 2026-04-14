import './globals.css';
import type { Metadata } from 'next';
import { ThemeProvider } from '@/context/ThemeContext';
import Script from 'next/script';

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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        {/* DebugBear Real User Monitoring */}
        <Script
          id="debugbear-rum"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){
  var dbpr=100;
  if(Math.random()*100>100-dbpr){
    var d="dbbRum",w=window,o=document,a=addEventListener,scr=o.createElement("script");
    scr.async=!0;
    w[d]=w[d]||[];
    w[d].push(["presampling",dbpr]);
    ["error","unhandledrejection"].forEach(function(t){
      a(t,function(e){w[d].push([t,e]);});
    });
    scr.src="https://cdn.debugbear.com/gPRe7whuL9q4.js";
    o.head.appendChild(scr);
  }
})();`,
          }}
        />
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
