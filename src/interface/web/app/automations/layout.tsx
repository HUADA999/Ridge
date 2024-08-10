import type { Metadata } from "next";
import { Toaster } from "@/components/ui/toaster";

import "../globals.css";

export const metadata: Metadata = {
    title: "Ridge AI - Automations",
    description: "Use Autoomations with Ridge to simplify the process of running repetitive tasks.",
    icons: {
        icon: "/static/assets/icons/ridge_lantern.ico",
        apple: "/static/assets/icons/ridge_lantern_256x256.png",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div>
            {children}
            <Toaster />
        </div>
    );
}
