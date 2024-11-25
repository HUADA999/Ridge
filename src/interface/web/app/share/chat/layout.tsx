import type { Metadata } from "next";
import { noto_sans, noto_sans_arabic } from "@/app/fonts";
import "../../globals.css";

export const metadata: Metadata = {
    title: "Ridge AI - Chat",
    description: "Use this page to view a chat with Ridge AI.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`${noto_sans.variable} ${noto_sans_arabic.variable}`}>
            <meta
                httpEquiv="Content-Security-Policy"
                content="default-src 'self' https://assets.ridge.dev;
                       script-src 'self' https://assets.ridge.dev 'unsafe-inline' 'unsafe-eval';
                       connect-src 'self' blob: https://ipapi.co/json ws://localhost:42110;
                       style-src 'self' https://assets.ridge.dev 'unsafe-inline' https://fonts.googleapis.com;
                       img-src 'self' data: blob: https://*.ridge.dev https://*.googleusercontent.com https://*.google.com/ https://*.gstatic.com;
                       font-src 'self' https://assets.ridge.dev https://fonts.gstatic.com;
                       child-src 'none';
                       object-src 'none';"
            ></meta>
            <body>
                {children}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `window.EXCALIDRAW_ASSET_PATH = 'https://assets.ridge.dev/@excalidraw/excalidraw/dist/';`,
                    }}
                />
            </body>
        </html>
    );
}
