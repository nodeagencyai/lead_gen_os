# LeadGenOS Monitoring API

A comprehensive monitoring system for tracking N8N workflow executions, lead processing status, and system health metrics.

## 🚀 Quick Start

### 1. Database Setup

Run the SQL schema to create monitoring tables:

```bash
# Execute the monitoring schema in your Supabase dashboard
cat monitoring-schema.sql | psql your_database_url
```

### 2. Environment Variables

Add these environment variables to your `.env` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
N8N_WEBHOOK_LINKEDIN=your_linkedin_webhook_url
N8N_WEBHOOK_APOLLO=your_apollo_webhook_url
```

### 3. Test the APIs

```bash
# Install dependencies if needed
npm install node-fetch  # For Node.js < 18

# Run the test suite
node test-monitoring-api.js

# Test against production
BASE_URL=https://your-domain.vercel.app node test-monitoring-api.js
```

## 📡 API Endpoints

### Health Check
```
GET /api/monitoring/health
```
Returns system health status and database connectivity.

### Webhook Endpoints

#### Error Reporting
```
POST /api/webhooks/error-report
```
Reports errors from N8N workflows.

**Request Body:**
```json
{
  "workflow_name": "LeadGenOS (Apollo)",
  "timestamp": "2024-01-15T10:30:00Z",
  "error": {"message": "API rate limit exceeded"},
  "node_name": "Research Agent",
  "lead_data": "{\"id\":\"123\",\"full_name\":\"John Doe\"}"
}
```

#### Workflow Status
```
POST /api/webhooks/workflow-status
```
Reports workflow execution status.

**Request Body (Started):**
```json
{
  "workflow_name": "LeadGenOS (LinkedIn)",
  "status": "started"
}
```

**Request Body (Completed):**
```json
{
  "workflow_name": "LeadGenOS (LinkedIn)",
  "status": "completed",
  "processed_count": "50"
}
```

**Request Body (Failed):**
```json
{
  "workflow_name": "LeadGenOS (LinkedIn)",
  "status": "failed",
  "error_node": "Research Agent"
}
```

### Monitoring Endpoints

#### Dashboard Data
```
GET /api/monitoring/dashboard?timeRange=24h
```
Returns comprehensive monitoring dashboard data.

**Query Parameters:**
- `timeRange`: `24h`, `7d`, or `30d` (default: `24h`)

**Response:**
```json
{
  "health": {
    "linkedin": {"score": 85, "status": "healthy"},
    "apollo": {"score": 92, "status": "healthy"}
  },
  "executions": {
    "total": 48,
    "completed": 45,
    "failed": 3,
    "successRate": 93.75
  },
  "leads": {
    "processed": 450,
    "failed": 15,
    "averageProcessingTime": 12.5
  },
  "errors": {
    "total": 23,
    "bySeverity": {"critical": 2, "high": 5},
    "byNode": {"Research Agent": 8}
  }
}
```

#### Lead Status
```
GET /api/monitoring/leads/{leadId}?source=apollo
```
Returns detailed processing status for a specific lead.

**Parameters:**
- `leadId`: UUID of the lead
- `source`: `apollo` or `linkedin`

**Response:**
```json
{
  "lead": {
    "id": "uuid",
    "name": "John Doe",
    "company": "Tech Corp"
  },
  "processing": {
    "status": "completed",
    "research": {"status": "completed", "completedAt": "2024-01-15T10:30:00Z"},
    "outreach": {"status": "completed", "completedAt": "2024-01-15T10:31:00Z"}
  },
  "errors": [],
  "metrics": {"processingTime": 120, "errorCount": 0}
}
```

#### Retry Failed Leads
```
POST /api/monitoring/retry
```
Retry processing for failed leads.

**Request Body:**
```json
{
  "leadIds": ["uuid1", "uuid2"],
  "source": "apollo",
  "workflowName": "LeadGenOS (Apollo)",
  "retryType": "full"
}
```

**Retry Types:**
- `full`: Complete reprocessing
- `from_failure`: Resume from failed step
- `research_only`: Retry research step only
- `outreach_only`: Retry outreach step only

## 🔧 N8N Integration

### Error Reporting Node

Add this HTTP Request node to your N8N workflows to report errors:

```javascript
// In your N8N error handling nodes
const errorPayload = {
  workflow_name: "LeadGenOS (Apollo)", // or "LeadGenOS (LinkedIn)"
  timestamp: new Date().toISOString(),
  error: $node["Error Node"].json.error,
  node_name: $node["Error Node"].name,
  lead_data: JSON.stringify($json)
};

return {
  method: 'POST',
  url: 'https://your-domain.vercel.app/api/webhooks/error-report',
  headers: {
    'Content-Type': 'application/json'
  },
  body: errorPayload
};
```

### Workflow Status Reporting

Add these nodes at the start and end of your workflows:

**Workflow Start:**
```javascript
const statusPayload = {
  workflow_name: "LeadGenOS (Apollo)",
  status: "started"
};

return {
  method: 'POST',
  url: 'https://your-domain.vercel.app/api/webhooks/workflow-status',
  headers: {
    'Content-Type': 'application/json'
  },
  body: statusPayload
};
```

**Workflow End (Success):**
```javascript
const statusPayload = {
  workflow_name: "LeadGenOS (Apollo)",
  status: "completed",
  processed_count: String($json.processedCount || "unknown")
};

return {
  method: 'POST',
  url: 'https://your-domain.vercel.app/api/webhooks/workflow-status',
  headers: {
    'Content-Type': 'application/json'
  },
  body: statusPayload
};
```

## 📊 Database Schema

The monitoring system uses these main tables:

- **`workflow_executions`**: Tracks workflow runs
- **`workflow_errors`**: Records all errors
- **`lead_processing_status`**: Tracks individual lead progress
- **`workflow_health`**: Health metrics and scores
- **`api_usage`**: External API usage tracking
- **`retry_attempts`**: Retry attempt logs

## 🔍 Monitoring Dashboard Integration

Update your monitoring component to use real data:

```typescript
// In your Monitoring component
useEffect(() => {
  const fetchMonitoringData = async () => {
    try {
      const response = await fetch('/api/monitoring/dashboard?timeRange=24h');
      const data = await response.json();
      setMonitoringData(data);
    } catch (error) {
      console.error('Failed to fetch monitoring data:', error);
    }
  };

  fetchMonitoringData();
  const interval = setInterval(fetchMonitoringData, 30000); // Refresh every 30s
  return () => clearInterval(interval);
}, []);
```

## 🚨 Error Handling

All endpoints include comprehensive error handling:

- **400**: Bad request (missing/invalid parameters)
- **404**: Resource not found
- **405**: Method not allowed
- **500**: Internal server error

Example error response:
```json
{
  "error": "Missing required fields: workflow_name and status",
  "details": "Additional error context"
}
```

## 🔐 Security Considerations

1. **API Keys**: Use Supabase service keys securely
2. **CORS**: Configured for cross-origin requests
3. **Input Validation**: All inputs are validated
4. **Rate Limiting**: Consider implementing rate limiting in production

## 📈 Performance Optimization

1. **Database Indexes**: Schema includes optimized indexes
2. **Connection Pooling**: Supabase handles connection pooling
3. **Caching**: Consider adding Redis cache for frequently accessed data
4. **Batch Processing**: APIs support batch operations where applicable

## 🐛 Troubleshooting

### Common Issues

**Database Connection Errors:**
```bash
# Check environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_KEY

# Test database connection
curl https://your-domain.vercel.app/api/monitoring/health
```

**N8N Webhook Issues:**
```bash
# Test webhook endpoints
curl -X POST https://your-domain.vercel.app/api/webhooks/error-report \
  -H "Content-Type: application/json" \
  -d '{"workflow_name":"Test","timestamp":"2024-01-15T10:30:00Z","error":{"message":"test"},"node_name":"test"}'
```

**Missing Data:**
- Ensure N8N workflows are configured with monitoring nodes
- Check database permissions for your service key
- Verify environment variables are set correctly

## 📝 Development

### Local Development

```bash
# Start development server
npm run dev

# Run tests against local server  
BASE_URL=http://localhost:3000 node test-monitoring-api.js

# Check logs
tail -f server.log
```

### Adding New Endpoints

1. Create endpoint file in `api/monitoring/`
2. Add error handling and CORS
3. Update test suite
4. Document in this README

## 🚀 Deployment

The API endpoints are automatically deployed with your Vercel project. Ensure:

1. Environment variables are set in Vercel dashboard
2. Database schema is applied to production database
3. N8N workflows are updated with production webhook URLs

## 📞 Support

For issues or questions:
1. Check the test suite output
2. Review database logs in Supabase
3. Check Vercel function logs
4. Refer to the comprehensive error messages in responses