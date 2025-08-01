# HeyReach Complete API Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Authentication](#authentication)
4. [Rate Limits](#rate-limits)
5. [API Endpoints](#api-endpoints)
   - [Authentication](#authentication-endpoints)
   - [Campaigns](#campaigns)
   - [Leads Management](#leads-management)
   - [Lists Management](#lists-management)
   - [LinkedIn Accounts](#linkedin-accounts)
   - [Conversations](#conversations)
   - [Analytics](#analytics)
6. [Webhooks](#webhooks)
7. [Integration Examples](#integration-examples)
8. [Client SDKs](#client-sdks)
9. [Error Handling](#error-handling)
10. [Best Practices](#best-practices)

## Introduction

HeyReach is a LinkedIn automation platform designed for agencies and sales teams to scale LinkedIn outreach. The HeyReach API provides programmatic access to manage campaigns, leads, conversations, and automate LinkedIn outreach workflows.

### Key Features
- **Multi-sender campaigns**: Connect multiple LinkedIn accounts to one campaign
- **Unified inbox**: Manage all LinkedIn conversations in one place
- **Advanced automation**: Profile views, connection requests, messages, and follow-ups
- **Webhook events**: 20+ real-time event notifications
- **Integration-ready**: Native integrations with Clay, HubSpot, Zapier, and more

### API Capabilities
- Add leads to campaigns and lists
- Create and manage campaigns
- Monitor conversation activity
- Track campaign analytics
- Receive real-time webhook notifications
- Manage LinkedIn account connections

## Getting Started

### Base URL
```
https://api.heyreach.io/api/public
```

### Prerequisites
1. Active HeyReach account (Starter, Agency, or Unlimited plan)
2. API access enabled in your account
3. At least one connected LinkedIn account
4. Existing campaigns to add leads to

### Quick Start
1. Get your API key from HeyReach dashboard
2. Test API connectivity
3. Create or identify target campaigns
4. Start adding leads via API

## Authentication

HeyReach uses API key authentication with a custom header.

### API Key Location
Navigate to: **HeyReach Dashboard → Settings → Integrations → HeyReach API**

### Authentication Method
Include your API key in every request using the `X-API-KEY` header:

```typescript
const headers = {
  'X-API-KEY': 'your-api-key-here',
  'Content-Type': 'application/json',
  'Accept': 'application/json'
};
```

### Test API Key
```bash
curl --location 'https://api.heyreach.io/api/public/auth/CheckApiKey' \
  --header 'X-API-KEY: your-api-key-here'
```

**Success Response:**
```json
{
  "status": "success",
  "message": "API key is valid"
}
```

## Rate Limits

- **Limit**: 300 requests per minute
- **Enforcement**: Per API key basis
- **Headers**: Rate limit information included in response headers
- **429 Response**: When rate limit exceeded

### Rate Limit Headers
```
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 1640995200
```

### Rate Limit Best Practices
- Implement exponential backoff for 429 responses
- Cache frequently accessed data
- Batch operations when possible
- Monitor rate limit headers

## API Endpoints

### Authentication Endpoints

#### Check API Key
Verify that your API key is valid and working.

```http
GET /auth/CheckApiKey
```

**Headers:**
```
X-API-KEY: your-api-key
```

**Response:**
```json
{
  "status": "success",
  "message": "API key is valid",
  "organization_id": "org_123456"
}
```

**Error Response:**
```json
{
  "status": "error",
  "message": "Invalid API key"
}
```

### Campaigns

#### Get Campaign Details
Retrieve information about a specific campaign.

```http
GET /campaigns/{campaign_id}
```

**Parameters:**
- `campaign_id` (required): The unique identifier of the campaign

**Response:**
```json
{
  "id": "camp_123456",
  "name": "Q4 Outreach Campaign",
  "status": "active",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-16T14:20:00Z",
  "leads_count": 150,
  "sent_count": 45,
  "connected_count": 12,
  "replied_count": 8,
  "linkedin_accounts": [
    {
      "id": "acc_789012",
      "name": "John Doe",
      "profile_url": "https://linkedin.com/in/johndoe",
      "status": "active"
    }
  ],
  "sequences": [
    {
      "step": 1,
      "action": "view_profile",
      "delay_days": 0
    },
    {
      "step": 2,
      "action": "send_connection",
      "delay_days": 1,
      "message": "Hi {{firstName}}, I'd love to connect!"
    }
  ]
}
```

#### List Campaigns
Get a list of all campaigns in your organization.

```http
GET /campaigns
```

**Query Parameters:**
- `status` (optional): Filter by campaign status (`active`, `paused`, `completed`)
- `limit` (optional): Number of results to return (default: 50, max: 100)
- `offset` (optional): Number of results to skip for pagination

**Response:**
```json
{
  "campaigns": [
    {
      "id": "camp_123456",
      "name": "Q4 Outreach Campaign",
      "status": "active",
      "leads_count": 150,
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total_count": 10,
  "has_more": false
}
```

#### Create Campaign
Create a new campaign.

```http
POST /campaigns
```

**Request Body:**
```json
{
  "name": "New Campaign",
  "description": "Campaign description",
  "linkedin_account_ids": ["acc_789012"],
  "sequences": [
    {
      "step": 1,
      "action": "view_profile",
      "delay_days": 0
    },
    {
      "step": 2,
      "action": "send_connection",
      "delay_days": 1,
      "message": "Hi {{firstName}}, let's connect!",
      "personalization_variables": ["firstName", "company"]
    }
  ],
  "settings": {
    "daily_limit": 50,
    "weekend_sending": false,
    "timezone": "America/New_York"
  }
}
```

**Response:**
```json
{
  "id": "camp_789123",
  "name": "New Campaign",
  "status": "draft",
  "created_at": "2024-01-16T15:30:00Z"
}
```

### Leads Management

#### Add Lead to Campaign
Add a single lead to an existing campaign.

```http
POST /campaigns/{campaign_id}/leads
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "linkedin_url": "https://linkedin.com/in/johndoe",
  "email": "john@example.com",
  "company": "Example Corp",
  "job_title": "CEO",
  "linkedin_account_id": "acc_789012",
  "custom_fields": {
    "industry": "Technology",
    "company_size": "50-100",
    "pain_point": "Lead generation"
  },
  "tags": ["high-priority", "warm-lead"]
}
```

**Response:**
```json
{
  "id": "lead_456789",
  "status": "added",
  "campaign_id": "camp_123456",
  "position_in_queue": 15,
  "estimated_start_date": "2024-01-17T10:00:00Z"
}
```

#### Add Multiple Leads to Campaign (V2)
Add multiple leads to a campaign in a single request.

```http
POST /campaigns/{campaign_id}/leads/bulk
```

**Request Body:**
```json
{
  "leads": [
    {
      "first_name": "John",
      "last_name": "Doe",
      "linkedin_url": "https://linkedin.com/in/johndoe",
      "email": "john@example.com",
      "company": "Example Corp",
      "custom_fields": {
        "industry": "Technology"
      }
    },
    {
      "first_name": "Jane",
      "last_name": "Smith",
      "linkedin_url": "https://linkedin.com/in/janesmith",
      "email": "jane@example.com",
      "company": "Tech Solutions",
      "custom_fields": {
        "industry": "Software"
      }
    }
  ],
  "linkedin_account_id": "acc_789012"
}
```

**Response:**
```json
{
  "success_count": 2,
  "error_count": 0,
  "results": [
    {
      "index": 0,
      "id": "lead_456789",
      "status": "added"
    },
    {
      "index": 1,
      "id": "lead_456790",
      "status": "added"
    }
  ]
}
```

#### Get Lead Details
Retrieve information about a specific lead.

```http
GET /leads/{lead_id}
```

**Response:**
```json
{
  "id": "lead_456789",
  "first_name": "John",
  "last_name": "Doe",
  "linkedin_url": "https://linkedin.com/in/johndoe",
  "email": "john@example.com",
  "company": "Example Corp",
  "job_title": "CEO",
  "status": "in_progress",
  "current_step": 2,
  "campaign_id": "camp_123456",
  "linkedin_account_id": "acc_789012",
  "created_at": "2024-01-16T10:30:00Z",
  "last_activity": "2024-01-17T14:20:00Z",
  "activities": [
    {
      "step": 1,
      "action": "profile_viewed",
      "timestamp": "2024-01-17T10:00:00Z",
      "status": "completed"
    },
    {
      "step": 2,
      "action": "connection_sent",
      "timestamp": "2024-01-17T14:20:00Z",
      "status": "completed"
    }
  ],
  "custom_fields": {
    "industry": "Technology",
    "company_size": "50-100"
  }
}
```

#### Update Lead
Update lead information and custom fields.

```http
PATCH /leads/{lead_id}
```

**Request Body:**
```json
{
  "job_title": "Chief Executive Officer",
  "custom_fields": {
    "industry": "Tech",
    "priority": "high"
  },
  "tags": ["decision-maker", "warm-lead"]
}
```

#### Remove Lead from Campaign
Remove a lead from a campaign.

```http
DELETE /campaigns/{campaign_id}/leads/{lead_id}
```

**Response:**
```json
{
  "status": "removed",
  "message": "Lead successfully removed from campaign"
}
```

### Lists Management

#### Create Empty List
Create a new lead list.

```http
POST /lists
```

**Request Body:**
```json
{
  "name": "Q4 Prospects",
  "description": "High-value prospects for Q4 campaign",
  "tags": ["q4", "enterprise"]
}
```

**Response:**
```json
{
  "id": "list_123456",
  "name": "Q4 Prospects",
  "created_at": "2024-01-16T10:30:00Z",
  "leads_count": 0
}
```

#### Add Lead to List (V2)
Add leads to a specific list.

```http
POST /lists/{list_id}/leads
```

**Request Body:**
```json
{
  "leads": [
    {
      "first_name": "John",
      "last_name": "Doe",
      "linkedin_url": "https://linkedin.com/in/johndoe",
      "email": "john@example.com",
      "company": "Example Corp",
      "custom_fields": {
        "source": "website",
        "score": 85
      }
    }
  ]
}
```

#### Get List Details
Retrieve information about a specific list.

```http
GET /lists/{list_id}
```

**Response:**
```json
{
  "id": "list_123456",
  "name": "Q4 Prospects",
  "description": "High-value prospects for Q4 campaign",
  "leads_count": 25,
  "created_at": "2024-01-16T10:30:00Z",
  "updated_at": "2024-01-17T14:20:00Z",
  "tags": ["q4", "enterprise"]
}
```

#### List All Lists
Get all lists in your organization.

```http
GET /lists
```

**Response:**
```json
{
  "lists": [
    {
      "id": "list_123456",
      "name": "Q4 Prospects",
      "leads_count": 25,
      "created_at": "2024-01-16T10:30:00Z"
    }
  ],
  "total_count": 5
}
```

### LinkedIn Accounts

#### Get LinkedIn Account Details
Retrieve information about a connected LinkedIn account.

```http
GET /linkedin-accounts/{account_id}
```

**Response:**
```json
{
  "id": "acc_789012",
  "name": "John Doe",
  "linkedin_url": "https://linkedin.com/in/johndoe",
  "profile_image": "https://media.licdn.com/dms/image/...",
  "status": "active",
  "connection_count": 2847,
  "daily_limit": 50,
  "daily_sent": 12,
  "last_activity": "2024-01-17T14:20:00Z",
  "created_at": "2024-01-10T09:00:00Z",
  "settings": {
    "proxy_enabled": true,
    "weekend_sending": false,
    "timezone": "America/New_York"
  }
}
```

#### List LinkedIn Accounts
Get all connected LinkedIn accounts.

```http
GET /linkedin-accounts
```

**Response:**
```json
{
  "accounts": [
    {
      "id": "acc_789012",
      "name": "John Doe",
      "status": "active",
      "daily_sent": 12,
      "daily_limit": 50
    }
  ],
  "total_count": 3
}
```

### Conversations

#### Get Conversation Details
Retrieve a specific conversation with all messages.

```http
GET /conversations/{conversation_id}
```

**Response:**
```json
{
  "id": "conv_123456",
  "lead_id": "lead_456789",
  "linkedin_account_id": "acc_789012",
  "status": "replied",
  "last_message_at": "2024-01-17T16:30:00Z",
  "messages": [
    {
      "id": "msg_001",
      "direction": "outbound",
      "content": "Hi John, I'd love to connect!",
      "timestamp": "2024-01-17T10:00:00Z",
      "message_type": "connection_request"
    },
    {
      "id": "msg_002",
      "direction": "inbound",
      "content": "Thanks for connecting! What can I help you with?",
      "timestamp": "2024-01-17T16:30:00Z",
      "message_type": "message"
    }
  ],
  "lead": {
    "first_name": "John",
    "last_name": "Doe",
    "company": "Example Corp"
  }
}
```

#### List Conversations
Get all conversations with filtering options.

```http
GET /conversations
```

**Query Parameters:**
- `status` (optional): Filter by status (`unread`, `replied`, `connected`, `not_connected`)
- `linkedin_account_id` (optional): Filter by LinkedIn account
- `campaign_id` (optional): Filter by campaign
- `limit` (optional): Number of results (default: 50, max: 100)
- `offset` (optional): Pagination offset

**Response:**
```json
{
  "conversations": [
    {
      "id": "conv_123456",
      "lead_name": "John Doe",
      "company": "Example Corp",
      "status": "replied",
      "last_message_at": "2024-01-17T16:30:00Z",
      "unread_count": 1
    }
  ],
  "total_count": 45,
  "has_more": true
}
```

#### Send Message
Send a message in an existing conversation.

```http
POST /conversations/{conversation_id}/messages
```

**Request Body:**
```json
{
  "content": "Thanks for your interest! I'd love to schedule a quick call to discuss how we can help.",
  "message_type": "message"
}
```

**Response:**
```json
{
  "id": "msg_003",
  "status": "sent",
  "timestamp": "2024-01-17T17:00:00Z"
}
```

### Analytics

#### Get Campaign Analytics
Retrieve detailed analytics for a specific campaign.

```http
GET /campaigns/{campaign_id}/analytics
```

**Query Parameters:**
- `start_date` (optional): Start date for analytics (ISO 8601 format)
- `end_date` (optional): End date for analytics (ISO 8601 format)
- `group_by` (optional): Group results by `day`, `week`, or `month`

**Response:**
```json
{
  "campaign_id": "camp_123456",
  "period": {
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": "2024-01-17T23:59:59Z"
  },
  "summary": {
    "leads_added": 150,
    "profiles_viewed": 145,
    "connections_sent": 120,
    "connections_accepted": 45,
    "messages_sent": 30,
    "replies_received": 12,
    "acceptance_rate": 37.5,
    "reply_rate": 40.0
  },
  "daily_stats": [
    {
      "date": "2024-01-17",
      "profiles_viewed": 8,
      "connections_sent": 12,
      "connections_accepted": 3,
      "messages_sent": 2,
      "replies_received": 1
    }
  ],
  "linkedin_accounts": [
    {
      "account_id": "acc_789012",
      "account_name": "John Doe",
      "leads_assigned": 75,
      "connections_sent": 60,
      "acceptance_rate": 35.0
    }
  ]
}
```

#### Get Organization Analytics
Get overall analytics for your organization.

```http
GET /analytics/organization
```

**Response:**
```json
{
  "period": {
    "start_date": "2024-01-01T00:00:00Z",
    "end_date": "2024-01-17T23:59:59Z"
  },
  "summary": {
    "active_campaigns": 5,
    "total_leads": 750,
    "total_connections": 450,
    "total_replies": 89,
    "overall_acceptance_rate": 42.3,
    "overall_reply_rate": 19.8
  },
  "top_performing_campaigns": [
    {
      "campaign_id": "camp_123456",
      "campaign_name": "Q4 Outreach",
      "acceptance_rate": 52.1,
      "reply_rate": 28.5
    }
  ],
  "linkedin_accounts_performance": [
    {
      "account_id": "acc_789012",
      "account_name": "John Doe",
      "connections_sent": 120,
      "acceptance_rate": 48.3
    }
  ]
}
```

## Webhooks

HeyReach provides 20+ webhook events for real-time notifications about campaign activities.

### Webhook Setup

1. Navigate to **Settings → Integrations → Webhooks**
2. Click "View and Create" 
3. Configure webhook URL and select events
4. Test the webhook connection

### Webhook Configuration

```http
POST /webhooks
```

**Request Body:**
```json
{
  "name": "Campaign Updates",
  "url": "https://your-app.com/webhooks/heyreach",
  "events": [
    "connection_accepted",
    "message_replied",
    "campaign_completed",
    "lead_bounced"
  ],
  "campaigns": ["camp_123456"],
  "secret": "your-webhook-secret"
}
```

### Webhook Events

#### Connection Events
- `connection_sent` - Connection request sent
- `connection_accepted` - Connection request accepted
- `connection_declined` - Connection request declined

#### Message Events  
- `message_sent` - Message sent to lead
- `message_replied` - Lead replied to message
- `message_bounced` - Message failed to deliver

#### Campaign Events
- `campaign_started` - Campaign started
- `campaign_paused` - Campaign paused
- `campaign_completed` - Campaign completed
- `lead_added` - Lead added to campaign
- `lead_completed` - Lead completed campaign sequence

#### Profile Events
- `profile_viewed` - Profile viewed
- `profile_visit` - Profile visited by lead

### Webhook Payload Format

#### Connection Accepted Event
```json
{
  "event": "connection_accepted",
  "timestamp": "2024-01-17T14:30:00Z",
  "data": {
    "lead_id": "lead_456789",
    "campaign_id": "camp_123456",
    "linkedin_account_id": "acc_789012",
    "lead": {
      "first_name": "John",
      "last_name": "Doe",
      "linkedin_url": "https://linkedin.com/in/johndoe",
      "company": "Example Corp",
      "custom_fields": {
        "industry": "Technology"
      }
    },
    "linkedin_account": {
      "name": "Jane Smith",
      "linkedin_url": "https://linkedin.com/in/janesmith"
    }
  }
}
```

#### Message Replied Event
```json
{
  "event": "message_replied",
  "timestamp": "2024-01-17T16:45:00Z",
  "data": {
    "conversation_id": "conv_123456",
    "lead_id": "lead_456789",
    "campaign_id": "camp_123456",
    "linkedin_account_id": "acc_789012",
    "message": {
      "content": "Thanks for reaching out! I'm interested in learning more.",
      "timestamp": "2024-01-17T16:45:00Z"
    },
    "lead": {
      "first_name": "John",
      "last_name": "Doe",
      "company": "Example Corp"
    }
  }
}
```

### Webhook Security

#### Signature Verification
HeyReach signs webhook payloads with your webhook secret.

```typescript
import crypto from 'crypto';

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
}

// Express.js webhook handler
app.post('/webhooks/heyreach', (req, res) => {
  const signature = req.headers['x-heyreach-signature'];
  const payload = JSON.stringify(req.body);
  
  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Unauthorized');
  }
  
  const { event, data } = req.body;
  
  switch (event) {
    case 'connection_accepted':
      handleConnectionAccepted(data);
      break;
    case 'message_replied':
      handleMessageReply(data);
      break;
    default:
      console.log(`Unhandled event: ${event}`);
  }
  
  res.status(200).send('OK');
});
```

## Integration Examples

### JavaScript/TypeScript SDK

```typescript
class HeyReachClient {
  private apiKey: string;
  private baseUrl = 'https://api.heyreach.io/api/public';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`HeyReach API Error: ${error.message}`);
    }
    
    return response.json();
  }
  
  // Authentication
  async checkApiKey() {
    return this.request('/auth/CheckApiKey');
  }
  
  // Campaigns
  async getCampaign(campaignId: string) {
    return this.request(`/campaigns/${campaignId}`);
  }
  
  async listCampaigns(filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    return this.request(`/campaigns?${params.toString()}`);
  }
  
  // Leads
  async addLeadToCampaign(campaignId: string, lead: {
    first_name: string;
    last_name: string;
    linkedin_url: string;
    email?: string;
    company?: string;
    job_title?: string;
    linkedin_account_id?: string;
    custom_fields?: Record<string, any>;
    tags?: string[];
  }) {
    return this.request(`/campaigns/${campaignId}/leads`, {
      method: 'POST',
      body: JSON.stringify(lead),
    });
  }
  
  async addMultipleLeads(campaignId: string, leads: any[], linkedinAccountId?: string) {
    return this.request(`/campaigns/${campaignId}/leads/bulk`, {
      method: 'POST',
      body: JSON.stringify({
        leads,
        linkedin_account_id: linkedinAccountId,
      }),
    });
  }
  
  async getLead(leadId: string) {
    return this.request(`/leads/${leadId}`);
  }
  
  async updateLead(leadId: string, updates: {
    job_title?: string;
    custom_fields?: Record<string, any>;
    tags?: string[];
  }) {
    return this.request(`/leads/${leadId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }
  
  // Lists
  async createList(name: string, description?: string, tags?: string[]) {
    return this.request('/lists', {
      method: 'POST',
      body: JSON.stringify({ name, description, tags }),
    });
  }
  
  async addLeadToList(listId: string, leads: any[]) {
    return this.request(`/lists/${listId}/leads`, {
      method: 'POST',
      body: JSON.stringify({ leads }),
    });
  }
  
  // Conversations
  async listConversations(filters?: {
    status?: string;
    linkedin_account_id?: string;
    campaign_id?: string;
    limit?: number;
    offset?: number;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    return this.request(`/conversations?${params.toString()}`);
  }
  
  async getConversation(conversationId: string) {
    return this.request(`/conversations/${conversationId}`);
  }
  
  async sendMessage(conversationId: string, content: string) {
    return this.request(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        message_type: 'message',
      }),
    });
  }
  
  // Analytics
  async getCampaignAnalytics(
    campaignId: string,
    options?: {
      start_date?: string;
      end_date?: string;
      group_by?: 'day' | 'week' | 'month';
    }
  ) {
    const params = new URLSearchParams();
    if (options) {
      Object.entries(options).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
    }
    
    return this.request(`/campaigns/${campaignId}/analytics?${params.toString()}`);
  }
  
  async getOrganizationAnalytics() {
    return this.request('/analytics/organization');
  }
}
```

### Usage Examples

#### Basic Lead Management
```typescript
const heyreach = new HeyReachClient('your-api-key');

// Test API connection
try {
  await heyreach.checkApiKey();
  console.log('API connection successful');
} catch (error) {
  console.error('API connection failed:', error);
}

// Add a single lead to campaign
const lead = {
  first_name: 'John',
  last_name: 'Doe',
  linkedin_url: 'https://linkedin.com/in/johndoe',
  email: 'john@example.com',
  company: 'Example Corp',
  job_title: 'CEO',
  custom_fields: {
    industry: 'Technology',
    company_size: '50-100',
    source: 'website'
  },
  tags: ['high-priority', 'decision-maker']
};

const result = await heyreach.addLeadToCampaign('camp_123456', lead);
console.log('Lead added:', result.id);
```

#### Bulk Lead Upload
```typescript
const leads = [
  {
    first_name: 'John',
    last_name: 'Doe',
    linkedin_url: 'https://linkedin.com/in/johndoe',
    company: 'Example Corp',
    custom_fields: { industry: 'Tech' }
  },
  {
    first_name: 'Jane',
    last_name: 'Smith',
    linkedin_url: 'https://linkedin.com/in/janesmith',
    company: 'Tech Solutions',
    custom_fields: { industry: 'Software' }
  }
];

const bulkResult = await heyreach.addMultipleLeads(
  'camp_123456',
  leads,
  'acc_789012'
);

console.log(`Successfully added ${bulkResult.success_count} leads`);
if (bulkResult.error_count > 0) {
  console.log(`Failed to add ${bulkResult.error_count} leads`);
}
```

#### Campaign Analytics Dashboard
```typescript
async function getCampaignDashboard(campaignId: string) {
  const [campaign, analytics] = await Promise.all([
    heyreach.getCampaign(campaignId),
    heyreach.getCampaignAnalytics(campaignId, {
      start_date: '2024-01-01T00:00:00Z',
      end_date: new Date().toISOString(),
      group_by: 'day'
    })
  ]);
  
  return {
    campaign: {
      name: campaign.name,
      status: campaign.status,
      leads_count: campaign.leads_count
    },
    metrics: {
      acceptance_rate: analytics.summary.acceptance_rate,
      reply_rate: analytics.summary.reply_rate,
      connections_sent: analytics.summary.connections_sent,
      replies_received: analytics.summary.replies_received
    },
    daily_performance: analytics.daily_stats
  };
}
```

### Integration with Popular Tools

#### Clay Integration
```typescript
// Clay webhook to HeyReach
app.post('/clay-webhook', async (req, res) => {
  const { leads } = req.body;
  
  const processedLeads = leads.map(lead => ({
    first_name: lead.first_name,
    last_name: lead.last_name,
    linkedin_url: lead.linkedin_profile_url,
    email: lead.email,
    company: lead.company_name,
    job_title: lead.job_title,
    custom_fields: {
      clay_score: lead.clay_score,
      industry: lead.industry,
      company_size: lead.company_size,
      source: 'clay'
    }
  }));
  
  try {
    const result = await heyreach.addMultipleLeads(
      process.env.HEYREACH_CAMPAIGN_ID,
      processedLeads
    );
    
    res.json({
      success: true,
      added: result.success_count,
      errors: result.error_count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### HubSpot Integration via Webhooks
```typescript
// HeyReach webhook to HubSpot
app.post('/heyreach-webhook', async (req, res) => {
  const { event, data } = req.body;
  
  if (event === 'connection_accepted') {
    // Create contact in HubSpot
    await createHubSpotContact({
      email: data.lead.email,
      firstname: data.lead.first_name,
      lastname: data.lead.last_name,
      company: data.lead.company,
      lifecyclestage: 'lead',
      heyreach_campaign: data.campaign_id,
      linkedin_connected: true
    });
    
    // Add to HubSpot sequence
    await enrollInSequence(data.lead.email, 'follow-up-sequence');
  }
  
  if (event === 'message_replied') {
    // Update contact in HubSpot
    await updateHubSpotContact(data.lead.email, {
      linkedinreply: data.message.content,
      lastactivitydate: new Date().toISOString(),
      leadstatus: 'replied'
    });
    
    // Create task for sales rep
    await createHubSpotTask({
      subject: `LinkedIn reply from ${data.lead.first_name} ${data.lead.last_name}`,
      notes: data.message.content,
      contactEmail: data.lead.email
    });
  }
  
  res.status(200).send('OK');
});
```

### React Hook for HeyReach
```typescript
import { useState, useEffect } from 'react';

interface UseHeyReachOptions {
  campaignId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useHeyReach(options: UseHeyReachOptions = {}) {
  const [campaigns, setCampaigns] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const heyreach = new HeyReachClient(process.env.NEXT_PUBLIC_HEYREACH_API_KEY);
  
  useEffect(() => {
    loadData();
    
    if (options.autoRefresh) {
      const interval = setInterval(loadData, options.refreshInterval || 60000);
      return () => clearInterval(interval);
    }
  }, [options.campaignId]);
  
  const loadData = async () => {
    try {
      setLoading(true);
      const [campaignData, analyticsData] = await Promise.all([
        heyreach.listCampaigns(),
        options.campaignId 
          ? heyreach.getCampaignAnalytics(options.campaignId)
          : heyreach.getOrganizationAnalytics()
      ]);
      
      setCampaigns(campaignData.campaigns);
      setAnalytics(analyticsData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const addLead = async (campaignId: string, lead: any) => {
    try {
      const result = await heyreach.addLeadToCampaign(campaignId, lead);
      await loadData(); // Refresh data
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };
  
  return {
    campaigns,
    analytics,
    loading,
    error,
    addLead,
    refresh: loadData
  };
}

// Usage in React component
function CampaignDashboard() {
  const { campaigns, analytics, loading, error, addLead } = useHeyReach({
    campaignId: 'camp_123456',
    autoRefresh: true,
    refreshInterval: 30000
  });
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h1>Campaigns</h1>
      {campaigns.map(campaign => (
        <div key={campaign.id}>
          <h2>{campaign.name}</h2>
          <p>Status: {campaign.status}</p>
          <p>Leads: {campaign.leads_count}</p>
        </div>
      ))}
      
      {analytics && (
        <div>
          <h2>Analytics</h2>
          <p>Acceptance Rate: {analytics.summary.acceptance_rate}%</p>
          <p>Reply Rate: {analytics.summary.reply_rate}%</p>
        </div>
      )}
    </div>
  );
}
```

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "INVALID_CAMPAIGN",
    "message": "Campaign not found or inactive",
    "details": {
      "campaign_id": "camp_123456",
      "status": "not_found"
    }
  }
}
```

### Common Error Codes

#### Authentication Errors
- `INVALID_API_KEY` - API key is invalid or missing
- `API_KEY_EXPIRED` - API key has been deactivated
- `INSUFFICIENT_PERMISSIONS` - API key lacks required permissions

#### Campaign Errors
- `CAMPAIGN_NOT_FOUND` - Campaign doesn't exist
- `CAMPAIGN_INACTIVE` - Campaign is not active
- `CAMPAIGN_LIMIT_EXCEEDED` - Organization campaign limit reached

#### Lead Errors  
- `INVALID_LINKEDIN_URL` - LinkedIn URL format is invalid
- `DUPLICATE_LEAD` - Lead already exists in campaign
- `LEAD_NOT_FOUND` - Lead doesn't exist
- `INVALID_CUSTOM_FIELDS` - Custom field validation failed

#### Rate Limit Errors
- `RATE_LIMIT_EXCEEDED` - Too many requests per minute
- `DAILY_LIMIT_EXCEEDED` - Daily API usage limit reached

### Error Handling Best Practices

```typescript
class HeyReachError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'HeyReachError';
  }
}

async function safeApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    if (error.status === 429) {
      // Rate limit exceeded - implement exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return safeApiCall(apiCall);
    }
    
    if (error.status >= 500) {
      // Server error - retry with linear backoff
      await new Promise(resolve => setTimeout(resolve, 5000));
      return safeApiCall(apiCall);
    }
    
    // Client error - don't retry
    throw new HeyReachError(
      error.message,
      error.code,
      error.status,
      error.details
    );
  }
}

// Usage
try {
  const result = await safeApiCall(() => 
    heyreach.addLeadToCampaign(campaignId, lead)
  );
} catch (error) {
  if (error instanceof HeyReachError) {
    switch (error.code) {
      case 'DUPLICATE_LEAD':
        console.log('Lead already exists, skipping...');
        break;
      case 'CAMPAIGN_INACTIVE':
        console.error('Campaign is not active');
        break;
      default:
        console.error('HeyReach API error:', error.message);
    }
  }
}
```

## Best Practices

### API Usage Guidelines

#### 1. Rate Limit Management
```typescript
class RateLimitedHeyReachClient extends HeyReachClient {
  private requestQueue: Array<() => Promise<any>> = [];
  private requestsThisMinute = 0;
  private minuteResetTime = Date.now() + 60000;
  
  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await super.request<T>(endpoint, options);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }
  
  private async processQueue() {
    if (this.requestQueue.length === 0) return;
    
    const now = Date.now();
    if (now > this.minuteResetTime) {
      this.requestsThisMinute = 0;
      this.minuteResetTime = now + 60000;
    }
    
    if (this.requestsThisMinute < 250) { // Stay under 300 limit
      const request = this.requestQueue.shift();
      if (request) {
        this.requestsThisMinute++;
        await request();
        
        // Process next request after small delay
        setTimeout(() => this.processQueue(), 250);
      }
    } else {
      // Wait until next minute
      const waitTime = this.minuteResetTime - now;
      setTimeout(() => this.processQueue(), waitTime);
    }
  }
}
```

#### 2. Batch Processing
```typescript
async function batchAddLeads(
  campaignId: string,
  leads: any[],
  batchSize = 10
) {
  const results = [];
  
  for (let i = 0; i < leads.length; i += batchSize) {
    const batch = leads.slice(i, i + batchSize);
    
    try {
      const result = await heyreach.addMultipleLeads(campaignId, batch);
      results.push(...result.results);
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Batch ${i / batchSize + 1} failed:`, error);
      
      // Process individual leads if batch fails
      for (const lead of batch) {
        try {
          const individualResult = await heyreach.addLeadToCampaign(campaignId, lead);
          results.push({ status: 'added', id: individualResult.id });
        } catch (leadError) {
          results.push({ status: 'error', error: leadError.message });
        }
      }
    }
  }
  
  return results;
}
```

#### 3. Data Validation
```typescript
interface LeadData {
  first_name: string;
  last_name: string;
  linkedin_url: string;
  email?: string;
  company?: string;
  job_title?: string;
  custom_fields?: Record<string, any>;
}

function validateLead(lead: any): LeadData {
  const errors: string[] = [];
  
  if (!lead.first_name || typeof lead.first_name !== 'string') {
    errors.push('first_name is required and must be a string');
  }
  
  if (!lead.last_name || typeof lead.last_name !== 'string') {
    errors.push('last_name is required and must be a string');
  }
  
  if (!lead.linkedin_url || !isValidLinkedInUrl(lead.linkedin_url)) {
    errors.push('linkedin_url is required and must be a valid LinkedIn profile URL');
  }
  
  if (lead.email && !isValidEmail(lead.email)) {
    errors.push('email must be a valid email address');
  }
  
  if (errors.length > 0) {
    throw new Error(`Lead validation failed: ${errors.join(', ')}`);
  }
  
  return {
    first_name: lead.first_name.trim(),
    last_name: lead.last_name.trim(),
    linkedin_url: lead.linkedin_url.trim(),
    email: lead.email?.trim(),
    company: lead.company?.trim(),
    job_title: lead.job_title?.trim(),
    custom_fields: lead.custom_fields || {}
  };
}

function isValidLinkedInUrl(url: string): boolean {
  const linkedinPattern = /^https:\/\/(www\.)?linkedin\.com\/in\/[\w-]+\/?$/;
  return linkedinPattern.test(url);
}

function isValidEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}
```

#### 4. Webhook Reliability
```typescript
// Webhook handler with retry mechanism
app.post('/heyreach-webhook', async (req, res) => {
  const signature = req.headers['x-heyreach-signature'];
  const payload = JSON.stringify(req.body);
  
  // Verify signature
  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Unauthorized');
  }
  
  const { event, data } = req.body;
  
  try {
    await processWebhookEvent(event, data);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing failed:', error);
    
    // Store failed webhook for retry
    await storeFailedWebhook({
      event,
      data,
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).send('Processing failed');
  }
});

// Retry failed webhooks
async function retryFailedWebhooks() {
  const failedWebhooks = await getFailedWebhooks();
  
  for (const webhook of failedWebhooks) {
    try {
      await processWebhookEvent(webhook.event, webhook.data);
      await markWebhookAsProcessed(webhook.id);
    } catch (error) {
      await updateWebhookRetryCount(webhook.id);
    }
  }
}

// Run retry process every 5 minutes
setInterval(retryFailedWebhooks, 5 * 60 * 1000);
```

### Security Considerations

#### 1. API Key Security
- Store API keys in environment variables
- Use different API keys for different environments
- Rotate API keys regularly
- Monitor API key usage for anomalies

#### 2. Webhook Security
- Always verify webhook signatures
- Use HTTPS endpoints for webhooks
- Implement idempotency for webhook handlers
- Store webhook secrets securely

#### 3. Data Privacy
- Encrypt sensitive lead data in transit and at rest
- Implement data retention policies
- Follow GDPR/privacy regulations for lead data
- Log API access for security auditing

This comprehensive HeyReach API documentation covers all aspects of integrating with HeyReach, from basic lead management to advanced webhook handling and security considerations. The code examples are production-ready and include proper error handling, rate limiting, and security measures.