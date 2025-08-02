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
    // FORCE: Always use serverless proxy routes via same origin
    if (typeof window !== 'undefined') {
      // Use current origin (works for both dev and production)
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
    const isDevelopment = import.meta.env.DEV;
    const apiKey = import.meta.env.VITE_INSTANTLY_API_KEY;
    
    // Try serverless proxy first
    console.log(`📡 TRYING PROXY: /api/instantly${endpoint}`);
    const proxyResponse = data 
      ? await this.post<T>(`/api/instantly${endpoint}`, data)
      : await this.get<T>(`/api/instantly${endpoint}`);
    
    // Check if proxy failed (returns source code instead of JSON)
    const isSourceCode = typeof proxyResponse.data === 'string' && 
                        (proxyResponse.data as string).includes('Vercel Serverless Function');
    
    if (isDevelopment && (proxyResponse.error || isSourceCode) && apiKey) {
      console.log('🔄 DEVELOPMENT FALLBACK: Proxy failed, using direct API');
      return this.directInstantlyCall<T>(endpoint, data, apiKey);
    }
    
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
      return { 
        error: error.message || 'Direct API call failed',
        details: error
      };
    }
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