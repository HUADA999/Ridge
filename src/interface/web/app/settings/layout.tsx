import type { Metadata } from "next";
import { noto_sans, noto_sans_arabic } from "@/app/fonts";
import "../globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ContentSecurityPolicy } from "../common/layoutHelper";
import { ChatwootWidget } from "../components/chatWoot/ChatwootWidget";
import { ThemeProvider } from "../components/providers/themeProvider";

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
        description: "Setup, configure, and personalize Ridge, your AI research assistant.",
        url: "https://app.ridge.dev/settings",
        type: "website",
        images: [
            {
                url: "https://assets.ridge.dev/ridge_hero.png",
                width: 940,
                height: 525,
            },
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
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            try {
                                if (localStorage.getItem('theme') === 'dark' ||
                                    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                                    document.documentElement.classList.add('dark');
                                }
                            } catch (e) {}
                        `,
                    }}
                />
            </head>
            <ContentSecurityPolicy />
            <body>
                <ThemeProvider>
                    {children}
                    <Toaster />
                    <ChatwootWidget />
                </ThemeProvider>
            </body>
        </html>
    );
}
