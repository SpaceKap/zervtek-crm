# Accessing Prisma Studio via Tailscale

## Problem
Prisma Studio defaults to `localhost:5555`, which only works locally on the VPS.

## Solution: Bind to 0.0.0.0 (All Interfaces)

### Option 1: Modify package.json script
Change the `db:studio` script in package.json to:
```json
"db:studio": "prisma studio --browser none --port 5555"
```

Then run with host binding:
```bash
PRISMA_STUDIO_HOST=0.0.0.0 npm run db:studio
```

### Option 2: Direct command with host binding
```bash
# On your VPS
cd ~/inquiry-pooler
PRISMA_STUDIO_HOST=0.0.0.0 npx prisma studio --port 5555
```

### Option 3: Use environment variable
```bash
export PRISMA_STUDIO_HOST=0.0.0.0
npm run db:studio
```

### Option 4: SSH Tunnel (Alternative)
If you can't bind to 0.0.0.0, use SSH port forwarding:
```bash
# On your local machine
ssh -L 5555:localhost:5555 user@your-tailscale-ip
```
Then access http://localhost:5555 on your local machine.

## After binding to 0.0.0.0:
1. Find your Tailscale IP on the VPS:
   ```bash
   tailscale ip
   ```

2. Access Prisma Studio from your local machine:
   ```
   http://YOUR_TAILSCALE_IP:5555
   ```

## Security Note:
⚠️ Make sure your Tailscale network is secure. Prisma Studio exposes your database interface.
