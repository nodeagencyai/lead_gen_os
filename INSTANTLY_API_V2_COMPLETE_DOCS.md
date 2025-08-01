# Instantly.ai API v2 Complete Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Authentication](#authentication)
3. [API Scopes](#api-scopes)
4. [Base URL & Headers](#base-url--headers)
5. [Response Format](#response-format)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [API Entities](#api-entities)
   - [Campaigns](#campaigns)
   - [Leads](#leads)
   - [Accounts](#accounts)
   - [Analytics](#analytics)
   - [Lead Lists](#lead-lists)
   - [Block List Entries](#block-list-entries)
   - [API Keys](#api-keys)
   - [Workspaces](#workspaces)
   - [Custom Tags](#custom-tags)
   - [Webhooks](#webhooks)
9. [Complete Endpoint Reference](#complete-endpoint-reference)
10. [Code Examples](#code-examples)
11. [Best Practices](#best-practices)

## Introduction

The Instantly.ai API v2 is a complete rewrite with significant improvements over v1, including API scopes for enhanced security, double the number of endpoints, and strict adherence to REST API standards. The v1 API is deprecated and will be removed in 2025.

### Key Features
- Bearer token authentication with improved security
- API scopes for granular permissions control
- Snake_case naming conventions following REST standards
- Available on Growth plan and above
- Interactive documentation with live testing capabilities

### Important Migration Notes
- API v2 has NO compatibility with v1 - you need a new API key
- All endpoints use different paths and request/response formats
- Multiple API keys can be created with different scopes

## Authentication

### Bearer Token Authentication
API v2 uses Bearer token authentication, which is more secure than the previous version.

```javascript
const headers = {
  'Authorization': 'Bearer YOUR_API_KEY_HERE',
  'Content-Type': 'application/json'
};
```

### Getting Your API Key
1. Log into your Instantly account
2. Navigate to Settings → Integrations
3. Generate a new API v2 key (v1 keys will not work)
4. Configure the required scopes for your use case

## API Scopes

API v2 introduces granular scope-based permissions for enhanced security. Each API key can be restricted to specific operations.

### Available Scopes

#### General Scopes
- `all:all` - Full access to all endpoints
- `all:create` - Create permissions across all entities
- `all:read` - Read permissions across all entities
- `all:update` - Update permissions across all entities
- `all:delete` - Delete permissions across all entities

#### Campaign Scopes
- `campaigns:all` - Full campaign access
- `campaigns:create` - Create campaigns
- `campaigns:read` - Read campaign data
- `campaigns:update` - Update campaigns
- `campaigns:delete` - Delete campaigns

#### Lead Scopes
- `leads:all` - Full lead access
- `leads:create` - Create leads
- `leads:read` - Read lead data
- `leads:update` - Update leads
- `leads:delete` - Delete leads

#### Account Scopes
- `accounts:all` - Full account access
- `accounts:create` - Create accounts
- `accounts:read` - Read account data
- `accounts:update` - Update accounts
- `accounts:delete` - Delete accounts

#### Additional Scopes
- `lead_lists:all`, `lead_lists:create`, `lead_lists:read`, `lead_lists:update`, `lead_lists:delete`
- `block_list_entries:all`, `block_list_entries:create`, `block_list_entries:read`, `block_list_entries:update`, `block_list_entries:delete`
- `api_keys:all`, `api_keys:create`, `api_keys:read`, `api_keys:update`, `api_keys:delete`
- `ai_agents:all`, `ai_agents:create`, `ai_agents:read`, `ai_agents:update`, `ai_agents:delete`

## Base URL & Headers

### Base URL
```
https://api.instantly.ai/api/v2
```

### Standard Headers
```javascript
{
  'Authorization': 'Bearer YOUR_API_KEY',
  'Content-Type': 'application/json',
  'Accept': 'application/json'
}
```

## Response Format

All API responses follow a consistent JSON format:

### Success Response
```json
{
  "id": "01985969-5456-7372-9610-956111588a3a",
  "timestamp_created": "2025-07-30T03:38:51.863Z",
  "timestamp_updated": "2025-07-30T03:38:51.863Z",
  // ... entity-specific fields
}
```

### List Response
```json
{
  "items": [
    {
      "id": "...",
      // ... entity data
    }
  ],
  "next_starting_after": "01985969-5456-7372-9610-956111588a3a",
  "has_more": true
}
```

### Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "invalid-email"
    }
  }
}
```

## Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid API key)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `429` - Too Many Requests (rate limiting)
- `500` - Internal Server Error

### Error Response Structure
```javascript
{
  error: {
    code: string,
    message: string,
    details?: object
  }
}
```

## Rate Limiting

### Default Limits
- Standard plans: ~100 requests per minute
- Higher plans: Increased limits based on subscription
- Batch operations recommended for bulk operations

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1628097600
```

### Best Practices
- Implement exponential backoff for 429 responses
- Use batch endpoints when available
- Cache frequently accessed data
- Monitor rate limit headers

## API Entities

### Campaigns

A campaign represents an email sequence that can be sent to a list of recipients.

#### Campaign Object
```typescript
interface Campaign {
  id: string;
  name: string;
  status: 1 | 2 | 3; // 1: Active, 2: Paused, 3: Completed
  is_evergreen: boolean;
  timestamp_created: string;
  timestamp_updated: string;
  organization: string;
  pl_value: number;
  campaign_schedule: {
    start_date: string;
    end_date: string;
    schedules: Array<{
      name: string;
      timing: {
        from: string; // "09:00" format
        to: string;   // "17:00" format
      };
      days: object;
      timezone: string; // e.g., "America/New_York"
    }>;
  };
  sequences: Array<{
    steps: Array<{
      subject: string;
      body: string;
      delay_days: number;
    }>;
  }>;
  email_gap: number;
  random_wait_max: number;
  text_only: boolean;
  email_list: string[];
  daily_limit: number;
  stop_on_reply: boolean;
  email_tag_list: string[];
  link_tracking: boolean;
  open_tracking: boolean;
  stop_on_auto_reply: boolean;
  daily_max_leads: number;
  prioritize_new_leads: boolean;
  auto_variant_select: {
    trigger: string;
  };
  match_lead_esp: boolean;
  stop_for_company: boolean;
  insert_unsubscribe_header: boolean;
  allow_risky_contacts: boolean;
  disable_bounce_protect: boolean;
  cc_list: string[];
  bcc_list: string[];
}
```

#### Campaign Status Values
- `1` - Active
- `2` - Paused  
- `3` - Completed

### Leads

A lead entity represents an individual lead that can be added to campaigns.

#### Lead Object
```typescript
interface Lead {
  id: string;
  timestamp_created: string;
  timestamp_updated: string;
  organization: string;
  campaign: string;
  status: 1 | 2 | 3 | -1 | -2 | -3;
  status_summary?: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  website?: string;
  phone?: string;
  personalization?: string;
  custom_variables: Record<string, string | number | boolean | null>;
  last_step_id?: string;
  last_step_timestamp?: string;
  interest_status: 0 | 1 | 2 | 3 | 4 | -1 | -2 | -3;
  verification_status: 1 | 11 | 12 | -1 | -2 | -3 | -4;
  subsequence_added_timestamp?: string;
  last_contacted_timestamp?: string;
  last_opened_timestamp?: string;
  last_replied_timestamp?: string;
  last_interest_status_change_timestamp?: string;
  last_clicked_timestamp?: string;
  enrichment_status: 1 | 11 | -1 | -2;
  uploaded_by?: string;
  upload_method: "manual" | "api" | "website-visitor";
  assigned_to?: string;
  last_touch_timestamp?: string;
  email_open_count: number;
  email_reply_count: number;
  email_click_count: number;
  company_domain?: string;
}
```

#### Lead Status Values
- `1` - Active
- `2` - Paused
- `3` - Completed
- `-1` - Bounced
- `-2` - Unsubscribed
- `-3` - Skipped

#### Interest Status Values
- `0` - Out of Office
- `1` - Interested
- `2` - Meeting Booked
- `3` - Meeting Completed
- `4` - Closed
- `-1` - Not Interested
- `-2` - Wrong Person
- `-3` - Lost

#### Verification Status Values
- `1` - Verified
- `11` - Pending
- `12` - Pending Verification Job
- `-1` - Invalid
- `-2` - Risky
- `-3` - Catch All
- `-4` - Job Change

#### Custom Variables Rules
Custom variables can contain any key, but values must be of type string, number, boolean, or null. Objects and arrays are NOT allowed.

```javascript
// ✅ Valid custom variables
custom_variables: {
  company_size: "50-100",
  is_enterprise: true,
  revenue: 1000000,
  notes: null
}

// ❌ Invalid custom variables
custom_variables: {
  contacts: ["email1", "email2"], // Arrays not allowed
  address: { street: "123 Main" } // Objects not allowed
}
```

### Accounts

An email account that can be used to send campaigns.

#### Account Object
```typescript
interface Account {
  email: string;
  timestamp_created: string;
  timestamp_updated: string;
  organization_id: string;
  first_name: string;
  last_name: string;
  warmup_status: 0 | 1 | -1 | -2 | -3;
  provider_code: 1 | 2 | 3 | 4;
  added_by?: string;
  modified_by?: string;
  status: 1 | 2 | -1 | -2 | -3;
  last_used_timestamp?: string;
  warmup_started_timestamp?: string;
  warmup_pool_id?: string;
  warmup: {
    limit: number;
    advanced: object;
  };
  imap_username: string;
  imap_password: string;
  imap_host: string;
  imap_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_host: string;
  smtp_port: number;
  email_gap: number; // Gap between emails in minutes
}
```

#### Account Status Values
- `1` - Active
- `2` - Paused
- `-1` - Connection Error
- `-2` - Soft Bounce Error
- `-3` - Sending Error

#### Warmup Status Values
- `0` - Paused
- `1` - Active
- `-1` - Banned
- `-2` - Spam Folder Unknown
- `-3` - Permanent Suspension

#### Provider Codes
- `1` - Custom IMAP/SMTP
- `2` - Gmail
- `3` - Microsoft
- `4` - AWS

### Analytics

Analytics endpoints provide comprehensive campaign performance data.

#### Campaign Analytics Object
```typescript
interface CampaignAnalytics {
  campaign_name: string;
  campaign_id: string;
  campaign_status: number;
  campaign_is_evergreen: boolean;
  leads_count: number;
  contacted_count: number;
  open_count: number;
  reply_count: number;
  link_click_count: number;
  bounced_count: number;
  unsubscribed_count: number;
  completed_count: number;
  emails_sent_count: number;
  new_leads_contacted_count: number;
  total_opportunities: number;
  total_opportunity_value: number;
}
```

#### Analytics Overview Object
```typescript
interface AnalyticsOverview {
  open_count: number;
  open_count_unique: number;
  open_count_unique_by_step: number;
  link_click_count: number;
  link_click_count_unique: number;
  link_click_count_unique_by_step: number;
  reply_count: number;
  reply_count_unique: number;
  reply_count_unique_by_step: number;
  bounced_count: number;
  unsubscribed_count: number;
  completed_count: number;
  emails_sent_count: number;
  new_leads_contacted_count: number;
  total_opportunities: number;
  total_opportunity_value: number;
  total_interested: number;
  total_meeting_booked: number;
  total_meeting_completed: number;
  total_closed: number;
}
```

#### Daily Analytics Object
```typescript
interface DailyAnalytics {
  date: string; // "2025-03-01"
  sent: number;
  opened: number;
  unique_opened: number;
  replies: number;
  unique_replies: number;
  clicks: number;
  unique_clicks: number;
}
```

#### Step Analytics Object
```typescript
interface StepAnalytics {
  step: string;
  variant: string;
  sent: number;
  opened: number;
  unique_opened: number;
  replies: number;
  unique_replies: number;
  clicks: number;
  unique_clicks: number;
}
```

### Lead Lists

A list used to store leads for organization and management.

#### Lead List Object
```typescript
interface LeadList {
  id: string;
  organization_id: string;
  has_enrichment_task: boolean;
  owned_by: string;
  name: string;
  timestamp_created: string;
}
```

### Block List Entries

A blocked email or domain to prevent sending campaigns to specific contacts.

#### Block List Entry Object
```typescript
interface BlockListEntry {
  id: string;
  timestamp_created: string;
  organization_id: string;
  bl_value: string; // Email or domain
  is_domain: boolean;
}
```

### API Keys

API keys for accessing the Instantly API with configurable scopes.

#### API Key Object
```typescript
interface ApiKey {
  id: string;
  name: string;
  scopes: string[];
  key: string;
  organization_id: string;
  timestamp_created: string;
  timestamp_updated: string;
}
```

### Workspaces

Workspace entity representing your Instantly workspace.

#### Workspace Object
```typescript
interface Workspace {
  id: string;
  name: string;
  organization_id: string;
  // Additional workspace fields
}
```

### Custom Tags

Custom tags for organizing and categorizing accounts and campaigns. Can be used as filters in APIs.

#### Custom Tag Object
```typescript
interface CustomTag {
  id: string;
  name: string;
  color?: string;
  organization_id: string;
  timestamp_created: string;
  timestamp_updated: string;
}
```

### Webhooks

Webhooks allow you to receive real-time notifications about campaign events.

#### Webhook Event Schema
```typescript
interface WebhookEvent {
  // Base Fields (Always Present)
  timestamp: string; // ISO timestamp
  event_type: string;
  workspace: string; // UUID
  campaign_id: string; // UUID
  campaign_name: string;
  
  // Optional Fields
  lead_email?: string;
  email_account?: string;
  unibox_url?: string; // For reply events
  
  // Step Information
  step?: number; // Starting at 1
  variant?: number; // Starting at 1
  is_first?: boolean;
  
  // Email Information
  email_id?: string;
  email_subject?: string;
  email_text?: string;
  email_html?: string;
  
  // Reply Information (for reply events)
  reply_text_snippet?: string;
  reply_subject?: string;
  reply_text?: string;
  reply_html?: string;
  
  // Lead Data (merged from database)
  [key: string]: any;
}
```

#### Webhook Event Types
```typescript
// Email Events
"email_sent"
"email_opened"
"reply_received"
"auto_reply_received"
"link_clicked"
"email_bounced"
"lead_unsubscribed"
"account_error"
"campaign_completed"

// Lead Status Events
"lead_neutral"
"lead_interested"
"lead_not_interested"

// Meeting Events
"lead_meeting_booked"
"lead_meeting_completed"

// Other Lead Events
"lead_closed"
"lead_out_of_office"
"lead_wrong_person"

// Custom Labels
// Any custom label configured in your workspace
```

## Complete Endpoint Reference

### Campaigns

#### Create Campaign
```http
POST /api/v2/campaigns
```

**Required Scopes:** `campaigns:create`, `campaigns:all`, `all:create`, `all:all`

**Request Body:**
```json
{
  "name": "My First Campaign",
  "campaign_schedule": {
    "schedules": [
      {
        "name": "My Schedule",
        "timing": {
          "from": "09:00",
          "to": "17:00"
        },
        "days": {},
        "timezone": "America/New_York"
      }
    ]
  },
  "sequences": [
    {
      "steps": [
        {
          "subject": "Hello {{first_name}}",
          "body": "Hi {{first_name}}, how are you?",
          "delay_days": 0
        },
        {
          "subject": "Follow up",
          "body": "Just following up on my previous email.",
          "delay_days": 3
        }
      ]
    }
  ],
  "daily_limit": 50,
  "email_gap": 10,
  "stop_on_reply": true,
  "link_tracking": true,
  "open_tracking": true
}
```

#### List Campaigns
```http
GET /api/v2/campaigns?limit=10&search=Campaign Name&starting_after=UUID
```

**Required Scopes:** `campaigns:read`, `campaigns:all`, `all:read`, `all:all`

**Query Parameters:**
- `limit` (optional): Number of campaigns to return (default: 10)
- `search` (optional): Search term for campaign names
- `starting_after` (optional): UUID for pagination
- `tag_ids` (optional): Comma-separated tag IDs to filter by

#### Get Campaign
```http
GET /api/v2/campaigns/{id}
```

**Required Scopes:** `campaigns:read`, `campaigns:all`, `all:read`, `all:all`

#### Update Campaign
```http
PATCH /api/v2/campaigns/{id}
```

**Required Scopes:** `campaigns:update`, `campaigns:all`, `all:update`, `all:all`

#### Delete Campaign
```http
DELETE /api/v2/campaigns/{id}
```

**Required Scopes:** `campaigns:delete`, `campaigns:all`, `all:delete`, `all:all`

#### Launch Campaign
```http
POST /api/v2/campaigns/{id}/launch
```

**Required Scopes:** `campaigns:update`, `campaigns:all`, `all:update`, `all:all`

#### Pause Campaign
```http
POST /api/v2/campaigns/{id}/pause
```

**Required Scopes:** `campaigns:update`, `campaigns:all`, `all:update`, `all:all`

### Leads

#### Create Lead
```http
POST /api/v2/leads
```

**Required Scopes:** `leads:create`, `leads:all`, `all:create`, `all:all`

**Request Body:**
```json
{
  "campaign": "campaign_id_here",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "company_name": "Example Corp",
  "website": "https://example.com",
  "phone": "+1234567890",
  "custom_variables": {
    "job_title": "CEO",
    "company_size": "50-100",
    "industry": "Technology",
    "lead_source": "api_upload"
  }
}
```

#### List Leads
```http
POST /api/v2/leads/list
```

**Required Scopes:** `leads:read`, `leads:all`, `all:read`, `all:all`

**Request Body:**
```json
{
  "filters": {
    "campaign": "campaign_id",
    "status": 1,
    "interest_status": 1,
    "email": "john@example.com"
  },
  "limit": 50,
  "starting_after": "lead_id"
}
```

#### Get Lead
```http
GET /api/v2/leads/{id}
```

**Required Scopes:** `leads:read`, `leads:all`, `all:read`, `all:all`

#### Update Lead
```http
PATCH /api/v2/leads/{id}
```

**Required Scopes:** `leads:update`, `leads:all`, `all:update`, `all:all`

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "custom_variables": {
    "job_title": "CTO"
  }
}
```

#### Delete Lead
```http
DELETE /api/v2/leads/{id}
```

**Required Scopes:** `leads:delete`, `leads:all`, `all:delete`, `all:all`

#### Update Lead Interest Status
```http
POST /api/v2/leads/update-interest-status
```

**Required Scopes:** `leads:update`, `leads:all`, `all:update`, `all:all`

**Request Body:**
```json
{
  "lead_email": "john@example.com",
  "interest_value": 1
}
```

#### Move Leads to Campaign or List
```http
POST /api/v2/leads/move
```

**Required Scopes:** `leads:update`, `leads:all`, `all:update`, `all:all`

**Request Body:**
```json
{
  "lead_ids": ["lead_id_1", "lead_id_2"],
  "destination_campaign_id": "campaign_id",
  // OR
  "destination_list_id": "list_id"
}
```

#### Remove Lead from Subsequence
```http
POST /api/v2/leads/subsequence/remove
```

**Required Scopes:** `leads:update`, `leads:all`, `all:update`, `all:all`

**Request Body:**
```json
{
  "id": "lead_id"
}
```

#### Bulk Assign Leads to Users
```http
POST /api/v2/leads/bulk-assign
```

**Required Scopes:** `leads:update`, `leads:all`, `all:update`, `all:all`

**Request Body:**
```json
{
  "lead_ids": ["lead_id_1", "lead_id_2"],
  "assigned_to": "user_id"
}
```

### Accounts

#### Create Account
```http
POST /api/v2/accounts
```

**Required Scopes:** `accounts:create`, `accounts:all`, `all:create`, `all:all`

**Request Body:**
```json
{
  "email": "sender@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "provider_code": 2,
  "imap_username": "sender@gmail.com",
  "imap_password": "app_password",
  "imap_host": "imap.gmail.com",
  "imap_port": 993,
  "smtp_username": "sender@gmail.com",
  "smtp_password": "app_password",
  "smtp_host": "smtp.gmail.com",
  "smtp_port": 587,
  "email_gap": 10
}
```

#### List Accounts
```http
GET /api/v2/accounts?limit=10&search=email@example.com
```

**Required Scopes:** `accounts:read`, `accounts:all`, `all:read`, `all:all`

#### Get Account
```http
GET /api/v2/accounts/{email}
```

**Required Scopes:** `accounts:read`, `accounts:all`, `all:read`, `all:all`

#### Update Account
```http
PATCH /api/v2/accounts/{email}
```

**Required Scopes:** `accounts:update`, `accounts:all`, `all:update`, `all:all`

#### Delete Account
```http
DELETE /api/v2/accounts/{email}
```

**Required Scopes:** `accounts:delete`, `accounts:all`, `all:delete`, `all:all`

#### Test Account Vitals
```http
POST /api/v2/accounts/test/vitals
```

**Required Scopes:** `accounts:read`, `accounts:all`, `all:read`, `all:all`

**Request Body:**
```json
{
  "emails": ["account1@example.com", "account2@example.com"]
}
```

### Analytics

#### Get Campaign Analytics
```http
GET /api/v2/campaigns/analytics?id=campaign_id&start_date=2024-01-01&end_date=2024-12-31
```

**Required Scopes:** `campaigns:read`, `campaigns:all`, `all:read`, `all:all`

**Query Parameters:**
- `id` (optional): Specific campaign ID
- `ids` (optional): Comma-separated campaign IDs
- `start_date` (optional): Start date (YYYY-MM-DD)
- `end_date` (optional): End date (YYYY-MM-DD)
- `exclude_total_leads_count` (optional): Exclude total leads for faster response

#### Get Campaign Analytics Overview
```http
GET /api/v2/campaigns/analytics/overview?id=campaign_id&start_date=2024-01-01&end_date=2024-12-31
```

**Required Scopes:** `campaigns:read`, `campaigns:all`, `all:read`, `all:all`

#### Get Daily Campaign Analytics
```http
GET /api/v2/campaigns/analytics/daily?campaign_id=campaign_id&start_date=2024-01-01&end_date=2024-12-31
```

**Required Scopes:** `campaigns:read`, `campaigns:all`, `all:read`, `all:all`

#### Get Campaign Steps Analytics
```http
GET /api/v2/campaigns/analytics/steps?campaign_id=campaign_id&start_date=2024-01-01&end_date=2024-12-31
```

**Required Scopes:** `campaigns:read`, `campaigns:all`, `all:read`, `all:all`

#### Get Account Warmup Analytics
```http
POST /api/v2/accounts/warmup-analytics
```

**Required Scopes:** `accounts:read`, `accounts:all`, `all:read`, `all:all`

**Request Body:**
```json
{
  "emails": ["account1@example.com", "account2@example.com"]
}
```

**Response:**
```json
{
  "account1@example.com": {
    "2023-10-01": {
      "sent": 10,
      "landed_inbox": 8,
      "landed_spam": 2,
      "received": 10
    }
  }
}
```

### Lead Lists

#### Create Lead List
```http
POST /api/v2/lead-lists
```

**Required Scopes:** `lead_lists:create`, `lead_lists:all`, `all:create`, `all:all`

**Request Body:**
```json
{
  "name": "My Lead List",
  "owned_by": "user_id"
}
```

#### List Lead Lists
```http
GET /api/v2/lead-lists?limit=10&search=List Name
```

**Required Scopes:** `lead_lists:read`, `lead_lists:all`, `all:read`, `all:all`

#### Get Lead List
```http
GET /api/v2/lead-lists/{id}
```

**Required Scopes:** `lead_lists:read`, `lead_lists:all`, `all:read`, `all:all`

#### Update Lead List
```http
PATCH /api/v2/lead-lists/{id}
```

**Required Scopes:** `lead_lists:update`, `lead_lists:all`, `all:update`, `all:all`

#### Delete Lead List
```http
DELETE /api/v2/lead-lists/{id}
```

**Required Scopes:** `lead_lists:delete`, `lead_lists:all`, `all:delete`, `all:all`

### Block List Entries

#### Create Block List Entry
```http
POST /api/v2/block-lists-entries
```

**Required Scopes:** `block_list_entries:create`, `block_list_entries:all`, `all:create`, `all:all`

**Request Body:**
```json
{
  "bl_value": "spam@example.com",
  "is_domain": false
}
```

For domain blocking:
```json
{
  "bl_value": "spammy-domain.com",
  "is_domain": true
}
```

#### List Block List Entries
```http
GET /api/v2/block-lists-entries?limit=10&search=example.com&domains_only=true
```

**Required Scopes:** `block_list_entries:read`, `block_list_entries:all`, `all:read`, `all:all`

#### Get Block List Entry
```http
GET /api/v2/block-lists-entries/{id}
```

**Required Scopes:** `block_list_entries:read`, `block_list_entries:all`, `all:read`, `all:all`

#### Update Block List Entry
```http
PATCH /api/v2/block-lists-entries/{id}
```

**Required Scopes:** `block_list_entries:update`, `block_list_entries:all`, `all:update`, `all:all`

#### Delete Block List Entry
```http
DELETE /api/v2/block-lists-entries/{id}
```

**Required Scopes:** `block_list_entries:delete`, `block_list_entries:all`, `all:delete`, `all:all`

### API Keys

#### Create API Key
```http
POST /api/v2/api-keys
```

**Required Scopes:** `api_keys:create`, `api_keys:all`, `all:create`, `all:all`

**Request Body:**
```json
{
  "name": "My API Key",
  "scopes": [
    "campaigns:read",
    "leads:all",
    "accounts:read"
  ]
}
```

#### List API Keys
```http
GET /api/v2/api-keys?limit=10
```

**Required Scopes:** `api_keys:read`, `api_keys:all`, `all:read`, `all:all`

#### Get API Key
```http
GET /api/v2/api-keys/{id}
```

**Required Scopes:** `api_keys:read`, `api_keys:all`, `all:read`, `all:all`

#### Update API Key
```http
PATCH /api/v2/api-keys/{id}
```

**Required Scopes:** `api_keys:update`, `api_keys:all`, `all:update`, `all:all`

#### Delete API Key
```http
DELETE /api/v2/api-keys/{id}
```

**Required Scopes:** `api_keys:delete`, `api_keys:all`, `all:delete`, `all:all`

### Workspaces

#### Get Current Workspace
```http
GET /api/v2/workspaces/current
```

**Required Scopes:** `workspaces:read`, `workspaces:all`, `all:read`, `all:all`

#### Update Current Workspace
```http
PATCH /api/v2/workspaces/current
```

**Required Scopes:** `workspaces:update`, `workspaces:all`, `all:update`, `all:all`

## Code Examples

### JavaScript SDK Class
```javascript
class InstantlyAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.instantly.ai/api/v2';
    this.headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  async request(method, endpoint, data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const config = {
      method,
      headers: this.headers
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API Error: ${response.status} - ${error.message || 'Unknown error'}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // Campaign methods
  async createCampaign(campaignData) {
    return this.request('POST', '/campaigns', campaignData);
  }

  async getCampaigns(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/campaigns${query ? '?' + query : ''}`);
  }

  async getCampaign(id) {
    return this.request('GET', `/campaigns/${id}`);
  }

  async updateCampaign(id, updates) {
    return this.request('PATCH', `/campaigns/${id}`, updates);
  }

  async launchCampaign(id) {
    return this.request('POST', `/campaigns/${id}/launch`);
  }

  async pauseCampaign(id) {
    return this.request('POST', `/campaigns/${id}/pause`);
  }

  // Lead methods
  async createLead(leadData) {
    return this.request('POST', '/leads', leadData);
  }

  async createLeads(leadsArray) {
    const results = [];
    for (const lead of leadsArray) {
      try {
        const result = await this.createLead(lead);
        results.push({ success: true, lead, result });
      } catch (error) {
        results.push({ success: false, lead, error: error.message });
      }
    }
    return results;
  }

  async listLeads(filters = {}) {
    return this.request('POST', '/leads/list', { filters });
  }

  async getLead(id) {
    return this.request('GET', `/leads/${id}`);
  }

  async updateLead(id, updates) {
    return this.request('PATCH', `/leads/${id}`, updates);
  }

  async updateLeadInterestStatus(email, interestValue) {
    return this.request('POST', '/leads/update-interest-status', {
      lead_email: email,
      interest_value: interestValue
    });
  }

  async moveLeads(leadIds, destinationCampaignId = null, destinationListId = null) {
    const data = { lead_ids: leadIds };
    if (destinationCampaignId) data.destination_campaign_id = destinationCampaignId;
    if (destinationListId) data.destination_list_id = destinationListId;
    return this.request('POST', '/leads/move', data);
  }

  // Account methods
  async createAccount(accountData) {
    return this.request('POST', '/accounts', accountData);
  }

  async getAccounts(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/accounts${query ? '?' + query : ''}`);
  }

  async getAccount(email) {
    return this.request('GET', `/accounts/${email}`);
  }

  async testAccountVitals(emails) {
    return this.request('POST', '/accounts/test/vitals', { emails });
  }

  // Analytics methods
  async getCampaignAnalytics(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/campaigns/analytics${query ? '?' + query : ''}`);
  }

  async getCampaignAnalyticsOverview(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/campaigns/analytics/overview${query ? '?' + query : ''}`);
  }

  async getDailyCampaignAnalytics(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/campaigns/analytics/daily${query ? '?' + query : ''}`);
  }

  async getCampaignStepsAnalytics(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/campaigns/analytics/steps${query ? '?' + query : ''}`);
  }

  async getWarmupAnalytics(emails) {
    return this.request('POST', '/accounts/warmup-analytics', { emails });
  }

  // Block list methods
  async createBlockListEntry(value, isDomain = false) {
    return this.request('POST', '/block-lists-entries', {
      bl_value: value,
      is_domain: isDomain
    });
  }

  async getBlockListEntries(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/block-lists-entries${query ? '?' + query : ''}`);
  }

  async deleteBlockListEntry(id) {
    return this.request('DELETE', `/block-lists-entries/${id}`);
  }

  // Lead list methods
  async createLeadList(name, ownedBy = null) {
    return this.request('POST', '/lead-lists', { name, owned_by: ownedBy });
  }

  async getLeadLists(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/lead-lists${query ? '?' + query : ''}`);
  }

  async getLeadList(id) {
    return this.request('GET', `/lead-lists/${id}`);
  }

  async updateLeadList(id, updates) {
    return this.request('PATCH', `/lead-lists/${id}`, updates);
  }

  async deleteLeadList(id) {
    return this.request('DELETE', `/lead-lists/${id}`);
  }
}
```

### Usage Examples

#### Basic Setup
```javascript
const instantly = new InstantlyAPI('your-api-key-here');

// Test connection
try {
  const campaigns = await instantly.getCampaigns({ limit: 1 });
  console.log('API connection successful');
} catch (error) {
  console.error('API connection failed:', error);
}
```

#### Create a Campaign
```javascript
const campaignData = {
  name: "Q4 Outreach Campaign",
  campaign_schedule: {
    schedules: [{
      name: "Business Hours",
      timing: {
        from: "09:00",
        to: "17:00"
      },
      days: {
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: false,
        sunday: false
      },
      timezone: "America/New_York"
    }]
  },
  sequences: [{
    steps: [
      {
        subject: "Quick question about {{company_name}}",
        body: `Hi {{first_name}},

I noticed {{company_name}} is in the {{industry}} space. We've helped similar companies reduce costs by 30%.

Would you be open to a quick 15-minute call to discuss how this might apply to {{company_name}}?

Best regards,
John`,
        delay_days: 0
      },
      {
        subject: "Following up on {{company_name}}",
        body: `Hi {{first_name}},

Just wanted to follow up on my previous email about cost reduction strategies for {{company_name}}.

Would this week work for a brief call?

Thanks,
John`,
        delay_days: 3
      }
    ]
  }],
  daily_limit: 50,
  stop_on_reply: true,
  link_tracking: true,
  open_tracking: true
};

const campaign = await instantly.createCampaign(campaignData);
console.log('Campaign created:', campaign.id);
```

#### Batch Upload Leads
```javascript
const leads = [
  {
    email: "ceo@techstartup.com",
    first_name: "Sarah",
    last_name: "Johnson",
    company_name: "TechStartup Inc",
    custom_variables: {
      job_title: "CEO",
      company_size: "10-50",
      industry: "Technology",
      lead_source: "manual_research"
    }
  },
  {
    email: "founder@innovateco.com",
    first_name: "Mike",
    last_name: "Chen",
    company_name: "InnovateCo",
    custom_variables: {
      job_title: "Founder",
      company_size: "1-10",
      industry: "Software",
      lead_source: "linkedin"
    }
  }
];

// Add campaign ID to each lead
const campaignId = "your-campaign-id";
const leadsWithCampaign = leads.map(lead => ({
  ...lead,
  campaign: campaignId
}));

const results = await instantly.createLeads(leadsWithCampaign);
const successful = results.filter(r => r.success).length;
const failed = results.filter(r => !r.success).length;

console.log(`Upload complete: ${successful} successful, ${failed} failed`);
```

#### Get Campaign Analytics
```javascript
const analytics = await instantly.getCampaignAnalytics({
  id: 'campaign-id',
  start_date: '2024-01-01',
  end_date: '2024-12-31'
});

console.log('Campaign Performance:');
console.log(`Total Leads: ${analytics[0].leads_count}`);
console.log(`Contacted: ${analytics[0].contacted_count}`);
console.log(`Opens: ${analytics[0].open_count}`);
console.log(`Replies: ${analytics[0].reply_count}`);
console.log(`Opportunities: ${analytics[0].total_opportunities}`);
```

#### Monitor Daily Performance
```javascript
const dailyStats = await instantly.getDailyCampaignAnalytics({
  campaign_id: 'campaign-id',
  start_date: '2024-08-01',
  end_date: '2024-08-31'
});

console.log('Daily Performance:');
dailyStats.forEach(day => {
  console.log(`${day.date}: ${day.sent} sent, ${day.opened} opened, ${day.replies} replies`);
});
```

#### Update Lead Interest Status
```javascript
// Mark a lead as interested
await instantly.updateLeadInterestStatus('lead@example.com', 1);

// Mark a lead as not interested
await instantly.updateLeadInterestStatus('lead@example.com', -1);

// Mark a lead as meeting booked
await instantly.updateLeadInterestStatus('lead@example.com', 2);
```

#### Manage Block List
```javascript
// Block specific emails
await instantly.createBlockListEntry('spam@example.com', false);

// Block entire domains
await instantly.createBlockListEntry('spammy-domain.com', true);

// Get all blocked entries
const blocked = await instantly.getBlockListEntries({
  limit: 100,
  domains_only: false
});

console.log(`Total blocked entries: ${blocked.items.length}`);
```

### React Hook for Instantly API
```javascript
import { useState, useEffect } from 'react';

export function useInstantly(apiKey) {
  const [instantly, setInstantly] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (apiKey) {
      setInstantly(new InstantlyAPI(apiKey));
    }
  }, [apiKey]);

  const executeRequest = async (requestFn) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await requestFn();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    instantly,
    loading,
    error,
    executeRequest
  };
}

// Usage in React component
function CampaignDashboard() {
  const { instantly, loading, error, executeRequest } = useInstantly(process.env.REACT_APP_INSTANTLY_API_KEY);
  const [campaigns, setCampaigns] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    if (instantly) {
      loadCampaigns();
    }
  }, [instantly]);

  const loadCampaigns = async () => {
    try {
      const result = await executeRequest(() => instantly.getCampaigns({ limit: 10 }));
      setCampaigns(result.items || []);
    } catch (err) {
      console.error('Failed to load campaigns:', err);
    }
  };

  const loadAnalytics = async (campaignId) => {
    try {
      const result = await executeRequest(() => instantly.getCampaignAnalytics({ id: campaignId }));
      setAnalytics(result[0]);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Campaigns</h1>
      {campaigns.map(campaign => (
        <div key={campaign.id}>
          <h2>{campaign.name}</h2>
          <p>Status: {campaign.status === 1 ? 'Active' : 'Paused'}</p>
          <button onClick={() => loadAnalytics(campaign.id)}>
            Load Analytics
          </button>
        </div>
      ))}
      
      {analytics && (
        <div>
          <h2>Analytics</h2>
          <p>Leads: {analytics.leads_count}</p>
          <p>Opens: {analytics.open_count}</p>
          <p>Replies: {analytics.reply_count}</p>
        </div>
      )}
    </div>
  );
}
```

## Best Practices

### 1. Authentication & Security
- **Store API keys securely**: Never commit API keys to version control
- **Use environment variables**: Store keys in `.env` files or environment variables
- **Implement key rotation**: Regularly rotate API keys for security
- **Use minimal scopes**: Only grant the permissions your application needs
- **Monitor key usage**: Track API key usage and set up alerts for unusual activity

### 2. Rate Limiting & Performance
- **Implement exponential backoff**: Handle 429 responses gracefully
- **Batch operations**: Use batch endpoints when available
- **Cache frequently accessed data**: Reduce API calls by caching campaign and lead data
- **Monitor rate limits**: Track rate limit headers and adjust request frequency
- **Use pagination**: Don't try to fetch all data in single requests

### 3. Error Handling
- **Implement comprehensive error handling**: Handle all HTTP status codes
- **Log errors properly**: Include request details, timestamps, and error context
- **Implement retry logic**: Retry failed requests with exponential backoff
- **Validate data before sending**: Check required fields and data types
- **Handle partial failures**: In batch operations, handle mixed success/failure scenarios

### 4. Data Management
- **Validate lead data**: Ensure email formats are valid and required fields are present
- **Handle custom variables properly**: Only use allowed data types (string, number, boolean, null)
- **Implement deduplication**: Check for existing leads before creating new ones
- **Use consistent naming**: Follow consistent naming conventions for custom variables
- **Archive old data**: Regular cleanup of old leads and campaigns

### 5. Monitoring & Analytics
- **Track key metrics**: Monitor campaign performance, delivery rates, and engagement
- **Set up alerts**: Create alerts for low performance or high bounce rates
- **Regular reporting**: Generate regular reports on campaign effectiveness
- **A/B testing**: Use campaign variants to optimize performance
- **Monitor deliverability**: Track spam rates and sender reputation

### 6. Development Workflow
- **Use a development environment**: Test with development campaigns before production
- **Version control API integrations**: Track changes to API integration code
- **Document custom implementations**: Document any custom logic and integrations
- **Test thoroughly**: Test error scenarios, edge cases, and high-volume operations
- **Follow semantic versioning**: Version your API integration code properly

### 7. Webhook Implementation
- **Verify webhook signatures**: Implement proper webhook verification if available
- **Handle duplicate events**: Implement idempotency for webhook processing
- **Process asynchronously**: Don't block webhook responses with long processing
- **Implement retry queues**: Handle webhook failures with retry mechanisms
- **Log webhook events**: Track webhook deliveries and processing

### 8. Campaign Management
- **Start with small test campaigns**: Test new sequences with small lead lists
- **Monitor engagement metrics**: Track opens, clicks, and replies closely
- **Implement list hygiene**: Regular cleanup of bounced and unsubscribed leads
- **Personalize effectively**: Use custom variables for meaningful personalization
- **Follow compliance rules**: Ensure compliance with CAN-SPAM, GDPR, and other regulations

### Example Error Handling Implementation
```javascript
class InstantlyAPIWithRetry extends InstantlyAPI {
  constructor(apiKey, options = {}) {
    super(apiKey);
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 1000;
  }

  async requestWithRetry(method, endpoint, data = null, retryCount = 0) {
    try {
      return await this.request(method, endpoint, data);
    } catch (error) {
      // Handle specific error types
      if (error.message.includes('429') && retryCount < this.maxRetries) {
        // Rate limited - implement exponential backoff
        const delay = this.baseDelay * Math.pow(2, retryCount);
        console.log(`Rate limited. Retrying in ${delay}ms... (attempt ${retryCount + 1})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.requestWithRetry(method, endpoint, data, retryCount + 1);
      }
      
      if (error.message.includes('500') && retryCount < this.maxRetries) {
        // Server error - retry with shorter delay
        const delay = 1000;
        console.log(`Server error. Retrying in ${delay}ms... (attempt ${retryCount + 1})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.requestWithRetry(method, endpoint, data, retryCount + 1);
      }
      
      // Don't retry for client errors (4xx except 429)
      throw error;
    }
  }

  // Override the base request method
  async request(method, endpoint, data = null) {
    return this.requestWithRetry(method, endpoint, data);
  }
}
```

This comprehensive documentation provides everything you need to integrate with the Instantly.ai API v2 in your frontend application. The documentation includes all endpoints, data structures, error handling, and practical examples for building robust email campaign management functionality.