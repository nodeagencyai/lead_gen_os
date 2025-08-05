# N8N Webhook Integration Guide

**Purpose:** Comprehensive monitoring and logging strategy for N8N workflows  
**Base URL:** `https://lead-gen-os.vercel.app`

---

## 🎯 Webhook Strategy Overview

### **Current Webhooks Available:**

| Endpoint | Purpose | When to Use |
|----------|---------|------------|
| `/api/webhooks/workflow-status` | Track workflow execution status | Start/complete/fail of entire workflow |
| `/api/webhooks/error-report` | Log specific errors | When any node fails |
| `/api/webhooks/lead-processing` | Track lead progress | After processing each lead |
| `/api/webhooks/api-usage` | Track API costs | After OpenRouter API calls |

### **Recommended N8N Workflow Structure:**

```
[Trigger] 
    ↓
[Set Workflow Start] → HTTP Request to /workflow-status (status: started)
    ↓
[Get Leads from DB]
    ↓
[Loop Over Leads]
    ├─[Research Agent] → HTTP Request to /lead-processing (stage: research)
    │   ├─ Success → Continue
    │   └─ Error → HTTP Request to /error-report
    ├─[Outreach Agent] → HTTP Request to /lead-processing (stage: outreach)
    │   ├─ Success → Continue
    │   └─ Error → HTTP Request to /error-report
    └─[Update DB] → HTTP Request to /lead-processing (stage: database_update)
        ├─ Success → Continue
        └─ Error → HTTP Request to /error-report
    ↓
[Set Workflow Complete] → HTTP Request to /workflow-status (status: completed)
```

---

## 📡 Webhook Payload Formats

### **1. Workflow Status Webhook**
**URL:** `https://lead-gen-os.vercel.app/api/webhooks/workflow-status`

```json
// When workflow starts
{
  "workflow_name": "LeadGenOS (Apollo)",
  "status": "started",
  "campaign_name": "Q1 Outreach Campaign",
  "timestamp": "{{ $now.toISO() }}"
}

// When workflow completes
{
  "workflow_name": "LeadGenOS (Apollo)",
  "status": "completed",
  "processed_count": "{{ $items('Loop').context.total }}",
  "timestamp": "{{ $now.toISO() }}"
}

// When workflow fails
{
  "workflow_name": "LeadGenOS (Apollo)",
  "status": "failed",
  "error_node": "{{ $node.name }}",
  "error_summary": "{{ $json.error.message }}",
  "timestamp": "{{ $now.toISO() }}"
}
```

### **2. Error Report Webhook**
**URL:** `https://lead-gen-os.vercel.app/api/webhooks/error-report`

```json
{
  "workflow_name": "LeadGenOS (Apollo)",
  "timestamp": "{{ $now.toISO() }}",
  "error": {
    "message": "{{ $json.error.message }}",
    "code": "{{ $json.error.code }}",
    "details": "{{ $json.error }}"
  },
  "node_name": "{{ $node.name }}",
  "lead_data": {
    "id": "{{ $item(0).$node['Get Lead Data'].json.id }}",
    "full_name": "{{ $item(0).$node['Get Lead Data'].json.full_name }}",
    "company": "{{ $item(0).$node['Get Lead Data'].json.company }}",
    "email": "{{ $item(0).$node['Get Lead Data'].json.email }}"
  }
}
```

### **3. Lead Processing Webhook**
**URL:** `https://lead-gen-os.vercel.app/api/webhooks/lead-processing`

```json
{
  "lead_id": "{{ $json.id }}",
  "lead_source": "apollo", // or "linkedin"
  "stage": "research", // or "outreach" or "database_update"
  "status": "completed", // or "in_progress" or "failed"
  "duration_ms": "{{ $now.diff($item(0).$node['Start Timer'].json.timestamp, 'milliseconds') }}",
  "result_data": {
    "icebreaker": "{{ $json.icebreaker }}",
    "personalization": "{{ $json.personalization }}",
    "subject_line": "{{ $json.subject_line }}"
  }
}
```

### **4. API Usage Webhook**
**URL:** `https://lead-gen-os.vercel.app/api/webhooks/api-usage`

```json
{
  "api_service": "openrouter",
  "model_name": "anthropic/claude-3.5-sonnet",
  "prompt_tokens": "{{ $json.usage.prompt_tokens }}",
  "completion_tokens": "{{ $json.usage.completion_tokens }}",
  "workflow_name": "LeadGenOS (Apollo)",
  "lead_id": "{{ $json.lead_id }}",
  "node_name": "{{ $node.name }}",
  "timestamp": "{{ $now.toISO() }}"
}
```

---

## 🛠️ N8N Implementation Guide

### **Step 1: Add Workflow Start Notification**

After your webhook trigger node, add:

1. **Set Node** (name: "Set Workflow Data")
   ```json
   {
     "workflow_start": "{{ $now.toISO() }}",
     "workflow_name": "LeadGenOS (Apollo)",
     "campaign_name": "{{ $json.campaign_name || 'Manual Trigger' }}"
   }
   ```

2. **HTTP Request Node** (name: "Notify Workflow Start")
   - Method: POST
   - URL: `https://lead-gen-os.vercel.app/api/webhooks/workflow-status`
   - Body:
   ```json
   {
     "workflow_name": "{{ $node['Set Workflow Data'].json.workflow_name }}",
     "status": "started",
     "campaign_name": "{{ $node['Set Workflow Data'].json.campaign_name }}",
     "timestamp": "{{ $node['Set Workflow Data'].json.workflow_start }}"
   }
   ```

### **Step 2: Add Error Handling to Critical Nodes**

For each critical node (Research Agent, Outreach Agent, Database Update):

1. **Add Error Output** to the node
2. Connect error output to **HTTP Request Node**:
   - Method: POST
   - URL: `https://lead-gen-os.vercel.app/api/webhooks/error-report`
   - Body:
   ```json
   {
     "workflow_name": "LeadGenOS (Apollo)",
     "timestamp": "{{ $now.toISO() }}",
     "error": {
       "message": "{{ $json.error?.message || 'Unknown error' }}",
       "code": "{{ $json.error?.code || 'UNKNOWN' }}",
       "details": "{{ JSON.stringify($json.error) }}"
     },
     "node_name": "{{ $node.name }}",
     "lead_data": {
       "id": "{{ $('Get Lead Data').item.json.id }}",
       "full_name": "{{ $('Get Lead Data').item.json.full_name }}",
       "company": "{{ $('Get Lead Data').item.json.company }}"
     }
   }
   ```

### **Step 3: Add Success Tracking**

After each successful critical operation:

**HTTP Request Node** (name: "Track Lead Progress")
- Method: POST  
- URL: `https://lead-gen-os.vercel.app/api/webhooks/lead-processing`
- Body:
```json
{
  "lead_id": "{{ $json.id }}",
  "lead_source": "apollo",
  "stage": "research", // Change based on stage
  "status": "completed",
  "duration_ms": "{{ $now.diff($node['Stage Start'].json.timestamp, 'milliseconds') }}",
  "result_data": {
    "output": "{{ JSON.stringify($json) }}"
  }
}
```

### **Step 4: Add Workflow Completion**

At the end of your workflow:

**HTTP Request Node** (name: "Notify Workflow Complete")
- Method: POST
- URL: `https://lead-gen-os.vercel.app/api/webhooks/workflow-status`
- Body:
```json
{
  "workflow_name": "{{ $node['Set Workflow Data'].json.workflow_name }}",
  "status": "completed",
  "processed_count": "{{ $items('Loop').context.total }}",
  "timestamp": "{{ $now.toISO() }}"
}
```

---

## 🎯 Best Practices

### **1. Use Try-Catch Pattern**
```
[Your Node]
    ├─ Success → [Track Success] → [Continue]
    └─ Error → [Report Error] → [Handle Error]
```

### **2. Batch Error Reporting**
Don't send an HTTP request for every single item in a loop. Instead:
- Collect errors in a Set node
- Send batch report every 10-20 items
- Send final summary at workflow end

### **3. Add Context to Errors**
Always include:
- Lead information (ID, name, company)
- Workflow stage (research, outreach, etc.)
- Node name where error occurred
- Timestamp

### **4. Implement Circuit Breaker**
If more than 5 errors in a row:
- Stop processing
- Send critical alert
- Mark workflow as failed

---

## 📊 Monitoring Dashboard Integration

Your webhooks will automatically populate:

1. **Workflow Health Metrics**
   - Success/failure rates
   - Average processing time
   - Error patterns

2. **Lead Processing Pipeline**
   - Leads stuck at each stage
   - Success rate by stage
   - Common failure points

3. **Cost Tracking**
   - API usage per workflow
   - Cost per lead processed
   - Budget alerts

4. **Real-time Alerts**
   - High error rates
   - Workflow failures
   - API quota warnings

---

## 🚨 Recommended Additional Webhooks

### **1. Performance Monitoring Webhook**
Create `/api/webhooks/performance`:
```javascript
// Track node execution times
{
  "workflow_name": "LeadGenOS (Apollo)",
  "node_name": "Research Agent",
  "execution_time_ms": 1234,
  "memory_usage_mb": 256,
  "items_processed": 10
}
```

### **2. Data Quality Webhook**
Create `/api/webhooks/data-quality`:
```javascript
// Track data completeness
{
  "lead_id": "123",
  "data_completeness": {
    "email": true,
    "phone": false,
    "linkedin": true,
    "company_size": false
  },
  "quality_score": 75
}
```

### **3. Retry Webhook**
Create `/api/webhooks/retry-request`:
```javascript
// Request retry for failed items
{
  "execution_id": "abc-123",
  "lead_ids": ["lead1", "lead2"],
  "retry_reason": "API timeout",
  "retry_attempt": 1
}
```

---

## 🔧 Quick Implementation Checklist

### **Minimum Required (Do This First):**
- [ ] Add workflow start notification
- [ ] Add error reporting on critical nodes
- [ ] Add workflow completion notification
- [ ] Test with a few leads first

### **Recommended Additions:**
- [ ] Add lead processing progress tracking
- [ ] Add API usage tracking for costs
- [ ] Implement batch error reporting
- [ ] Add performance monitoring

### **Advanced Features:**
- [ ] Circuit breaker implementation
- [ ] Retry logic with backoff
- [ ] Data quality tracking
- [ ] Custom alerting rules

---

## 💡 Pro Tips

1. **Use N8N Variables**: Store webhook URLs in workflow variables for easy updates
2. **Add Request Timeout**: Set 10-second timeout on webhook HTTP requests
3. **Continue on Fail**: Configure webhook nodes to continue on failure (don't break main flow)
4. **Log Locally Too**: Also log to N8N's execution data for debugging
5. **Test Mode**: Add a "test mode" flag to avoid polluting production data

---

## 📞 Need Help?

If you need additional webhook endpoints for specific use cases, here are quick templates:

1. **Custom Event Webhook**: For any custom event you want to track
2. **Batch Processing Webhook**: For sending multiple events at once  
3. **Health Check Webhook**: For N8N to verify system is up
4. **Configuration Webhook**: To get dynamic configuration from your app

The current `/api/webhooks/error-report` endpoint is perfect for error logging, but implementing the full webhook strategy will give you complete visibility into your workflow execution!