import type { Metadata } from "next";
import { noto_sans, noto_sans_arabic } from "@/app/fonts";
import "./globals.css";
import { ContentSecurityPolicy } from "./common/layoutHelper";

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
        <html lang="en" className={`${noto_sans.variable} ${noto_sans_arabic.variable}`}>
            <ContentSecurityPolicy />
            <body>{children}</body>
        </html>
    );
}
