
import type { Metadata } from "next";
import NavMenu from '../components/navMenu/navMenu';
import styles from './agentsLayout.module.css';

import "../globals.css";

export const metadata: Metadata = {
    title: "Ridge AI - Agents",
    description: "Use Agents with Ridge AI for deeper, more personalized queries.",
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
        <div className={`${styles.agentsLayout}`}>
            <NavMenu selected="Agents" showLogo={true} />
            {children}
        </div>
    );
}
