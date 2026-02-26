# Deployment Guide: Invoice Sharing & Payment Integration

## VPS Deployment Setup

### 1. Environment Variables

Ensure these are set in your production `.env`:

```env
# Base URL for your application (CRITICAL for share links)
NEXTAUTH_URL=https://crm.zervtek.com

# Database
DATABASE_URL="postgresql://user:password@host:5432/dbname?schema=inquiry_pooler"

# NextAuth Secret (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET="your-production-secret"

# Optional: Wise Webhook Secret (for automatic payment status updates)
WISE_WEBHOOK_SECRET="your-webhook-secret"
```

### 2. Public Invoice Links

Public invoice links will work automatically once `NEXTAUTH_URL` is set correctly:

- **Format**: `https://crm.zervtek.com/invoice/[shareToken]`
- **Token Generation**: Cryptographically secure (32-byte random token)
- **Access**: No authentication required (by design)

### 3. Wise Payment Link Setup

1. **Get your reusable Wise payment link**:
   - Log into Wise Business dashboard
   - Go to Payments → Payment Links
   - Create a **Reusable** payment link
   - Copy the base URL (e.g., `https://wise.com/pay/business/ugoigd`)

2. **Store in Company Settings** (recommended) or per-invoice:
   - The system will automatically append `?amount=X&currency=JPY&description=Invoice+XXX`
   - Amount is dynamically calculated from invoice total

### 4. Redis URL and pipeline performance

The **sales pipeline (Kanban)** and inquiry list use Redis for caching. If `REDIS_URL` is not set, every pipeline load hits the database with no cache, so the page can feel slow.

**How to find or set the Redis URL**

- **Docker Compose (recommended):**  
  In `docker-compose.yml`, the `inquiry-pooler` service already passes:
  ```yaml
  REDIS_URL=${REDIS_URL:-redis://redis:6379}
  ```
  So if you **do not** set `REDIS_URL` in your `.env`, the app still gets `redis://redis:6379` (the `redis` service name and default port). You only need to set it explicitly if you use a different Redis host/port.

- **To set it explicitly in `.env`:**
  ```env
  REDIS_URL=redis://redis:6379
  ```
  For Docker Compose, the hostname is the **service name** (`redis`), not `localhost`. Port is `6379` unless you changed the Redis service.

- **Check that the app sees Redis:**  
  On the VPS, after deploy:
  ```bash
  docker compose exec inquiry-pooler sh -c 'echo "REDIS_URL=$REDIS_URL"'
  ```
  You should see `REDIS_URL=redis://redis:6379` (or your custom value). If it is empty, add `REDIS_URL=redis://redis:6379` to your `.env` and restart:
  ```bash
  docker compose up -d inquiry-pooler
  ```

- **If Redis is down or wrong URL:**  
  The app still runs but does not cache (pipeline and list APIs run the full query on every request). Ensure the `redis` container is healthy: `docker compose ps` and check that `inquiry-pooler-redis` is `Up (healthy)`.

## Security Considerations

### ✅ Current Security Measures

1. **Cryptographically Secure Tokens**
   - Share tokens use `randomBytes(32)` - unguessable
   - Base64url encoded for URL safety
   - Unique constraint in database

2. **Access Control**
   - Only APPROVED/FINALIZED invoices can be shared
   - Share tokens are only generated on-demand
   - No listing of all invoices possible

3. **Data Exposure**
   - Public pages only show invoice details (no sensitive admin data)
   - No access to internal cost breakdowns
   - No access to other invoices

### ⚠️ Security Recommendations

#### 1. **Rate Limiting** (CRITICAL)

Add rate limiting to public invoice endpoint:

```typescript
// middleware.ts or API route
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
});
```

#### 2. **HTTPS Only**

Ensure your VPS has SSL certificate:

- Use Let's Encrypt (free)
- Force HTTPS redirects
- Set secure cookies

#### 3. **Token Expiration** (Optional Enhancement)

Consider adding expiration to share tokens:

```prisma
shareTokenExpiresAt DateTime? // Optional expiration date
```

#### 4. **IP-Based Restrictions** (Optional)

For extra security, consider:

- IP allowlist for admin endpoints
- Geo-blocking if needed
- DDoS protection (Cloudflare)

#### 5. **Monitoring & Logging**

- Log all public invoice access attempts
- Monitor for suspicious patterns
- Set up alerts for failed token lookups

### 🔒 Security Best Practices

1. **Never expose**:
   - Database credentials
   - Admin API endpoints
   - Internal cost data on public pages

2. **Always use**:
   - HTTPS in production
   - Strong NEXTAUTH_SECRET
   - Environment variables (never commit secrets)

3. **Regular updates**:
   - Keep dependencies updated
   - Monitor security advisories
   - Regular backups

## Risk Assessment for crm.zervtek.com

### Low Risk ✅

- **Public invoice viewing**: Only approved invoices, no sensitive data
- **Share token system**: Cryptographically secure, unguessable
- **Wise payment links**: External service, handled by Wise

### Medium Risk ⚠️

- **Brute force token guessing**: Mitigated by rate limiting (recommended)
- **DDoS attacks**: Mitigated by proper hosting/CDN
- **Token enumeration**: Not possible (no listing endpoint)

### Mitigation Strategies

1. **Implement rate limiting** (see above)
2. **Use Cloudflare** or similar CDN for DDoS protection
3. **Monitor access logs** for suspicious activity
4. **Set up alerts** for unusual traffic patterns
5. **Regular security audits**

## Deployment Checklist

- [ ] Set `NEXTAUTH_URL=https://crm.zervtek.com` in production
- [ ] Generate new `NEXTAUTH_SECRET` for production
- [ ] Set up SSL certificate (HTTPS)
- [ ] Configure database with proper credentials
- [ ] Run Prisma migrations: `npx prisma migrate deploy`
- [ ] Ensure Redis is used: with Docker Compose, `REDIS_URL` defaults to `redis://redis:6379`; verify with `docker compose exec inquiry-pooler sh -c 'echo $REDIS_URL'` (see §4 above)
- [ ] Set up rate limiting (recommended)
- [ ] Configure monitoring/logging
- [ ] Test public invoice links
- [ ] Test Wise payment link integration
- [ ] Set up backups
- [ ] Configure firewall rules

## Testing Public Links

1. **Generate a share link** for an approved invoice
2. **Open in incognito** (no auth) to verify public access
3. **Test Wise payment link** opens correctly
4. **Verify amount** is pre-filled correctly
5. **Check mobile responsiveness**

## Support

For issues or questions:

- Check logs: `pm2 logs` or your process manager
- Database: Check Prisma migrations status
- API: Test endpoints with curl/Postman
