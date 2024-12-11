import type { Metadata } from "next";
import { noto_sans, noto_sans_arabic } from "@/app/fonts";
import "../globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ContentSecurityPolicy } from "../common/layoutHelper";
import { ChatwootWidget } from "../components/chatWoot/ChatwootWidget";

export const metadata: Metadata = {
    title: "Ridge AI - Settings",
    description: "Configure Ridge to get personalized, deeper assistance.",
    icons: {
        icon: "/static/assets/icons/ridge_lantern.ico",
        apple: "/static/assets/icons/ridge_lantern_256x256.png",
    },
    openGraph: {
        siteName: "Ridge AI",
        title: "Ridge AI - Settings",
        description: "Your Second Brain.",
        url: "https://app.ridge.dev/settings",
        type: "website",
        images: [
            {
                url: "https://assets.ridge.dev/ridge_lantern_256x256.png",
                width: 256,
                height: 256,
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
            <body>
                {children}
                <Toaster />
                <ChatwootWidget />
            </body>
        </html>
    );
}
