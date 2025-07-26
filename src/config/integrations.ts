// Integration Configuration
export const INTEGRATION_CONFIG = {
  // N8N Webhook URLs - Replace with your actual n8n instance URLs
  N8N_WEBHOOKS: {
    APOLLO_SCRAPING: import.meta.env.VITE_N8N_APOLLO_WEBHOOK || 'https://your-n8n-instance.com/webhook/apollo-scraping',
    LINKEDIN_SCRAPING: import.meta.env.VITE_N8N_LINKEDIN_WEBHOOK || 'https://your-n8n-instance.com/webhook/linkedin-scraping',
    EMAIL_CAMPAIGN: import.meta.env.VITE_N8N_EMAIL_WEBHOOK || 'https://your-n8n-instance.com/webhook/email-campaign',
    LINKEDIN_OUTREACH: import.meta.env.VITE_N8N_LINKEDIN_OUTREACH_WEBHOOK || 'https://your-n8n-instance.com/webhook/linkedin-outreach'
  },

  // API Endpoints
  INSTANTLY_API: {
    BASE_URL: 'https://api.instantly.ai/api/v1',
    ENDPOINTS: {
      CAMPAIGNS: '/campaign/list',
      LEADS: '/lead/list',
      ANALYTICS: '/analytics/campaign'
    }
  },

  HEYREACH_API: {
    BASE_URL: 'https://api.heyreach.io/api/v1',
    ENDPOINTS: {
      CAMPAIGNS: '/campaigns',
      CONNECTIONS: '/connections',
      MESSAGES: '/messages',
      ANALYTICS: '/analytics'
    }
  },

  APOLLO_API: {
    BASE_URL: 'https://api.apollo.io/v1',
    ENDPOINTS: {
      SEARCH: '/mixed_people/search',
      CONTACTS: '/contacts',
      SEQUENCES: '/emailer_campaigns'
    }
  }
};

// Webhook authentication tokens
export const WEBHOOK_TOKENS = {
  N8N_AUTH_TOKEN: import.meta.env.VITE_N8N_AUTH_TOKEN || 'your-n8n-auth-token',
  SUPABASE_WEBHOOK_SECRET: import.meta.env.VITE_SUPABASE_WEBHOOK_SECRET || 'your-webhook-secret'
};