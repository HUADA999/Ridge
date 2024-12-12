import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";

import "../globals.css";
import { ContentSecurityPolicy } from "../common/layoutHelper";

export const metadata: Metadata = {
    title: "Ridge AI - Automations",
    description: "Use Automations with Ridge to simplify the process of running repetitive tasks.",
    icons: {
        icon: "/static/assets/icons/ridge_lantern.ico",
        apple: "/static/assets/icons/ridge_lantern_256x256.png",
    },
    openGraph: {
        siteName: "Ridge AI",
        title: "Ridge AI - Automations",
        description:
            "Use Automations with Ridge to simplify the process of running repetitive tasks.",
        url: "https://app.ridge.dev/automations",
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
        <html>
            <ContentSecurityPolicy />
            <body>
                {children}
                <Toaster />
            </body>
        </html>
    );
}
