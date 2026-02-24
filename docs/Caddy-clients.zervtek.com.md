# Caddy: clients.zervtek.com (Customer Portal)

Use this so **clients.zervtek.com** serves the customer portal.

## 1. Add to your Caddyfile

Append this block (same level as your other `domain { ... }` blocks):

```caddy
clients.zervtek.com {
	reverse_proxy customer-portal:3001
}
```

Reload Caddy:

```bash
sudo caddy reload --config /path/to/your/Caddyfile
# or
sudo systemctl reload caddy
```

## 2. Deploy the portal container

From the repo root on the server:

```bash
# Build and start the customer portal (and keep existing services)
docker compose build customer-portal
docker compose up -d customer-portal
```

Optional: set portal-specific env in `.env`:

- `PORTAL_NEXTAUTH_URL=https://clients.zervtek.com` (defaults to this if unset)
- `PORTAL_NEXTAUTH_SECRET=...` (or it reuses `NEXTAUTH_SECRET`)
- SMTP vars if the portal sends verification/password emails: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

## 3. DNS

Ensure **clients.zervtek.com** has an A (or CNAME) record pointing at the same server as **crm.zervtek.com**.

## Summary

| Site                 | Container        | Port |
|----------------------|------------------|------|
| crm.zervtek.com      | inquiry-pooler   | 3000 |
| clients.zervtek.com  | customer-portal   | 3001 |

Both containers are on the `caddy_proxy` network so Caddy can reach them by service name.
