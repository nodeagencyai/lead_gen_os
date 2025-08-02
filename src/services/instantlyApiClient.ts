/**
 * Secure Instantly.ai API Client with Retry Logic and Rate Limiting
 * Implements comprehensive error handling and performance optimization
 */

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status?: number;
  details?: any;
}

interface RateLimitInfo {
  remaining: number;
  reset: Date | null;
  limit: number;
}

interface InstantlyApiConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
  baseDelay?: number;
  debug?: boolean;
}

class InstantlyAPIClient {
  private apiKey: string;
  private baseUrl: string;
  private headers: Record<string, string>;
  private rateLimitInfo: RateLimitInfo;
  private config: Required<InstantlyApiConfig>;

  constructor(config: InstantlyApiConfig = {}) {
    this.apiKey = config.apiKey || import.meta.env.VITE_INSTANTLY_API_KEY || '';
    this.baseUrl = config.baseUrl || 'https://api.instantly.ai/api/v2';
    this.headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    this.rateLimitInfo = {
      remaining: 100,
      reset: null,
      limit: 100
    };

    this.config = {
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      baseDelay: config.baseDelay || 1000,
      debug: config.debug || import.meta.env.DEV
    };

    if (this.config.debug) {
      console.log('🔧 InstantlyAPIClient initialized:', {
        baseUrl: this.baseUrl,
        hasApiKey: !!this.apiKey,
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries
      });
    }
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimitInfo(headers: Headers): void {
    const remaining = headers.get('X-RateLimit-Remaining');
    const reset = headers.get('X-RateLimit-Reset');
    const limit = headers.get('X-RateLimit-Limit');

    if (remaining) this.rateLimitInfo.remaining = parseInt(remaining);
    if (reset) this.rateLimitInfo.reset = new Date(parseInt(reset) * 1000);
    if (limit) this.rateLimitInfo.limit = parseInt(limit);

    if (this.config.debug && remaining) {
      console.log('📊 Rate limit updated:', this.rateLimitInfo);
    }
  }

  /**
   * Check if we should wait before making a request
   */
  private async checkRateLimit(): Promise<void> {
    if (this.rateLimitInfo.remaining <= 5 && this.rateLimitInfo.reset) {
      const now = new Date();
      if (now < this.rateLimitInfo.reset) {
        const waitTime = this.rateLimitInfo.reset.getTime() - now.getTime();
        console.log(`🚦 Rate limit approaching, waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  async request<T>(
    method: string,
    endpoint: string,
    data: any = null,
    retryCount: number = 0
  ): Promise<ApiResponse<T>> {
    // Check rate limits before making request
    await this.checkRateLimit();

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    if (this.config.debug) {
      console.log(`📡 API Request: ${method} ${url}`, data ? { body: data } : '');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: this.headers,
        body: data ? JSON.stringify(data) : null,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Update rate limit info
      this.updateRateLimitInfo(response.headers);

      const responseData = await response.json();

      if (!response.ok) {
        const error: ApiResponse<T> = {
          error: responseData.error?.message || responseData.message || `HTTP ${response.status}`,
          status: response.status,
          details: responseData
        };

        // Check if error is retryable
        const isRetryable = response.status === 429 || response.status >= 500;
        
        if (isRetryable && retryCount < this.config.maxRetries) {
          const delay = this.config.baseDelay * Math.pow(2, retryCount);
          console.log(`🔄 Retrying after ${delay}ms (attempt ${retryCount + 1}/${this.config.maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.request<T>(method, endpoint, data, retryCount + 1);
        }

        return error;
      }

      if (this.config.debug) {
        console.log(`✅ API Response: ${method} ${url}`, { status: response.status });
      }

      return {
        data: responseData as T,
        status: response.status
      };

    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        console.error('❌ Request timeout:', url);
        
        if (retryCount < this.config.maxRetries) {
          const delay = this.config.baseDelay * Math.pow(2, retryCount);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.request<T>(method, endpoint, data, retryCount + 1);
        }
        
        return { error: 'Request timeout', status: 408 };
      }

      console.error('❌ API Request failed:', error);
      
      // Network errors are retryable
      if (retryCount < this.config.maxRetries) {
        const delay = this.config.baseDelay * Math.pow(2, retryCount);
        console.log(`🔄 Retrying after network error (attempt ${retryCount + 1}/${this.config.maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.request<T>(method, endpoint, data, retryCount + 1);
      }

      return {
        error: error.message || 'Network request failed',
        status: 0,
        details: error
      };
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint);
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data);
  }

  /**
   * Get current rate limit status
   */
  getRateLimitInfo(): RateLimitInfo {
    return { ...this.rateLimitInfo };
  }

  /**
   * Check if API key is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }
}

// Export singleton instance for backward compatibility
export const instantlyApiClient = new InstantlyAPIClient();

// Export class and types
export { InstantlyAPIClient };
export type { ApiResponse, RateLimitInfo, InstantlyApiConfig };