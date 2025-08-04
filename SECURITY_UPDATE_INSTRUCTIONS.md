# 🚨 SECURITY UPDATE - API Key Rotation Instructions

**Issue**: API keys were exposed in .env.example file  
**Status**: URGENT - Keys need immediate rotation  
**Impact**: Supabase and OpenRouter access compromised

## 🔧 Required Actions

### 1. ✅ COMPLETED: Clean .env.example 
- Removed leaked OpenRouter key from .env.example
- Replaced with secure placeholder values
- File is now safe for Git commits

### 2. 🔑 UPDATE LOCAL ENVIRONMENT (.env file)

Update your local `.env` file with your new keys:

```bash
# SUPABASE - NEW KEYS REQUIRED
VITE_SUPABASE_URL=https://your-new-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_new_supabase_anon_key_here
VITE_SUPABASE_SERVICE_KEY=your_new_supabase_service_key_here

# OPENROUTER - NEW KEY REQUIRED  
OPENROUTER_API_KEY=your_new_openrouter_api_key_here

# These should remain the same (not compromised)
VITE_INSTANTLY_API_KEY=your_instantly_api_key
VITE_HEYREACH_API_KEY=your_heyreach_api_key
VITE_N8N_AUTH_TOKEN=your_n8n_auth_token
# ... other variables
```

### 3. 🌐 UPDATE VERCEL PRODUCTION ENVIRONMENT

Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your Project → Settings → Environment Variables

Update these variables:

**Frontend Variables (available to browser):**
- `VITE_SUPABASE_URL` = your_new_supabase_url
- `VITE_SUPABASE_ANON_KEY` = your_new_supabase_anon_key

**Backend Variables (serverless functions only):**
- `VITE_SUPABASE_SERVICE_KEY` = your_new_supabase_service_key  
- `OPENROUTER_API_KEY` = your_new_openrouter_api_key

### 4. 🔄 REDEPLOY APPLICATION

After updating Vercel environment variables:
```bash
git push origin main
```
This will trigger an automatic Vercel deployment with new keys.

## 🎯 Key Locations in Code

### Frontend Usage (VITE_ prefixed):
- `src/lib/supabase.ts` - Uses VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
- `src/lib/supabaseAdmin.ts` - Uses VITE_SUPABASE_SERVICE_KEY
- All React components that use Supabase client

### Backend Usage (API routes):
- `api/costs/*.js` - Uses OPENROUTER_API_KEY for cost tracking
- `api/debug/*.js` - Uses VITE_SUPABASE_SERVICE_KEY for admin operations
- `api/monitoring/*.js` - Uses both Supabase and OpenRouter keys
- 15+ API routes use these keys for database and AI operations

## ⚠️ Security Checklist

- [ ] Rotate Supabase project keys (create new project if needed)
- [ ] Generate new OpenRouter API key  
- [ ] Update local .env file with new keys
- [ ] Update Vercel environment variables
- [ ] Test locally: `npm run dev`
- [ ] Deploy and test production: `git push`
- [ ] Verify all API endpoints work with new keys
- [ ] Monitor for any authentication errors

## 🔍 Verification Steps

After updating keys, verify these work:
1. **Local Development**: `npm run dev` - should load without errors
2. **Supabase Connection**: Dashboard should load lead data
3. **OpenRouter Cost Tracking**: Check cost metrics in dashboard
4. **API Endpoints**: Test campaign creation and monitoring
5. **Production**: Verify deployment works on your live URL

## 🚨 Emergency Rollback

If issues occur after key rotation:
1. Check Vercel deployment logs for authentication errors
2. Verify key formats match expected patterns:
   - Supabase URL: `https://xxx.supabase.co`
   - Supabase keys: Start with `eyJ...`
   - OpenRouter key: `sk-or-v1-...`
3. Double-check environment variable names (exact spelling)

## 📞 Support Resources

- **Supabase**: https://supabase.com/dashboard/project/_/settings/api
- **OpenRouter**: https://openrouter.ai/keys  
- **Vercel Environment Variables**: https://vercel.com/docs/concepts/projects/environment-variables

---

**⏰ Timeline**: Complete within 24 hours to minimize security exposure  
**Priority**: CRITICAL - Leaked keys should be rotated immediately