import type { Metadata } from "next";

import "../globals.css";
import { ContentSecurityPolicy } from "../common/layoutHelper";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
    title: "Ridge AI - Search",
    description:
        "Find anything in documents you've shared with Ridge using natural language queries.",
    icons: {
        icon: "/static/assets/icons/ridge_lantern.ico",
        apple: "/static/assets/icons/ridge_lantern_256x256.png",
    },
    openGraph: {
        siteName: "Ridge AI",
        title: "Ridge AI - Search",
        description: "Your Second Brain.",
        url: "https://app.ridge.dev/search",
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
        <html>
            <ContentSecurityPolicy />
            <body>
                {children}
                <Toaster />
            </body>
        </html>
    );
}
