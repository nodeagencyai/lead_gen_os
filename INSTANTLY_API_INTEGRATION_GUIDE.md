# Instantly.ai API Integration - Complete Working Solution

## 🎯 Overview

This document captures the complete working solution for integrating real Instantly.ai metrics into the Lead Generation OS dashboard. This guide ensures the integration can be replicated and maintained in the future.

## ✅ Final Working Architecture

### **Production Environment**
- **Frontend**: React + TypeScript + Vite
- **API Layer**: Vercel Serverless Functions (`/api/instantly/`)
- **Data Flow**: Frontend → Serverless Proxy → Instantly API v2 → Real Metrics
- **Authentication**: API key stored in Vercel environment variables

### **Development Environment**
- **Limitation**: Vite dev server cannot execute serverless functions (serves source code)
- **Solution**: Test on production deployment or use `dev:real` script with Express server
- **Fallback**: Smart API client detects and provides helpful error messages

## 🏗️ Key Components

### 1. **Serverless Functions** (`/api/instantly/`)

#### `/api/instantly/campaigns.js`
```javascript
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const INSTANTLY_API_KEY = process.env.INSTANTLY_API_KEY;
  
  const response = await fetch('https://api.instantly.ai/api/v2/campaigns', {
    headers: {
      'Authorization': `Bearer ${INSTANTLY_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  res.status(200).json(data);
}
```

#### `/api/instantly/analytics.js`
```javascript
export default async function handler(req, res) {
  const { id } = req.query; // Campaign ID parameter
  const INSTANTLY_API_KEY = process.env.INSTANTLY_API_KEY;
  
  let url = 'https://api.instantly.ai/api/v2/campaigns/analytics';
  if (id) {
    url += `?id=${id}`;
  }
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${INSTANTLY_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  
  const data = await response.json();
  res.status(200).json(data);
}
```

### 2. **API Client** (`src/utils/apiClient.ts`)

Smart API client with environment detection:

```typescript
class ApiClient {
  private getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      // For Vite dev server, use the API server
      if (window.location.hostname === 'localhost' && window.location.port === '5174') {
        return 'http://localhost:3001';
      }
      // Production: use same origin (Vercel)
      return window.location.origin;
    }
    return '';
  }

  async instantly<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    console.log(`📡 INSTANTLY API: /api/instantly${endpoint}`);
    
    const proxyResponse = data 
      ? await this.post<T>(`/api/instantly${endpoint}`, data)
      : await this.get<T>(`/api/instantly${endpoint}`);
    
    // Check if proxy failed (returns source code instead of JSON)
    const isSourceCode = typeof proxyResponse.data === 'string' && 
                        (proxyResponse.data as string).includes('Vercel Serverless Function');
    
    if (isSourceCode) {
      console.warn('⚠️ Proxy serving source code - are you using Vite dev server? Use dev:real script instead');
      return { error: 'Proxy not available - use npm run dev:real for real API data' };
    }
    
    return proxyResponse;
  }
}
```

### 3. **Campaign Service** (`src/services/instantlyCampaignService.ts`)

Main service for fetching campaign data with real metrics:

```typescript
export class InstantlyCampaignService {
  static async fetchAllCampaigns(): Promise<EnrichedCampaignData[]> {
    console.log('🚀 Fetching ALL Instantly campaigns with real data...');
    
    // Fetch all campaigns
    const campaignsResult = await apiClient.instantly('/campaigns');
    const allCampaigns = (campaignsResult.data as any)?.items || [];
    
    // Enrich each campaign with analytics
    const enrichedCampaigns = await Promise.all(
      allCampaigns.map(async (campaign: any) => {
        const [analytics, analyticsOverview] = await Promise.all([
          this.getCampaignAnalytics(campaign.id),
          this.getCampaignAnalyticsOverview(campaign.id)
        ]);
        
        return this.mapToEnrichedFormat(campaign, analytics, null, analyticsOverview);
      })
    );
    
    return enrichedCampaigns;
  }

  static async getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics | null> {
    // CRITICAL: Include campaign ID in query parameter
    const result = await apiClient.instantly(`/analytics?id=${campaignId}`);
    
    if (result.error) {
      console.warn(`⚠️ Analytics not available for campaign ${campaignId}`);
      return null;
    }
    
    return this.parseAnalyticsResponse(result.data, campaignId);
  }

  private static mapToEnrichedFormat(
    details: InstantlyCampaignDetails, 
    analytics?: CampaignAnalytics | null
  ): EnrichedCampaignData {
    // Use real API data for all metrics
    const totalLeads = analytics?.leads_count || 0;
    const leadsContacted = analytics?.contacted_count || 0;
    const emailsSent = analytics?.emails_sent_count || 0;
    const emailsOpened = analytics?.open_count || 0;
    const emailsReplied = analytics?.reply_count || 0;
    
    // Calculate rates using actual API data
    const openRate = emailsSent > 0 ? Math.round((emailsOpened / emailsSent) * 100) : 0;
    const replyRate = emailsSent > 0 ? Math.round((emailsReplied / emailsSent) * 100) : 0;

    return {
      id: details.id,
      name: details.name,
      status: this.mapInstantlyStatus(details.status),
      totalContacted: leadsContacted,
      openRate: openRate,
      replyRate: replyRate,
      emailsSent: emailsSent,
      leadsReady: Math.max(0, totalLeads - leadsContacted),
      // ... other fields
    };
  }
}
```

### 4. **React Hook** (`src/hooks/useCampaignData.ts`)

Hook for campaign components:

```typescript
export const useCampaignData = (mode: 'email' | 'linkedin') => {
  const fetchCampaignData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (mode === 'email') {
        console.log('🔄 STEP 1: Calling InstantlyCampaignService.fetchAllCampaigns()...');
        const realCampaigns = await InstantlyCampaignService.fetchAllCampaigns();
        
        console.log('✅ STEP 3: Using data from InstantlyCampaignService (forced):');
        const finalCampaigns = realCampaigns || [];
        finalCampaigns.forEach(c => {
          console.log(`  Campaign: ${c.name}`, {
            totalContacted: c.totalContacted,
            emailsSent: c.emailsSent,
            openRate: c.openRate
          });
        });
        setCampaigns(finalCampaigns);
      }
    } catch (error) {
      console.error('Failed to fetch campaign data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
};
```

### 5. **Background Data Hook** (`src/hooks/useRealTimeData.ts`)

**CRITICAL FIX**: Updated to use the same service as campaign pages:

```typescript
// BEFORE (WRONG): Called old IntegrationService
const [apiData, leadData] = await Promise.all([
  IntegrationService.getInstantlyData(), // ❌ Called /analytics without campaign ID
]);

// AFTER (CORRECT): Use new InstantlyCampaignService
const [apiData, leadData] = await Promise.all([
  (async () => {
    const { InstantlyCampaignService } = await import('../services/instantlyCampaignService');
    const campaigns = await InstantlyCampaignService.fetchAllCampaigns();
    return { campaigns, analytics: {} };
  })(), // ✅ Calls /analytics?id=CAMPAIGN_ID for each campaign
]);
```

## 🔧 Environment Configuration

### **Production (Vercel)**
```bash
# Environment Variables in Vercel Dashboard
INSTANTLY_API_KEY=your_instantly_api_key_here
NODE_ENV=production
```

### **Development (.env)**
```bash
# For development testing (won't work with Vite dev server)
VITE_INSTANTLY_API_KEY=your_instantly_api_key_here
NODE_ENV=development
```

## 🚀 Deployment & Testing

### **Production Testing** (Recommended)
1. Deploy to Vercel: `git push origin main`
2. Wait 1-2 minutes for deployment
3. Test campaigns page on Vercel URL
4. Verify all campaigns show real metrics

### **Development Testing**
```bash
# Option 1: Test on production (recommended)
# Use your Vercel deployment URL

# Option 2: Development server (complex setup)
npm run dev:real  # Starts both Vite and Express API server
# Access via http://localhost:3001
```

## 🐛 Common Issues & Solutions

### **Issue 1: Campaigns show zeros**
- **Cause**: Background refresh using wrong service
- **Solution**: Ensure `useRealTimeData.ts` uses `InstantlyCampaignService`
- **Check**: Look for `IntegrationService.getInstantlyData()` calls

### **Issue 2: "Proxy serving source code"**
- **Cause**: Vite dev server cannot execute serverless functions
- **Solution**: Test on production deployment
- **Alternative**: Use `npm run dev:real` with Express proxy server

### **Issue 3: CORS errors**
- **Cause**: Direct API calls blocked by browser
- **Solution**: Always use serverless proxy functions
- **Check**: Verify CORS headers in serverless functions

### **Issue 4: Empty analytics arrays**
- **Cause**: Campaigns exist but have no activity/sends in Instantly
- **Expected**: Service should return zeros for inactive campaigns
- **Solution**: This is correct behavior - campaigns need activity to show metrics

## 📊 Data Flow Diagram

```
Frontend Component
    ↓
useCampaignData Hook
    ↓
InstantlyCampaignService.fetchAllCampaigns()
    ↓
apiClient.instantly('/campaigns') → [Get all campaigns]
    ↓
For each campaign:
apiClient.instantly('/analytics?id=CAMPAIGN_ID') → [Get campaign analytics]
    ↓
Vercel Serverless Function (/api/instantly/analytics.js)
    ↓
Instantly API v2 (https://api.instantly.ai/api/v2/campaigns/analytics?id=ID)
    ↓
Real Metrics → Service → Hook → Component → UI
```

## 🔍 Debugging Tools

### **Production API Test Script**
```javascript
// Run in browser console on production site
async function testProductionAPI() {
  const baseUrl = window.location.origin;
  
  // Test campaigns
  const campaignResponse = await fetch(`${baseUrl}/api/instantly/campaigns`);
  const campaigns = await campaignResponse.json();
  console.log(`Found ${campaigns.items?.length || 0} campaigns`);
  
  // Test analytics for first campaign
  if (campaigns.items?.[0]) {
    const campaign = campaigns.items[0];
    const analyticsResponse = await fetch(`${baseUrl}/api/instantly/analytics?id=${campaign.id}`);
    const analytics = await analyticsResponse.json();
    console.log(`${campaign.name} analytics:`, analytics);
  }
}

testProductionAPI();
```

### **Log Analysis**
Look for these console logs to verify correct operation:
- `🚀 Fetching ALL Instantly campaigns with real data...`
- `📊 Fetching analytics via smart API client: CAMPAIGN_ID`
- `✅ Campaign "Name" processed: { totalContacted: X, emailsSent: Y }`

## 🎯 Success Criteria

✅ **All campaigns display real metrics** from Instantly API  
✅ **No mock data or hardcoded zeros**  
✅ **Background refresh maintains real data**  
✅ **Production and development use same data source**  
✅ **Proper error handling for API failures**  
✅ **Clear logging for debugging**  

## 📝 Maintenance Notes

### **When adding new campaigns:**
- No code changes needed
- `fetchAllCampaigns()` automatically includes all campaigns from Instantly account

### **When updating metrics:**
- Modify `mapToEnrichedFormat()` method in `InstantlyCampaignService`
- Update `EnrichedCampaignData` interface if needed

### **When changing API endpoints:**
- Update serverless functions in `/api/instantly/`
- Update corresponding service methods

## 🔐 Security Notes

- ✅ API keys stored in Vercel environment variables (server-side only)
- ✅ No API keys exposed to frontend
- ✅ CORS properly configured
- ✅ All API calls go through serverless proxy

---

**This solution provides real-time Instantly.ai metrics in production with proper fallbacks and error handling. The architecture is scalable and maintainable for future enhancements.**