import type { Metadata } from "next";
import { Noto_Sans } from "next/font/google";
import "./globals.css";

const inter = Noto_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Ridge AI - Home",
    description: "Your Second Brain.",
    icons: {
        icon: "/static/assets/icons/ridge_lantern.ico",
        apple: "/static/assets/icons/ridge_lantern_256x256.png",
    },
    manifest: "/static/ridge.webmanifest",
    openGraph: {
        siteName: "Ridge AI",
        title: "Ridge AI",
        description: "Your Second Brain.",
        url: "https://app.ridge.dev",
        type: "website",
        images: [
            {
                url: "https://assets.ridge.dev/ridge_lantern_256x256.png",
                width: 256,
                height: 256,
            },
            {
                url: "https://assets.ridge.dev/ridge_lantern_logomarktype_1200x630.png",
                width: 1200,
                height: 630,
            },
        ],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            {/* <meta
                httpEquiv="Content-Security-Policy"
                content="default-src 'self' https://assets.ridge.dev;
                       media-src * blob:;
                       script-src 'self' https://assets.ridge.dev 'unsafe-inline' 'unsafe-eval';
                       connect-src 'self' blob: https://ipapi.co/json ws://localhost:42110;
                       style-src 'self' https://assets.ridge.dev 'unsafe-inline' https://fonts.googleapis.com;
                       img-src 'self' data: blob: https://*.ridge.dev https://*.googleusercontent.com https://*.google.com/ https://*.gstatic.com;
                       font-src 'self' https://assets.ridge.dev https://fonts.gstatic.com;
                       child-src 'none';
                       object-src 'none';"
            ></meta> */}
            <body className={inter.className}>{children}</body>
        </html>
    );
}
