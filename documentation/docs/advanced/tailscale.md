# Tailscale

:::info
This is only helpful for secure cross-device access to **self-hosted** Ridge. You **do not** need this if you're using [Ridge Cloud](https://app.ridge.dev).
:::

[Tailscale](https://tailscale.com) simplifies creating a private VPN using [Wireguard](https://www.wireguard.com/) and OAuth. So you can host and access services on your devices from anywhere.
The instructions below are one way to simply and securely access your self-hosted Ridge from your phone, laptop etc.

### Minimal Setup
1. Setup ridge on your preferred machine following the [standard steps](/get-started/setup)
2. Sign-up to [Tailscale](https://tailscale.com) and install the app on machines you want to access Ridge from. This usually includes your ridge server, your phone, laptop. Note the tailscale i.p of your ridge server.
3. Start ridge on your server by including the flag `--host <your_server_tailscale_ip>`
4. Open `http://<your_server_tailscale_ip>:42110` to access ridge from any device on your tailscale network!


### HTTPS Certificate
:::info
Tailscale uses Wireguard to encrypt and route traffic between your machines. So HTTPS isn't required with Tailscale for secure access. HTTPS with Tailscale is only useful for browsers to not complain about security and block certain features like clipboard access unless HTTPS is enabled.
:::

1. Enable [MagicDNS](https://tailscale.com/kb/1081/magicdns#enabling-magicdns) and [HTTPS](https://tailscale.com/kb/1153/enabling-https) toggle on your tailscale admin console [DNS](https://login.tailscale.com/admin/dns) page. Note your unique tailscale domain name (usually ends with .ts.net)
2. Create an https certificate for your Ridge server by running the following command:
   ```bash
   # Assuming the server is named, `server` and your tailnet is `black-forest.ts.net`
   # Note path of the .crt and .key files generated

   tailscale cert server.black-forest.ts.net
   ```
3. Start ridge to be served via https on standard port
   ```bash
   sudo RIDGE_DOMAIN=server.black-forest.ts.net \
   ridge \
   --sslcert /path/to/your/tailscale.crt \
   --sslkey path/to/your/tailscale.key \
   --host=server.black-forest.ts.net \
   --port 443
   ```
4. You should now be able to access ridge on `https://server.black-forest.ts.net` from any device on your private tailscale network!
