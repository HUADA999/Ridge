import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";

const inter = Noto_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Ridge AI - Home",
    description: "Your open, personal AI.",
    icons: {
        icon: '/static/favicon.ico',
    },
    manifest: '/static/ridge.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <meta httpEquiv="Content-Security-Policy"
        content="default-src 'self' https://assets.ridge.dev;
                       media-src * blob:;
                       script-src 'self' https://assets.ridge.dev 'unsafe-inline' 'unsafe-eval';
                       connect-src 'self' https://ipapi.co/json ws://localhost:42110;
                       style-src 'self' https://assets.ridge.dev 'unsafe-inline' https://fonts.googleapis.com;
                       img-src 'self' data: https://*.ridge.dev https://*.googleusercontent.com https://*.google.com/ https://*.gstatic.com;
                       font-src 'self' https://assets.ridge.dev https://fonts.gstatic.com;
                       child-src 'none';
                       object-src 'none';"></meta>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
