export function ContentSecurityPolicy() {
    return (
        <meta
            httpEquiv="Content-Security-Policy"
            content="default-src 'self' https://assets.ridge.dev;
               media-src * blob:;
               script-src 'self' https://assets.ridge.dev https://app.chatwoot.com 'unsafe-inline' 'unsafe-eval';
               connect-src 'self' blob: https://ipapi.co/json ws://localhost:42110;
               style-src 'self' https://assets.ridge.dev 'unsafe-inline' https://fonts.googleapis.com;
               img-src 'self' data: blob: https://*.ridge.dev https://*.googleusercontent.com https://*.google.com/ https://*.gstatic.com;
               font-src 'self' https://assets.ridge.dev https://fonts.gstatic.com;
               child-src 'self' https://app.chatwoot.com;
               object-src 'none';"
        ></meta>
    );
}
