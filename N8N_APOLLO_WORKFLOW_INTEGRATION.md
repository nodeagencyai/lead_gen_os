# N8N Apollo Workflow Integration Analysis

## 📊 Current Workflow Structure
```
[Webhook Trigger] → [Run Apify Actor] → [Wait for Completion] → [Get Dataset] → [Format URL] → [Filter Emails] → [Add to Supabase]
```

## 🎯 Recommended HTTP Request Integration Points

### **1. After Webhook Trigger (Workflow Start)**
**Position:** Between `Webhook` and `Run Actor`  
**Node Name:** "Notify Workflow Started"

```json
{
  "parameters": {
    "method": "POST",
    "url": "https://lead-gen-os.vercel.app/api/webhooks/workflow-status",
    "sendHeaders": true,
    "headerParameters": {
      "parameters": [
        {
          "name": "Content-Type",
          "value": "application/json"
        }
      ]
    },
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"workflow_name\": \"LeadGenOS (Apollo)\",\n  \"status\": \"started\",\n  \"campaign_name\": \"{{ $json.body.campaign_name || 'Manual Apollo Scrape' }}\",\n  \"timestamp\": \"{{ $now.toISO() }}\",\n  \"scrape_url\": \"{{ $json.body.url }}\",\n  \"requested_limit\": {{ $json.body.limit }}\n}",
    "options": {
      "timeout": 10000,
      "ignoreResponseCode": true
    }
  },
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 4.2,
  "position": [210, -220]
}
```

### **2. Error Handler for Run Actor**
**Position:** Connect error output of `Run Actor` node  
**Node Name:** "Report Actor Error"

```json
{
  "parameters": {
    "method": "POST",
    "url": "https://lead-gen-os.vercel.app/api/webhooks/error-report",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"workflow_name\": \"LeadGenOS (Apollo)\",\n  \"timestamp\": \"{{ $now.toISO() }}\",\n  \"error\": {\n    \"message\": \"{{ $json.error?.message || 'Failed to start Apify actor' }}\",\n    \"code\": \"APIFY_START_ERROR\",\n    \"details\": {{ JSON.stringify($json.error) }}\n  },\n  \"node_name\": \"Run Actor\",\n  \"lead_data\": {\n    \"url\": \"{{ $node['Webhook'].json.body.url }}\"\n  }\n}",
    "options": {
      "timeout": 10000,
      "ignoreResponseCode": true
    }
  }
}
```

### **3. After Get Dataset (Track Scraping Results)**
**Position:** Between `Get Dataset` and `Format URL`  
**Node Name:** "Report Scraping Results"

```json
{
  "parameters": {
    "method": "POST",
    "url": "https://lead-gen-os.vercel.app/api/webhooks/lead-processing",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"lead_source\": \"apollo\",\n  \"stage\": \"scraping\",\n  \"status\": \"completed\",\n  \"scrape_url\": \"{{ $node['Webhook'].json.body.url }}\",\n  \"total_scraped\": {{ $items().length }},\n  \"duration_ms\": {{ $now.diff($node['Webhook'].json.body.timestamp, 'milliseconds') }},\n  \"result_data\": {\n    \"actor_run_id\": \"{{ $node['Wait'].json.body.resource.id }}\",\n    \"dataset_id\": \"{{ $node['Wait'].json.body.resource.defaultDatasetId }}\"\n  }\n}",
    "options": {
      "timeout": 10000,
      "ignoreResponseCode": true
    }
  }
}
```

### **4. After Filter (Track Qualified Leads)**
**Position:** Between `Filter` and `Add Leads`  
**Node Name:** "Report Qualified Leads"

```json
{
  "parameters": {
    "method": "POST",
    "url": "https://lead-gen-os.vercel.app/api/webhooks/lead-processing",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"lead_source\": \"apollo\",\n  \"stage\": \"filtering\",\n  \"status\": \"completed\",\n  \"total_scraped\": {{ $node['Get Dataset'].json.length }},\n  \"total_qualified\": {{ $items().length }},\n  \"filter_rate\": {{ ($items().length / $node['Get Dataset'].json.length * 100).toFixed(2) }},\n  \"result_data\": {\n    \"filtered_out\": {{ $node['Get Dataset'].json.length - $items().length }},\n    \"filter_reason\": \"No email address\"\n  }\n}",
    "options": {
      "ignoreResponseCode": true
    }
  }
}
```

### **5. Split Node After Add Leads (Success/Error Tracking)**
**Position:** After `Add Leads` node  

#### **5a. Success Path - "Report Leads Added"**
```json
{
  "parameters": {
    "method": "POST",
    "url": "https://lead-gen-os.vercel.app/api/webhooks/lead-processing",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"lead_source\": \"apollo\",\n  \"stage\": \"database_update\",\n  \"status\": \"completed\",\n  \"leads_added\": {{ $items().length }},\n  \"result_data\": {\n    \"sample_leads\": {{ JSON.stringify($items().slice(0, 3).map(item => ({ name: item.json.full_name, company: item.json.company, email: item.json.email }))) }}\n  }\n}"
  }
}
```

#### **5b. Error Path - "Report Database Error"**
```json
{
  "parameters": {
    "method": "POST",
    "url": "https://lead-gen-os.vercel.app/api/webhooks/error-report",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"workflow_name\": \"LeadGenOS (Apollo)\",\n  \"timestamp\": \"{{ $now.toISO() }}\",\n  \"error\": {\n    \"message\": \"{{ $json.error?.message || 'Failed to add leads to database' }}\",\n    \"code\": \"DATABASE_INSERT_ERROR\"\n  },\n  \"node_name\": \"Add Leads\",\n  \"lead_data\": {\n    \"failed_count\": {{ $items().length }}\n  }\n}"
  }
}
```

### **6. Final Node - Workflow Complete**
**Position:** At the very end  
**Node Name:** "Notify Workflow Complete"

```json
{
  "parameters": {
    "method": "POST",
    "url": "https://lead-gen-os.vercel.app/api/webhooks/workflow-status",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"workflow_name\": \"LeadGenOS (Apollo)\",\n  \"status\": \"completed\",\n  \"processed_count\": {{ $node['Add Leads'].json.length }},\n  \"timestamp\": \"{{ $now.toISO() }}\",\n  \"summary\": {\n    \"total_scraped\": {{ $node['Get Dataset'].json.length }},\n    \"total_filtered\": {{ $node['Filter'].json.length }},\n    \"total_added\": {{ $items().length }},\n    \"execution_time_ms\": {{ $now.diff($node['Webhook'].json.body.timestamp, 'milliseconds') }}\n  }\n}"
  }
}
```

## 🔧 Critical Settings for All HTTP Request Nodes

```json
{
  "options": {
    "timeout": 10000,           // 10 second timeout
    "ignoreResponseCode": true, // Don't fail workflow if webhook fails
    "retry": {
      "maxTries": 2,           // Retry once if failed
      "waitBetweenTries": 1000 // Wait 1 second between retries
    }
  }
}
```

## 📍 Visual Workflow After Integration

```
[Webhook Trigger]
    ↓
[🆕 Notify Workflow Started]
    ↓
[Run Actor]
    ├─ Success → Continue
    └─ Error → [🆕 Report Actor Error]
    ↓
[Wait]
    ↓
[Get Dataset]
    ↓
[🆕 Report Scraping Results]
    ↓
[Format URL]
    ↓
[Filter]
    ↓
[🆕 Report Qualified Leads]
    ↓
[Add Leads]
    ├─ Success → [🆕 Report Leads Added]
    └─ Error → [🆕 Report Database Error]
    ↓
[🆕 Notify Workflow Complete]
```

## 🎯 Additional Recommendations

### **1. Add Batch Processing for Large Datasets**
If scraping > 100 leads, add a batch processor:

```javascript
// Code node after Filter
const batchSize = 50;
const batches = [];

for (let i = 0; i < $items().length; i += batchSize) {
  batches.push({
    json: {
      batch_number: Math.floor(i / batchSize) + 1,
      leads: $items().slice(i, i + batchSize)
    }
  });
}

return batches;
```

### **2. Add Data Enrichment Tracking**
If you add enrichment steps later, track them:

```json
{
  "url": "https://lead-gen-os.vercel.app/api/webhooks/lead-processing",
  "jsonBody": {
    "stage": "enrichment",
    "enrichment_source": "clearbit",
    "fields_enriched": ["company_size", "industry", "revenue"]
  }
}
```

### **3. Add Apify Cost Tracking**
Track Apify usage costs:

```json
{
  "url": "https://lead-gen-os.vercel.app/api/webhooks/api-usage",
  "jsonBody": {
    "api_service": "apify",
    "actor_name": "apollo-scraper",
    "compute_units": "{{ $node['Wait'].json.body.resource.usageUsd }}",
    "workflow_name": "LeadGenOS (Apollo)"
  }
}
```

### **4. Add Duplicate Detection**
Before adding to database, check for duplicates:

```javascript
// Add this as a Code node before "Add Leads"
const existingEmails = await $items("Get Existing Emails").map(item => item.json.email);
const newLeads = $items().filter(item => !existingEmails.includes(item.json.email));

// Then send duplicate report
if (newLeads.length < $items().length) {
  // HTTP Request to report duplicates found
}
```

## 🚨 Error Handling Best Practices

### **1. Apify Actor Timeout**
Add timeout handling for long-running actors:
- Set max wait time in Wait node: 300 seconds
- Add error path from Wait node for timeout

### **2. Empty Results Handling**
After Get Dataset, check if results are empty:
```javascript
if ($items().length === 0) {
  // Send webhook notification about empty results
  // Consider this a warning, not an error
}
```

### **3. Rate Limiting Protection**
Add delay between database inserts if processing many leads:
- Use SplitInBatches node
- Add 1-second delay between batches

## 📊 Monitoring Dashboard Benefits

With these webhooks, your dashboard will show:
- ✅ Real-time scraping progress
- ✅ Success/failure rates by URL pattern
- ✅ Average leads per scrape
- ✅ Filter effectiveness (% with emails)
- ✅ Database insertion success rate
- ✅ Total execution time trends
- ✅ Cost per lead calculations

## 🔑 Key Metrics to Track

1. **Scraping Efficiency**
   - Leads scraped vs. requested
   - Time per 100 leads
   - Success rate by URL pattern

2. **Data Quality**
   - % of leads with email
   - % of duplicates
   - Field completeness

3. **Performance**
   - Apify actor runtime
   - Database insertion time
   - Total workflow duration

4. **Costs**
   - Apify compute units used
   - Cost per qualified lead
   - Monthly usage trends