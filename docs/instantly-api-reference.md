# Instantly API v2 - Complete Endpoints Reference

## Base URL
`https://api.instantly.ai/api/v2`

## Authentication
- **Method:** Bearer Token
- **Header:** `Authorization: Bearer YOUR_API_KEY`
- **Note:** You need a v2 API key (not compatible with v1)

---

## 🚀 Campaign Management

### Campaign CRUD Operations
- **POST** `/campaigns` - Create a new campaign
- **GET** `/campaigns` - List all campaigns (with pagination and filters)
- **GET** `/campaigns/{campaign_id}` - Get specific campaign details
- **PATCH** `/campaigns/{campaign_id}` - Update campaign details
- **DELETE** `/campaigns/{campaign_id}` - Delete a campaign

### Campaign Control
- **POST** `/campaigns/{campaign_id}/activate` - Launch/activate a campaign
- **POST** `/campaigns/{campaign_id}/pause` - Pause a campaign
- **POST** `/campaigns/{campaign_id}/set-schedule` - Set campaign schedule
- **POST** `/campaigns/{campaign_id}/add-account` - Add sending account to campaign
- **POST** `/campaigns/{campaign_id}/remove-account` - Remove sending account from campaign

---

## 👥 Lead Management

### Lead Operations
- **POST** `/leads` - Add a single lead to a campaign
- **POST** `/leads/bulk` - Add multiple leads to campaigns
- **POST** `/leads/list` - Search/filter leads (uses POST due to complex filters)
- **GET** `/leads/{lead_id}` - Get specific lead details
- **PATCH** `/leads/{lead_id}` - Update lead information
- **DELETE** `/leads/{lead_id}` - Delete a lead
- **POST** `/leads/{lead_id}/update-status` - Update lead interest status

### Lead Variables
- **POST** `/leads/{lead_id}/variables/set` - Set custom lead variables
- **POST** `/leads/{lead_id}/variables/update` - Update lead variables
- **POST** `/leads/{lead_id}/variables/delete` - Delete lead variables

---

## 📋 Lead Lists

### Lead List Management
- **POST** `/lead-lists` - Create a new lead list
- **GET** `/lead-lists` - List all lead lists
- **GET** `/lead-lists/{list_id}` - Get specific lead list
- **PATCH** `/lead-lists/{list_id}` - Update lead list
- **DELETE** `/lead-lists/{list_id}` - Delete lead list

---

## 📧 Email Account Management

### Account Operations
- **GET** `/accounts` - List all email accounts
- **GET** `/accounts/{account_id}` - Get specific account details
- **POST** `/accounts/test/vitals` - Check account health/vitals
- **GET** `/accounts/status` - Get account status
- **POST** `/accounts/enable-warmup` - Enable warmup for accounts
- **POST** `/accounts/pause-warmup` - Pause warmup for accounts
- **POST** `/accounts/mark-as-fixed` - Mark accounts as fixed
- **DELETE** `/accounts/{account_id}` - Delete an account

---

## 📊 Analytics & Reporting

### Campaign Analytics
- **GET** `/campaigns/analytics` - Get campaign analytics (overall)
- **GET** `/campaigns/analytics/overview` - Get campaign analytics overview
- **GET** `/campaigns/analytics/daily` - Get daily campaign analytics
- **GET** `/campaigns/analytics/steps` - Get step-by-step campaign analytics

### Account Analytics
- **POST** `/accounts/warmup-analytics` - Get warmup analytics for accounts

---

## 📨 Email & Unibox

### Email Management
- **GET** `/emails` - List emails
- **GET** `/emails/{email_id}` - Get specific email
- **POST** `/emails/threads/{thread_id}/mark-as-read` - Mark email thread as read
- **POST** `/emails/reply` - Send reply to email
- **GET** `/emails/count-unread` - Count unread emails

---

## 🔐 API Key Management

### API Key Operations
- **POST** `/api-keys` - Create new API key
- **GET** `/api-keys` - List all API keys
- **GET** `/api-keys/{key_id}` - Get specific API key
- **DELETE** `/api-keys/{key_id}` - Delete API key

---

## 🏷️ Tags & Labels

### Tag Management
- **POST** `/tags` - Create a new tag
- **GET** `/tags/{tag_id}` - Get tag by ID
- **GET** `/tags` - List all tags
- **PATCH** `/tags/{tag_id}` - Update tag
- **DELETE** `/tags/{tag_id}` - Delete tag

---

## 🚫 Blocklist Management

### Blocklist Operations
- **POST** `/blocklist/entries` - Add entries to blocklist
- **POST** `/blocklist/entries/remove` - Remove entries from blocklist
- **GET** `/blocklist/entries` - List blocklist entries

---

## 📝 Audit Logs

### Audit Operations
- **GET** `/audit-logs` - List audit logs for workspace activities

---

## 👨‍💼 Workspace Management

### Workspace Operations
- **GET** `/workspaces` - List workspaces
- **GET** `/workspace-members` - List workspace members
- **GET** `/workspace-groups` - List workspace groups

---

## 🔧 Common Query Parameters

### Pagination
- `limit` - Number of items per page (default: 20, max: 100)
- `starting_after` - Cursor for pagination

### Filtering
- `search` - Search term for filtering results
- `status` - Filter by status (campaigns, leads, etc.)
- `campaign_id` - Filter by campaign ID
- `start_date` / `end_date` - Date range filtering

### Campaign Status Values
- `0` - Draft
- `1` - Active  
- `2` - Paused
- `3` - Completed
- `4` - Running Subsequences

---

## 🎯 API Scopes

Common scopes for API keys:
- `campaigns:all` - Full campaign access
- `campaigns:create` - Create campaigns
- `campaigns:read` - Read campaigns
- `campaigns:update` - Update campaigns
- `campaigns:delete` - Delete campaigns
- `leads:all` - Full lead access
- `leads:create` - Create leads
- `leads:read` - Read leads
- `leads:update` - Update leads
- `accounts:all` - Full account access
- `analytics:read` - Read analytics
- `all:all` - Full access to everything

---

## 📋 Example Usage

### Create Campaign
```bash
curl -X POST https://api.instantly.ai/api/v2/campaigns \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Campaign",
    "campaign_schedule": {
      "schedules": [{
        "name": "Business Hours",
        "timing": {"from": "09:00", "to": "17:00"},
        "days": {},
        "timezone": "America/New_York"
      }]
    }
  }'
```

### Add Lead to Campaign
```bash
curl -X POST https://api.instantly.ai/api/v2/leads \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "campaign": "CAMPAIGN_ID",
    "email": "lead@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "custom_variables": {
      "company": "Example Corp",
      "position": "CEO"
    }
  }'
```

### Get Campaign Analytics
```bash
curl -X GET "https://api.instantly.ai/api/v2/campaigns/analytics?id=CAMPAIGN_ID" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## 🚨 Important Notes

1. **API v2 is NOT compatible with v1** - You need new API keys
2. **Bearer token authentication** required for all requests
3. **Rate limiting** applies - check response headers for limits
4. **Pagination** uses cursor-based system with `starting_after`
5. **Scopes** control what each API key can access
6. **All timestamps** are in ISO 8601 format (UTC)
7. **API v1 will be deprecated in 2025** - migrate to v2 ASAP

---

## 📚 Resources

- **Interactive Documentation:** https://developer.instantly.ai/api/v2
- **Main Documentation:** https://developer.instantly.ai/
- **Help Center:** https://help.instantly.ai/en/articles/10432807-api-v2

---

## 🔗 Integration Notes for LeadGenOS

### Current Implementation
- Located in `src/services/integrationService.ts`
- Uses API v1 endpoints (needs migration to v2)
- Implements campaign fetching and analytics

### Migration Requirements
1. Update base URL to v2
2. Change authentication from API key header to Bearer token
3. Update campaign status mapping (0-4 instead of strings)
4. Implement new pagination system
5. Update sequence fetching to use campaign details endpoint

### Key Endpoints for Our Use Case
- `GET /campaigns` - List campaigns for dashboard
- `GET /campaigns/{id}` - Get campaign details including sequences
- `GET /campaigns/analytics` - Get campaign performance metrics
- `POST /leads/list` - Search and filter leads
- `GET /accounts` - Get email account information

---

*Document created: 2025-01-30*
*Last updated: 2025-01-30*
*Source: Official Instantly API v2 Documentation*