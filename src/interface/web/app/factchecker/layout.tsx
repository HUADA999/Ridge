import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Ridge AI - Fact Checker",
    description: "Use the Fact Checker with Ridge AI for verifying statements. It can research the internet for you, either refuting or confirming the statement using fresh data.",
    icons: {
        icon: '/static/favicon.ico',
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
        </div>
    );
}
