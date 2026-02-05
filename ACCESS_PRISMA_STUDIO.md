# How to Access Prisma Studio via Tailscale

## Quick Solution:

On your VPS, run:
```bash
cd ~/inquiry-pooler
PRISMA_STUDIO_HOST=0.0.0.0 npx prisma studio --browser none
```

Or use the new npm script:
```bash
npm run db:studio:remote
```

## Steps:

1. **On your VPS**, run one of these commands:
   ```bash
   # Option 1: Direct command
   PRISMA_STUDIO_HOST=0.0.0.0 npx prisma studio --browser none
   
   # Option 2: Using npm script (after pulling latest code)
   npm run db:studio:remote
   ```

2. **Find your Tailscale IP** on the VPS:
   ```bash
   tailscale ip
   ```
   This will show something like: `100.x.x.x`

3. **On your local machine**, open in browser:
   ```
   http://100.x.x.x:5555
   ```
   (Replace `100.x.x.x` with your actual Tailscale IP)

## Alternative: SSH Tunnel (if binding doesn't work)

On your **local machine**:
```bash
ssh -L 5555:localhost:5555 ubuntu@your-tailscale-ip
```

Then on your VPS, run:
```bash
npm run db:studio
```

Then access `http://localhost:5555` on your local machine.

## Note:
- The `--browser none` flag prevents it from auto-opening a browser on the VPS
- Binding to `0.0.0.0` makes it accessible on all network interfaces (including Tailscale)
