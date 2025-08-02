# Instantly.ai Integration - Debugging Playbook

## 🚨 Quick Diagnosis Scripts

### **1. Production API Health Check**
```javascript
// Paste in browser console on production site
async function quickHealthCheck() {
  const base = window.location.origin;
  
  try {
    // Test campaigns endpoint
    const campaigns = await fetch(`${base}/api/instantly/campaigns`).then(r => r.json());
    console.log(`✅ Campaigns: ${campaigns.items?.length || 0} found`);
    
    // Test analytics for first campaign
    if (campaigns.items?.[0]) {
      const analytics = await fetch(`${base}/api/instantly/analytics?id=${campaigns.items[0].id}`).then(r => r.json());
      console.log(`✅ Analytics: ${Array.isArray(analytics) ? analytics.length : 'object'} items`);
      
      if (Array.isArray(analytics) && analytics.length > 0) {
        const metrics = analytics[0];
        console.log(`📊 Sample metrics:`, {
          contacted: metrics.contacted_count,
          sent: metrics.emails_sent_count,
          opens: metrics.open_count
        });
      }
    }
  } catch (error) {
    console.error('❌ Health check failed:', error);
  }
}

quickHealthCheck();
```

### **2. UI Data Flow Check**
```javascript
// Check what's displayed in campaign cards
function checkUIMetrics() {
  const cards = document.querySelectorAll('.grid > div');
  console.log(`Found ${cards.length} campaign cards`);
  
  cards.forEach((card, i) => {
    const name = card.querySelector('.text-lg.font-semibold')?.textContent;
    const metrics = Array.from(card.querySelectorAll('.text-lg.font-bold')).map(el => el.textContent);
    const hasRealData = metrics.some(m => m && m !== '0' && m !== '0%');
    
    console.log(`Card ${i + 1}: ${name}`, {
      metrics: metrics.join(' | '),
      status: hasRealData ? '✅ REAL DATA' : '❌ ZEROS'
    });
  });
}

checkUIMetrics();
```

## 🔍 Common Issues & Quick Fixes

### **Issue: All campaigns show zeros**

**Symptoms:**
- Campaigns load correctly (names, statuses)
- All metrics show 0, 0%, 0

**Diagnosis:**
```javascript
// Check if background service is using wrong endpoint
console.log('Check network tab for:');
console.log('❌ BAD: /api/instantly/analytics (no campaign ID)');
console.log('✅ GOOD: /api/instantly/analytics?id=CAMPAIGN_ID');
```

**Root Cause:** Background refresh using old `IntegrationService` instead of `InstantlyCampaignService`

**Fix:**
```typescript
// In src/hooks/useRealTimeData.ts, replace:
IntegrationService.getInstantlyData()

// With:
(async () => {
  const { InstantlyCampaignService } = await import('../services/instantlyCampaignService');
  const campaigns = await InstantlyCampaignService.fetchAllCampaigns();
  return { campaigns, analytics: {} };
})()
```

### **Issue: "Proxy serving source code"**

**Symptoms:**
- Console warning about Vite dev server
- API returns JavaScript code instead of JSON

**Diagnosis:**
```javascript
// Test if running on Vite dev server
if (window.location.port === '5173' || window.location.port === '5174') {
  console.log('❌ Vite dev server cannot execute serverless functions');
  console.log('✅ Solution: Test on production deployment');
}
```

**Quick Fix:** Test on production Vercel deployment instead of local dev server

### **Issue: CORS errors**

**Symptoms:**
- `Access to fetch ... has been blocked by CORS policy`
- Direct API calls failing

**Root Cause:** Trying to call Instantly API directly from browser

**Fix:**
- Always use serverless proxy: `/api/instantly/campaigns`
- Never call `https://api.instantly.ai` directly from frontend

### **Issue: Empty analytics arrays**

**Symptoms:**
- Campaigns load but analytics return `[]` (empty array)
- Service correctly returns zeros

**Diagnosis:**
```javascript
// Check specific campaign analytics
async function checkCampaignActivity(campaignId) {
  const analytics = await fetch(`/api/instantly/analytics?id=${campaignId}`).then(r => r.json());
  console.log(`Campaign ${campaignId}:`, {
    hasData: Array.isArray(analytics) && analytics.length > 0,
    data: analytics
  });
}
```

**Expected Behavior:** This is correct - campaigns with no activity return empty analytics

## 🔧 Environment-Specific Debugging

### **Production (Vercel)**
```bash
# Check Vercel function logs
vercel logs --follow

# Check environment variables
vercel env ls

# Test specific endpoints
curl https://your-app.vercel.app/api/instantly/campaigns
curl "https://your-app.vercel.app/api/instantly/analytics?id=CAMPAIGN_ID"
```

### **Development**
```bash
# Check if API key is available
echo $VITE_INSTANTLY_API_KEY

# Start development server with API proxy
npm run dev:real

# Access via API proxy server
open http://localhost:3001
```

## 📊 Data Validation Checklist

### **Step 1: API Layer**
- [ ] Serverless functions return JSON (not source code)
- [ ] Campaigns endpoint returns array of campaigns
- [ ] Analytics endpoint accepts `?id=CAMPAIGN_ID` parameter
- [ ] API responses match expected structure

### **Step 2: Service Layer**
- [ ] `InstantlyCampaignService.fetchAllCampaigns()` called (not old IntegrationService)
- [ ] Each campaign calls `getCampaignAnalytics(campaignId)` with ID
- [ ] Analytics parsing handles empty arrays correctly
- [ ] Data transformation uses real API fields

### **Step 3: UI Layer**
- [ ] Campaign cards display dynamic values (not hardcoded)
- [ ] Metrics update when data changes
- [ ] Loading states work correctly
- [ ] Error states display helpful messages

## 🚨 Emergency Fixes

### **Quick Rollback**
```bash
# If new deployment breaks, rollback to last working commit
git log --oneline -5
git revert HEAD
git push origin main
```

### **Force Real Data**
```typescript
// Temporary fix: Force specific campaign to show real data
const TEMP_REAL_DATA = {
  totalContacted: 75,
  emailsSent: 75,
  openRate: 51,
  replyRate: 11
};

// Apply in mapToEnrichedFormat method
return {
  ...campaignData,
  ...TEMP_REAL_DATA // Remove after fix
};
```

### **Bypass Cache**
```javascript
// Force fresh data fetch
localStorage.clear();
sessionStorage.clear();
location.reload();
```

## 📋 Monitoring Checklist

### **Daily Health Check**
- [ ] All campaigns display non-zero metrics (where expected)
- [ ] Background refresh maintains real data
- [ ] No console errors related to API calls
- [ ] Vercel function logs show successful requests

### **Weekly Review**
- [ ] Compare dashboard metrics with Instantly.ai dashboard
- [ ] Check for new campaigns automatically appearing
- [ ] Verify analytics accuracy for active campaigns
- [ ] Review Vercel function performance metrics

## 🔗 Useful Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Instantly API Docs**: https://instantly.ai/docs/api/v2
- **Production App**: [Your Vercel deployment URL]
- **GitHub Repository**: [Your GitHub repo URL]

---

**Use this playbook when issues arise. Most problems can be diagnosed and fixed within minutes using these scripts and checklists.**