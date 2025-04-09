import type { Metadata } from "next";
import "../globals.css";
import { Toaster } from "@/components/ui/toaster";
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

export default function ChildLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            {children}
            <Toaster />
            <ChatwootWidget />
        </>
    );
}
