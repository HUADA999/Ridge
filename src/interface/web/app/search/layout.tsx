import type { Metadata } from "next";

import "../globals.css";

export const metadata: Metadata = {
    title: "Ridge AI - Search",
    description:
        "Find anything in documents you've shared with Ridge using natural language queries.",
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
    return <div>{children}</div>;
}
