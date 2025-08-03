/**
 * Rate limiter for HeyReach API
 * Ensures we stay under 300 requests per minute as per official documentation
 */

class RateLimiter {
  constructor(maxRequests = 300, timeWindow = 60000) {
    // Use the official HeyReach limit of 300/minute
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }
  
  /**
   * Check if we can make a request without exceeding rate limit
   * @throws {Error} If rate limit would be exceeded
   */
  async checkLimit() {
    const now = Date.now();
    
    // Remove old requests outside the time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.timeWindow - (now - oldestRequest);
      const error = new Error(`Rate limit exceeded. Wait ${waitTime}ms`);
      error.waitTime = waitTime;
      throw error;
    }
    
    // Record this request
    this.requests.push(now);
  }
  
  /**
   * Get current rate limit status
   */
  getStatus() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    return {
      current: this.requests.length,
      limit: this.maxRequests,
      remaining: this.maxRequests - this.requests.length,
      resetTime: this.requests.length > 0 ? this.requests[0] + this.timeWindow : now
    };
  }
}

// Create a singleton instance for all HeyReach API calls
// Official HeyReach limit: 300 requests per minute
export const heyreachRateLimiter = new RateLimiter(300, 60000);