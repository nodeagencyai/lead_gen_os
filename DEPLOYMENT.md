# Production Deployment Guide

## Environment Variables Configuration

### Critical: Environment Variables for Vercel/Production

Make sure these environment variables are configured in your production deployment:

```bash
# Required for Email Dashboard (Instantly.ai)
VITE_INSTANTLY_API_KEY=Mjc3MGQxMjEtZTk3ZS00NGEzLTgzODQtOGRkMTQ0NDBhOTBiOklVUnBQT2dVTmlJQQ==

# Required for LinkedIn Dashboard (HeyReach)
VITE_HEYREACH_API_KEY=DFU2rNfHwzKC67Z92PXB8LIrKcIgIivA4swxi1madHs=

# Supabase Configuration
VITE_SUPABASE_URL=https://efpwtvlgnftlabmliguf.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcHd0dmxnbmZ0bGFibWxpZ3VmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2Nzc2MzgsImV4cCI6MjA2OTI1MzYzOH0.q-lhFq9zt2hZz9bHSvXcWzub3_5BAYY0powHHQWomEo

# N8N Integration
VITE_N8N_AUTH_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxZTA2MjM2Ny1lMzgyLTRmY2QtYThkYy0wOTBhNDVkYWZkZmMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzUzNjg0MzY3LCJleHAiOjE3NTYyNDU2MDB9.zfHDTjhFB2jUi6Gv85chA019wGvfFDoBBXUCubOUpeg

# Webhook URLs
VITE_N8N_APOLLO_WEBHOOK=https://n8n.srv890126.hstgr.cloud/webhook/958e6877-ef71-4fbf-8033-181dc823ba20
VITE_N8N_LINKEDIN_WEBHOOK=https://n8n.srv890126.hstgr.cloud/webhook/a6950400-2a0d-4fcf-af68-e27ec3b5d3d2
VITE_N8N_EMAIL_WEBHOOK=https://n8n.srv890126.hstgr.cloud/webhook/69bec81d-436b-49c8-9195-64d2a5b3bc20
VITE_N8N_LINKEDIN_OUTREACH_WEBHOOK=https://n8n.srv890126.hstgr.cloud/webhook/3913bcaa-a93f-4fa5-8931-d70564c164ad

# Other
VITE_SUPABASE_WEBHOOK_SECRET=your-webhook-secret
NODE_ENV=production
```

## For Vercel Deployment:

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable above with its corresponding value
5. Redeploy your application

## For Other Platforms:

Make sure to configure these environment variables in your hosting platform's environment configuration.

## Troubleshooting

### "Failed to fetch" Error
- Check that `VITE_INSTANTLY_API_KEY` is properly set in production
- Verify the API key is valid and not expired
- Check browser console for detailed error messages

### "User not authenticated" Error (LinkedIn)
- Check that `VITE_HEYREACH_API_KEY` is properly set in production  
- Verify the HeyReach API key is valid
- The app will try multiple authentication methods automatically

### Environment Variable Debugging
The app now logs available environment variables to help debug configuration issues.

## Development Setup

### Running the Proxy Server (Required for Development)

For development, you need to run the proxy server to avoid CORS issues with both Instantly and HeyReach APIs:

```bash
# Start the proxy server (in a separate terminal)
node server.cjs
```

The proxy server will run on `http://localhost:3001` and proxy requests to:
- Instantly API: `https://api.instantly.ai/api/v2`
- HeyReach API: `https://api.heyreach.io/api/public`

### Development Workflow

1. **Terminal 1**: Start the proxy server
   ```bash
   node server.cjs
   ```

2. **Terminal 2**: Start the development server
   ```bash
   npm run dev
   ```

3. **Access your app**: `http://localhost:5173`

### Production Deployment
In production, the app automatically falls back to direct API calls, so no proxy server is needed.