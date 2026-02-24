# Caddy: clients.zervtek.com (Customer Portal)

Use this so **clients.zervtek.com** serves the customer portal.

---

## Quick health check (is everything working?)

On the VPS, run these. All should succeed or show expected output.

**1. Containers (inquiry-pooler stack):**
```bash
cd ~/inquiry-pooler
docker compose ps
```
Expect `inquiry-pooler` and `customer-portal` (and db, redis) **Up**.

**2. CRM responds (main app):**
```bash
curl -sI https://crm.zervtek.com | head -1
# Expect: HTTP/2 200 (or 302 if redirected to login)
```

**3. Customer portal responds:**
```bash
curl -sI https://clients.zervtek.com | head -1
# Expect: HTTP/2 200 or 302
```

**4. Caddy can resolve backend names (same host):**
```bash
docker exec caddy wget -qO- --timeout=2 http://inquiry-pooler:3000/api/auth/session 2>/dev/null | head -c 100 || echo "fail"
docker exec caddy wget -qO- --timeout=2 http://customer-portal:3001 2>/dev/null | head -c 100 || echo "fail"
```
Expect some HTML/JSON, not "fail".

**5. Shared network has both stacks:**
```bash
docker network inspect caddy_proxy --format '{{range .Containers}}{{.Name}} {{end}}'
```
Expect `caddy`, `inquiry-pooler`, `customer-portal` (and any others) in the list.

---

## 1. Add to your Caddyfile

Append this block (same level as your other `domain { ... }` blocks).

**If Caddy runs in Docker on the same `caddy_proxy` network** as this stack:

```caddy
clients.zervtek.com {
	reverse_proxy customer-portal:3001
}
```

**If Caddy runs on the host** (not in Docker), use localhost since port 3001 is published:

```caddy
clients.zervtek.com {
	reverse_proxy 127.0.0.1:3001
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

Both containers are on the `caddy_proxy` network so Caddy (if on that network) can reach them by service name.

---

## Troubleshooting: clients.zervtek.com not working

1. **DNS** – Confirm `clients.zervtek.com` resolves to this server: `dig clients.zervtek.com` or check AWS Route53. It should point to the same IP as crm.zervtek.com.

2. **Caddy target** – If Caddy runs on the **host** (e.g. systemd), use `reverse_proxy 127.0.0.1:3001`, not `customer-portal:3001`. The host cannot resolve Docker service names.

3. **Reload Caddy** after editing the Caddyfile:
   ```bash
   sudo caddy reload --config /etc/caddy/Caddyfile
   # or
   sudo systemctl reload caddy
   ```

4. **Portal container** – Ensure the customer-portal container is up and listening:
   ```bash
   docker ps | grep customer-portal
   curl -sI http://127.0.0.1:3001
   ```

5. **HTTPS** – Caddy will request a certificate for clients.zervtek.com. Ensure port 80 (and 443) is open so ACME can succeed.

---

## Caddy in /opt/n8n: 502 "lookup inquiry-pooler ... server misbehaving"

Caddy runs in the **n8n** stack (`/opt/n8n`) and uses the external network **`caddy_proxy`**. The **inquiry-pooler** stack (`~/inquiry-pooler`) must also be on `caddy_proxy` and running, so Caddy can resolve `inquiry-pooler` and `customer-portal` by name.

**Do this on the VPS:**

1. **Create the shared network once** (if it doesn’t exist):
   ```bash
   docker network create caddy_proxy
   ```

2. **Start the inquiry-pooler stack** so the CRM and portal are on the network:
   ```bash
   cd ~/inquiry-pooler
   docker compose up -d
   ```

3. **Confirm both stacks use the same network:**
   ```bash
   docker network inspect caddy_proxy
   ```
   You should see containers: `caddy`, `inquiry-pooler`, `customer-portal`, and any others that use `caddy_proxy`.

4. **Restart Caddy** so it picks up DNS again (optional if you just started inquiry-pooler):
   ```bash
   cd /opt/n8n
   sudo docker compose restart caddy
   ```

If the inquiry-pooler stack was stopped (e.g. after a reboot), start it **before** or right after Caddy so `inquiry-pooler` and `customer-portal` are on `caddy_proxy` when Caddy resolves them.
