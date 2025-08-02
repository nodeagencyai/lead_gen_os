/**
 * Centralized API Client for Lead Generation OS
 * Handles all API calls with automatic environment detection and error handling
 */

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status?: number;
  details?: any;
}

interface ApiClientConfig {
  timeout?: number;
  retries?: number;
  debug?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private config: ApiClientConfig;

  constructor(config: ApiClientConfig = {}) {
    // Automatically detect environment and set base URL
    this.baseUrl = this.getBaseUrl();
    this.config = {
      timeout: 30000, // 30 seconds
      retries: 3,
      debug: import.meta.env.DEV,
      ...config
    };

    if (this.config.debug) {
      console.log('🔧 ApiClient initialized:', {
        baseUrl: this.baseUrl,
        environment: import.meta.env.MODE,
        isDev: import.meta.env.DEV
      });
    }
  }

  private getBaseUrl(): string {
    if (typeof window !== 'undefined') {
      // In development, use the API server on port 3001
      if (window.location.hostname === 'localhost' && window.location.port === '3001') {
        return window.location.origin;
      }
      // For Vite dev server, use the API server
      if (window.location.hostname === 'localhost' && window.location.port === '5174') {
        return 'http://localhost:3001';
      }
      // Production: use same origin (Vercel)
      return window.location.origin;
    }
    
    // Server-side fallback (for SSR)
    return '';
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    if (this.config.debug) {
      console.log('📡 API Request:', { url, method: options.method || 'GET', options });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (this.config.debug) {
        console.log('📨 API Response:', { 
          url, 
          status: response.status, 
          ok: response.ok, 
          data 
        });
      }

      if (!response.ok) {
        return {
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          details: data
        };
      }

      return { data, status: response.status };

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error('❌ API Request timeout:', url);
        return { error: 'Request timeout', status: 408 };
      }

      console.error('❌ API Request failed:', { url, error: error.message });
      return { 
        error: error.message || 'Network error', 
        status: 0,
        details: error 
      };
    }
  }

  private async retryRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    let lastError: ApiResponse<T> = { error: 'Unknown error' };

    for (let attempt = 1; attempt <= this.config.retries!; attempt++) {
      if (this.config.debug && attempt > 1) {
        console.log(`🔄 Retry attempt ${attempt}/${this.config.retries} for ${endpoint}`);
      }

      const result = await this.makeRequest<T>(endpoint, options);

      if (!result.error) {
        return result;
      }

      lastError = result;

      // Don't retry on client errors (4xx) except for 408 (timeout)
      if (result.status && result.status >= 400 && result.status < 500 && result.status !== 408) {
        break;
      }

      // Wait before retry (exponential backoff)
      if (attempt < this.config.retries!) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return lastError;
  }

  // Public methods for different HTTP verbs
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.retryRequest<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.retryRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.retryRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.retryRequest<T>(endpoint, { method: 'DELETE' });
  }

  // Specialized methods for different APIs with development fallback
  async instantly<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    console.log(`📡 INSTANTLY API: /api/instantly${endpoint}`);
    
    // Always try proxy first (works in both dev server and production)
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
    
    if (proxyResponse.error) {
      console.error('❌ Proxy failed:', proxyResponse.error);
      return proxyResponse;
    }
    
    // Special debugging for analytics-aggregated endpoint
    if (endpoint === '/analytics-aggregated') {
      console.log('🔍 ANALYTICS-AGGREGATED RESPONSE:', JSON.stringify(proxyResponse.data, null, 2));
      console.log('📊 RESPONSE TYPE:', typeof proxyResponse.data);
    }
    
    console.log('✅ Proxy success:', { hasData: !!proxyResponse.data });
    return proxyResponse;
  }

  // Direct Instantly.ai API call for development fallback
  private async directInstantlyCall<T>(endpoint: string, data?: any, apiKey?: string): Promise<ApiResponse<T>> {
    if (!apiKey) {
      return { error: 'No API key available for direct call' };
    }
    
    const baseUrl = 'https://api.instantly.ai/api/v2';
    let url = baseUrl;
    
    // Map endpoints to correct Instantly API paths
    if (endpoint === '/campaigns' || endpoint.startsWith('/campaigns?')) {
      url = `${baseUrl}/campaigns${endpoint.includes('?') ? endpoint.substring(endpoint.indexOf('?')) : ''}`;
    } else if (endpoint.startsWith('/analytics')) {
      url = `${baseUrl}/campaigns/analytics${endpoint.substring(10)}`; // Remove '/analytics' and append rest
    } else {
      url = `${baseUrl}${endpoint}`;
    }
    
    console.log(`🔗 DIRECT API CALL: ${url}`);
    
    try {
      const response = await fetch(url, {
        method: data ? 'POST' : 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: data ? JSON.stringify(data) : undefined
      });
      
      const responseData = await response.json();
      
      if (!response.ok) {
        console.error('❌ Direct API error:', response.status, responseData);
        return {
          error: `Direct API error: ${response.status}`,
          status: response.status,
          details: responseData
        };
      }
      
      console.log('✅ Direct API success:', { status: response.status, hasData: !!responseData });
      return { data: responseData, status: response.status };
      
    } catch (error: any) {
      console.error('❌ Direct API exception:', error);
      
      // Only use mock data if in development AND it's a CORS error
      if (import.meta.env.DEV && error.message?.includes('fetch')) {
        console.log('🔄 DEVELOPMENT FALLBACK: CORS blocked, using mock data');
        return this.getMockDataForDevelopment<T>(endpoint);
      }
      
      return { 
        error: error.message || 'Direct API call failed',
        details: error
      };
    }
  }

  // Development mock data with real API structure
  private getMockDataForDevelopment<T>(endpoint: string): ApiResponse<T> {
    console.log(`🎭 MOCK DATA: Providing development fallback for ${endpoint}`);
    
    // Mock campaigns list
    if (endpoint === '/campaigns') {
      const mockCampaigns = {
        items: [
          {
            id: '4bde0574-609a-409d-86cc-52b233699a2b',
            name: 'Digital Marketing Agencies',
            status: 1, // Running
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-20T15:30:00Z',
            leads_count: 150,
            sequences: []
          },
          {
            id: '2e3519c8-ac6f-4961-b803-e28c7423d080', 
            name: 'Sales Development Representative',
            status: 2, // Paused
            created_at: '2024-01-10T09:00:00Z',
            updated_at: '2024-01-18T12:00:00Z',
            leads_count: 89,
            sequences: []
          },
          {
            id: 'afe7fbea-9d4e-491f-88e4-8f75985b9c07',
            name: 'Beta',
            status: 3, // Completed
            created_at: '2024-01-05T08:00:00Z', 
            updated_at: '2024-01-25T16:45:00Z',
            leads_count: 25,
            sequences: []
          }
        ]
      };
      return { data: mockCampaigns as T, status: 200 };
    }
    
    // Mock analytics data
    if (endpoint.startsWith('/analytics?id=')) {
      const campaignId = endpoint.split('id=')[1];
      let mockAnalytics: any[] = [];
      
      // Provide different data based on campaign ID to simulate real scenarios
      if (campaignId === '4bde0574-609a-409d-86cc-52b233699a2b') {
        // Digital Marketing - Active campaign with data
        mockAnalytics = [{
          campaign_id: campaignId,
          campaign_name: 'Digital Marketing Agencies',
          campaign_status: 1,
          campaign_is_evergreen: false,
          leads_count: 150,
          contacted_count: 75,
          open_count: 38,
          reply_count: 8,
          link_click_count: 12,
          bounced_count: 5,
          unsubscribed_count: 2,
          completed_count: 73,
          emails_sent_count: 75,
          new_leads_contacted_count: 15,
          total_opportunities: 3,
          total_opportunity_value: 15000
        }];
      } else if (campaignId === '2e3519c8-ac6f-4961-b803-e28c7423d080') {
        // Sales Development - Some activity
        mockAnalytics = [{
          campaign_id: campaignId,
          campaign_name: 'Sales Development Representative',
          campaign_status: 2,
          campaign_is_evergreen: false,
          leads_count: 89,
          contacted_count: 45,
          open_count: 23, 
          reply_count: 5,
          link_click_count: 7,
          bounced_count: 3,
          unsubscribed_count: 1,
          completed_count: 42,
          emails_sent_count: 45,
          new_leads_contacted_count: 8,
          total_opportunities: 2,
          total_opportunity_value: 8500
        }];
      } else if (campaignId === 'afe7fbea-9d4e-491f-88e4-8f75985b9c07') {
        // Beta - The campaign that was showing real data
        mockAnalytics = [{
          campaign_id: campaignId,
          campaign_name: 'Beta',
          campaign_status: 3,
          campaign_is_evergreen: false,
          leads_count: 25,
          contacted_count: 1,
          open_count: 1,
          reply_count: 1,
          link_click_count: 0,
          bounced_count: 0,
          unsubscribed_count: 0,
          completed_count: 1,
          emails_sent_count: 1,
          new_leads_contacted_count: 1,
          total_opportunities: 1,
          total_opportunity_value: 2500
        }];
      }
      
      return { data: mockAnalytics as T, status: 200 };
    }
    
    // Default fallback
    return { error: `No mock data available for endpoint: ${endpoint}` };
  }

  async heyreach<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    // ALWAYS use serverless proxy - NO direct external API calls
    console.log(`📡 FORCED PROXY: /api/heyreach${endpoint}`);
    return this.post<T>(`/api/heyreach${endpoint}`, data);
  }

  // Add test method to verify proxy is working
  async testProxy(): Promise<ApiResponse> {
    console.log('🧪 Testing proxy connection...');
    return this.get('/api/test');
  }

  // Debug methods
  async debugEnvironment(): Promise<ApiResponse> {
    return this.get('/api/debug/env');
  }

  async testConnection(): Promise<boolean> {
    try {
      const result = await this.get('/api/debug/env');
      return !result.error;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types for TypeScript users
export type { ApiResponse, ApiClientConfig };

// Export class for custom instances
export { ApiClient };