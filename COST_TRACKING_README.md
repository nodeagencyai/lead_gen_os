# OpenRouter Cost Tracking System

## Overview

This comprehensive cost tracking system monitors and analyzes the costs associated with your email campaign operations, including:

- **Fixed Costs**: Instantly.ai (€75/month) + Google Workspace (€48/month)
- **Variable Costs**: OpenRouter AI API usage
- **Key Metrics**: Cost per email, cost per meeting, efficiency scores
- **Real-time Analytics**: Dashboard integration with live cost updates

## System Architecture

### Core Components

1. **OpenRouterCostTracker** - Wraps all AI API calls with cost tracking
2. **DashboardCostService** - Manages cost metrics and calculations
3. **Cost Integration Service** - Frontend integration and formatting
4. **REST API Endpoints** - Data access and activity recording
5. **React Hooks** - Frontend state management

### Database Schema

```sql
-- OpenRouter usage tracking
openrouter_usage (
  id UUID PRIMARY KEY,
  generation_id VARCHAR UNIQUE,
  campaign_id VARCHAR,
  email_id VARCHAR,
  model VARCHAR NOT NULL,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  cost_usd DECIMAL(10,6),
  purpose ENUM(...),
  metadata JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- Monthly cost summaries
monthly_costs (
  id UUID PRIMARY KEY,
  year INTEGER,
  month INTEGER,
  instantly_cost DECIMAL(10,2) DEFAULT 75.00,
  google_workspace_cost DECIMAL(10,2) DEFAULT 48.00,
  openrouter_cost DECIMAL(10,6) DEFAULT 0,
  total_cost DECIMAL(10,2),
  emails_sent INTEGER DEFAULT 0,
  meetings_booked INTEGER DEFAULT 0,
  cost_per_email DECIMAL(10,4),
  cost_per_meeting DECIMAL(10,4),
  exchange_rate DECIMAL(10,6),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

## Setup Instructions

### 1. Environment Configuration

Add to your `.env` file:

```env
# OpenRouter API
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Fixed Costs (EUR)
MONTHLY_INSTANTLY_COST=75
MONTHLY_WORKSPACE_COST=48

# Alerts & Exchange
COST_ALERT_THRESHOLD=200
USD_TO_EUR_RATE=0.92

# Application
APP_URL=https://lead-gen-os.vercel.app
```

### 2. Database Migration

Run the SQL migration in `src/database/migrations/001_create_openrouter_cost_tracking.sql`:

```bash
# Execute in your PostgreSQL database
psql -d your_database -f src/database/migrations/001_create_openrouter_cost_tracking.sql
```

### 3. Install Dependencies

```bash
npm install uuid axios
npm install --save-dev @types/uuid jest
```

## Usage Guide

### Frontend Integration

The cost tracking system is automatically integrated into your dashboard:

```tsx
import { useCostTracking } from './hooks/useCostTracking';

function Dashboard() {
  const { 
    costPerEmail, 
    costPerMeeting, 
    totalMonthlySpend,
    formatCost,
    recordActivity 
  } = useCostTracking();

  // Display costs
  return (
    <div>
      <div>Cost per Email: {formatCost(costPerEmail)}</div>
      <div>Cost per Meeting: {formatCost(costPerMeeting)}</div>
      <div>Monthly Spend: {formatCost(totalMonthlySpend)}</div>
    </div>
  );
}
```

### Recording Activities

Automatically record when emails are sent or meetings are booked:

```tsx
// When sending an email
await recordActivity('email_sent', campaignId);

// When booking a meeting
await recordActivity('meeting_booked', campaignId);
```

### OpenRouter API Integration

All AI API calls are automatically tracked:

```typescript
import { openRouterCostTracker } from './services/OpenRouterCostTracker';

// Make a tracked AI request
const response = await openRouterCostTracker.makeTrackedRequest(
  [{ role: 'user', content: 'Generate email content' }],
  'anthropic/claude-3-haiku',
  {
    campaignId: 'campaign-123',
    emailId: 'email-456',
    purpose: 'email_generation'
  }
);
```

## API Endpoints

### GET /api/costs/dashboard-metrics

Returns current month cost metrics for dashboard display.

**Response:**
```json
{
  "success": true,
  "data": {
    "costPerEmail": 1.23,
    "costPerMeeting": 24.60,
    "totalMonthlySpend": 128.50,
    "costBreakdown": {
      "fixed": {
        "instantly": 75,
        "googleWorkspace": 48,
        "total": 123
      },
      "variable": {
        "openRouter": 5.50,
        "total": 5.50
      },
      "total": 128.50
    },
    "emailsSent": 100,
    "meetingsBooked": 5,
    "remainingCredits": 94.50,
    "exchangeRate": 0.92,
    "lastUpdated": "2024-01-15T10:30:00Z"
  }
}
```

### POST /api/costs/record-activity

Records email sent or meeting booked activity.

**Request:**
```json
{
  "type": "email_sent",
  "campaignId": "campaign-123",
  "metadata": { "emailType": "follow-up" }
}
```

### GET /api/costs/usage-report

Returns detailed usage breakdown for analysis.

**Parameters:**
- `days` - Number of days to include (default: 30)
- `start_date` - Custom start date (ISO format)
- `end_date` - Custom end date (ISO format)

### GET /api/costs/trends

Returns monthly cost trends for charts and analytics.

**Parameters:**
- `months` - Number of months to include (default: 6, max: 24)

## Cost Calculation Logic

### Cost per Email
```
Cost per Email = Total Monthly Cost ÷ Emails Sent
```

### Cost per Meeting
```
Cost per Meeting = Total Monthly Cost ÷ Meetings Booked
```

### Total Monthly Cost
```
Total = Fixed Costs (€123) + Variable Costs (OpenRouter USD → EUR)
```

### Cost Efficiency Score
Based on targets:
- Target cost per email: €0.10
- Target cost per meeting: €5.00
- Score: 0-100% based on deviation from targets

## Dashboard Features

### Cost Metrics Cards
- **Cost per Email**: Real-time calculation with email count
- **Cost per Meeting**: Real-time calculation with meeting count  
- **Monthly Spend**: Total costs with fixed/variable breakdown
- **Cost Efficiency**: Score with color-coded status

### Cost Alerts
- Automatic alerts when monthly spend exceeds threshold
- Visual indicators in dashboard
- Budget monitoring and warnings

### Cost Breakdown
- Fixed vs Variable cost visualization
- OpenRouter usage analytics
- Currency conversion (USD → EUR)

## Error Handling

### API Failures
- Graceful degradation when cost tracking fails
- Fallback to default values
- Non-blocking error handling

### Database Issues
- Retry logic for database operations
- Transaction safety for cost updates
- Data consistency checks

### Rate Limiting
- Exponential backoff for OpenRouter API
- Request queuing and throttling
- Automatic retry mechanisms

## Performance Optimizations

### Caching
- 1-minute cache for dashboard metrics
- Batched database operations
- Efficient query indexes

### Async Operations
- Non-blocking cost tracking
- Background data processing
- Optimized API calls

## Testing

Run the test suite:

```bash
npm test src/tests/costTracking.test.ts
```

### Test Coverage
- Unit tests for all cost calculations
- Integration tests for API workflows
- Mock testing for external services
- Edge case handling validation

## Monitoring & Alerts

### Cost Alerts
- Monthly budget threshold monitoring
- Real-time cost spike detection
- Email/Slack notification support

### Performance Monitoring
- API response time tracking
- Database query performance
- Error rate monitoring

## Security Considerations

### API Key Protection
- Environment variable storage
- Secure key rotation support
- Access logging and auditing

### Data Privacy
- PII data handling compliance
- Cost data encryption at rest
- Secure API endpoints

## Troubleshooting

### Common Issues

**Cost metrics showing zero:**
1. Check OpenRouter API key configuration
2. Verify database connectivity
3. Check recent API error logs

**High AI costs:**
1. Review model selection (use cheaper models for simple tasks)
2. Optimize prompt lengths
3. Implement request caching

**Database connection errors:**
1. Verify Supabase configuration
2. Check network connectivity
3. Review database permissions

### Debug Mode
Enable detailed logging by setting:
```env
DEBUG_COST_TRACKING=true
```

## Maintenance

### Monthly Tasks
- Review cost trends and budgets
- Update exchange rates if needed
- Clean up old usage data (optional)
- Analyze cost efficiency trends

### Quarterly Tasks
- Review and adjust cost thresholds
- Optimize AI model usage
- Update pricing configurations
- Performance optimization review

## Future Enhancements

### Planned Features
- Cost forecasting based on usage trends
- Campaign-specific budget allocation
- Advanced cost optimization recommendations
- Integration with additional AI providers
- Custom cost alert configurations

### Integration Opportunities
- Slack/Discord notifications
- Email cost reports
- BI dashboard exports
- Custom analytics endpoints

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review error logs in dashboard
3. Verify environment configuration
4. Test with minimal API calls

## Version History

- **v1.0.0** - Initial implementation
  - Basic cost tracking
  - Dashboard integration
  - OpenRouter API wrapper
  - Monthly cost summaries

---

*Last updated: January 2024*