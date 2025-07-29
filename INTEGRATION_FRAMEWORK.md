# Dashboard API Integration Framework

## Overview
This framework will replace all mock dashboard data with real API integrations:
- **Instantly API** for email campaign data
- **HeyReach API** for LinkedIn campaign data

## Current Implementation Analysis

### Data Flow
```
App.tsx → useRealTimeData.ts → integrationService.ts → API Endpoints
                             ↘ 
                              useChartData.ts → integrationService.ts → API Endpoints
```

### Components That Need Real Data
1. **Key Metrics Cards** (5 metrics each mode)
2. **Performance Charts** (2 charts with trend data)
3. **Efficiency Metrics** (4 metrics each mode)
4. **Campaigns Table** (campaign performance data)

## 1. Instantly API Integration (Email Dashboard)

### API Endpoints to Implement
```typescript
// Base URL: https://api.instantly.ai/api/v1

GET /campaign/list                    // Get all campaigns
GET /lead/list?campaign_id={id}      // Get leads for campaign
GET /analytics/campaign?campaign_id={id} // Get campaign analytics
GET /analytics/overview              // Get account overview stats
```

### Data Mapping
```typescript
interface InstantlyResponse {
  // Key Metrics
  analytics: {
    emails_sent: number;           → "Emails Sent"
    emails_opened: number;         → "Emails Opened" 
    emails_replied: number;        → "Email Replies"
    meetings_booked: number;       → "Meetings Booked"
    bounce_rate: number;           → "Bounce Rate"
  };
  
  // Campaign Performance
  campaigns: Array<{
    id: string;
    name: string;
    emails_sent: number;           → Table "Emails Sent"
    replies: number;               → Table "Replies"
    meetings: number;              → Table "Meetings"
    reply_rate: string;            → Table "Reply Rate"
  }>;
  
  // Chart Data
  daily_stats: Array<{
    date: string;
    emails_sent: number;           → Chart 1 data points
    opens_replies: number;         → Chart 2 data points
  }>;
}
```

### Implementation Steps
```typescript
// 1. Update integrationService.ts
static async getInstantlyData() {
  const apiKey = await this.getApiKey('instantly');
  const headers = { 'Authorization': `Bearer ${apiKey}` };
  
  // Parallel API calls
  const [campaigns, analytics, dailyStats] = await Promise.all([
    fetch(`${BASE_URL}/campaign/list`, { headers }),
    fetch(`${BASE_URL}/analytics/overview`, { headers }),
    fetch(`${BASE_URL}/analytics/daily?days=30`, { headers })
  ]);
  
  return {
    campaigns: campaigns.data,
    analytics: analytics.data,
    dailyStats: dailyStats.data
  };
}

// 2. Update useRealTimeData.ts
const emailMetrics = {
  sent: instantlyData.analytics.emails_sent,
  opened: instantlyData.analytics.emails_opened,
  replied: instantlyData.analytics.emails_replied,
  meetings: instantlyData.analytics.meetings_booked,
  bounceRate: instantlyData.analytics.bounce_rate
};

// 3. Update useChartData.ts  
const chartData = instantlyData.dailyStats.map(day => ({
  date: day.date,
  value: day.emails_sent
}));
```

## 2. HeyReach API Integration (LinkedIn Dashboard)

### API Endpoints to Implement
```typescript
// Base URL: https://api.heyreach.io/api/v1

GET /campaigns                       // Get all campaigns
GET /connections?campaign_id={id}    // Get connections for campaign
GET /messages?campaign_id={id}       // Get messages for campaign
GET /analytics/overview              // Get account analytics
```

### Data Mapping
```typescript
interface HeyReachResponse {
  // Key Metrics
  analytics: {
    connection_requests_sent: number;  → "Connection Requests"
    connections_accepted: number;      → "Connections Accepted"
    messages_sent: number;             → "Messages Sent"
    message_replies: number;           → "Message Replies"
    meetings_booked: number;           → "Meetings Booked"
  };
  
  // Campaign Performance
  campaigns: Array<{
    id: string;
    name: string;
    connections: number;               → Table "Connections"
    replies: number;                   → Table "Replies"
    meetings: number;                  → Table "Meetings"
    response_rate: string;             → Table "Response Rate"
  }>;
  
  // Chart Data
  daily_stats: Array<{
    date: string;
    connections: number;               → Chart 1 data points
    messages_replies: number;         → Chart 2 data points
  }>;
}
```

## 3. Environment Variables Setup

Add to `.env`:
```bash
# API Keys (store encrypted in Supabase integrations table)
INSTANTLY_API_KEY=your_instantly_api_key
HEYREACH_API_KEY=your_heyreach_api_key

# API Rate Limiting
INSTANTLY_RATE_LIMIT=100
HEYREACH_RATE_LIMIT=100
```

## 4. Error Handling & Fallbacks

```typescript
// Graceful degradation strategy
const fetchRealTimeData = async () => {
  try {
    if (mode === 'email') {
      const instantlyData = await IntegrationService.getInstantlyData();
      // Use real data
    } else {
      const heyReachData = await IntegrationService.getHeyReachData();
      // Use real data
    }
  } catch (error) {
    console.warn('API unavailable, using cached/mock data');
    // Fallback to cached data or show error state
  }
};
```

## 5. Data Transformation Layer

```typescript
// services/dataTransformer.ts
export class DataTransformer {
  static transformInstantlyData(rawData: any): DashboardMetrics {
    return {
      keyMetrics: {
        sent: rawData.analytics.emails_sent,
        opened: rawData.analytics.emails_opened,
        replied: rawData.analytics.emails_replied,
        meetings: rawData.analytics.meetings_booked,
        bounceRate: rawData.analytics.bounce_rate
      },
      chartData: rawData.daily_stats.map(day => ({
        date: day.date,
        emailsSent: day.emails_sent,
        opensReplies: day.opens + day.replies
      })),
      campaigns: rawData.campaigns.map(camp => ({
        name: camp.name,
        sent: camp.emails_sent,
        replies: camp.replies,
        meetings: camp.meetings,
        rate: `${((camp.replies / camp.emails_sent) * 100).toFixed(1)}%`
      }))
    };
  }
  
  static transformHeyReachData(rawData: any): DashboardMetrics {
    // Similar transformation for HeyReach data
  }
}
```

## 6. Real-time Updates

```typescript
// Add WebSocket support for real-time updates
useEffect(() => {
  const interval = setInterval(fetchRealTimeData, 30000); // 30 seconds
  return () => clearInterval(interval);
}, [mode]);
```

## 7. Caching Strategy

```typescript
// Add caching to reduce API calls
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let lastFetch = 0;
let cachedData = null;

if (Date.now() - lastFetch < CACHE_DURATION && cachedData) {
  return cachedData;
}
```

## Implementation Priority

1. ✅ **Phase 1**: Update Instantly API integration in `integrationService.ts`
2. ✅ **Phase 2**: Update HeyReach API integration in `integrationService.ts`  
3. ✅ **Phase 3**: Create data transformation layer
4. ✅ **Phase 4**: Update hooks to use real data with fallbacks
5. ✅ **Phase 5**: Add error handling and loading states
6. ✅ **Phase 6**: Implement caching and rate limiting

## Testing Strategy
1. **Mock API responses** for development
2. **Error simulation** to test fallbacks
3. **Rate limit testing** to ensure graceful handling
4. **Real API integration** with actual credentials

This framework provides a complete structure for replacing mock data with real API integrations while maintaining reliability and user experience.