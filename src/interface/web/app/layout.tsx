import type { Metadata } from "next";
import { noto_sans, noto_sans_arabic } from "@/app/fonts";
import "./globals.css";
import { ContentSecurityPolicy } from "./common/layoutHelper";
import { ThemeProvider } from "./components/providers/themeProvider";

export const metadata: Metadata = {
    title: "Ridge AI - Ask Anything",
    description:
        "Ridge is a personal research assistant. It helps you understand better and create faster.",
    icons: {
        icon: "/static/assets/icons/ridge_lantern.ico",
        apple: "/static/assets/icons/ridge_lantern_256x256.png",
    },
    manifest: "/static/ridge.webmanifest",
    keywords:
        "research assistant, productivity, AI, Ridge, open source, model agnostic, research, productivity tool, personal assistant, personal research assistant, personal productivity assistant",
    openGraph: {
        siteName: "Ridge AI",
        title: "Ridge AI",
        description:
            "Ridge is a personal research assistant. It helps you understand better and create faster.",
        url: "https://app.ridge.dev",
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
                </ThemeProvider>
            </body>
        </html>
    );
}
