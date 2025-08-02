/**
 * Advanced Data Manager for Instantly.ai Campaigns
 * Implements smart caching, batch fetching, and queue management
 */

import { apiClient } from '../utils/apiClient';
import { 
  DataTransformer, 
  DashboardCampaign,
  InstantlyCampaignRaw,
  InstantlyCampaignAnalytics,
  InstantlyAnalyticsOverview,
  InstantlyLeadsData
} from './instantlyDataTransformer';

interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiry: Date;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  forceRefresh?: boolean;
}

interface BatchAnalyticsRequest {
  campaignIds: string[];
  includeOverview?: boolean;
  includeLeads?: boolean;
}

export class CampaignDataManager {
  private memoryCache: Map<string, CacheEntry<any>>;
  private sessionCache: Storage | null;
  private cacheDuration: number;
  private lastFetchTime: Date | null;
  private isProcessingQueue: boolean;
  private requestQueue: Array<() => Promise<any>>;
  private cacheKeys = {
    campaigns: 'instantly_campaigns',
    analytics: 'instantly_analytics',
    overview: 'instantly_overview',
    leads: 'instantly_leads'
  };

  constructor(cacheDuration: number = 5 * 60 * 1000) { // 5 minutes default
    this.memoryCache = new Map();
    this.sessionCache = typeof window !== 'undefined' ? window.sessionStorage : null;
    this.cacheDuration = cacheDuration;
    this.lastFetchTime = null;
    this.isProcessingQueue = false;
    this.requestQueue = [];
  }

  /**
   * Multi-layer caching system
   */
  private setCache<T>(key: string, data: T, ttl: number = this.cacheDuration): void {
    const expiry = new Date(Date.now() + ttl);
    const cacheEntry: CacheEntry<T> = {
      data,
      timestamp: new Date(),
      expiry
    };

    // Memory cache
    this.memoryCache.set(key, cacheEntry);

    // Session storage for persistence
    if (this.sessionCache) {
      try {
        this.sessionCache.setItem(key, JSON.stringify(cacheEntry));
      } catch (e) {
        console.warn('Session storage failed:', e);
      }
    }
  }

  private getCache<T>(key: string): T | null {
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key)!;
      if (cached.expiry > new Date()) {
        return cached.data;
      }
      this.memoryCache.delete(key);
    }

    // Check session storage
    if (this.sessionCache) {
      try {
        const cached = JSON.parse(this.sessionCache.getItem(key) || 'null');
        if (cached && new Date(cached.expiry) > new Date()) {
          this.memoryCache.set(key, cached); // Restore to memory
          return cached.data;
        }
      } catch (e) {
        console.warn('Session storage read failed:', e);
      }
    }

    return null;
  }

  /**
   * Fetch all campaign data with smart caching
   */
  async fetchAllCampaignData(options: CacheOptions = {}): Promise<DashboardCampaign[]> {
    const cacheKey = this.cacheKeys.campaigns;
    
    // Check cache first
    if (!options.forceRefresh) {
      const cached = this.getCache<DashboardCampaign[]>(cacheKey);
      if (cached) {
        console.log('📦 Returning cached campaign data');
        return cached;
      }
    }

    try {
      console.log('🔄 Fetching fresh campaign data...');
      
      // Phase 1: Fetch campaigns list
      const campaignsResponse = await apiClient.instantly('/campaigns');
      
      if (campaignsResponse.error) {
        throw new Error(campaignsResponse.error);
      }

      const campaigns = (campaignsResponse.data as any)?.items || [];
      console.log(`📋 Found ${campaigns.length} campaigns`);

      if (campaigns.length === 0) {
        this.setCache(cacheKey, []);
        return [];
      }

      // Phase 2: Batch fetch analytics
      const enrichedCampaigns = await this.batchFetchAnalytics(campaigns);
      
      // Cache the results
      this.setCache(cacheKey, enrichedCampaigns);
      this.lastFetchTime = new Date();
      
      return enrichedCampaigns;

    } catch (error) {
      console.error('❌ Failed to fetch campaign data:', error);
      
      // Return cached data if available on error
      const cached = this.getCache<DashboardCampaign[]>(cacheKey);
      if (cached) {
        console.log('📦 Returning cached data due to error');
        return cached;
      }
      
      throw error;
    }
  }

  /**
   * Batch fetch analytics for multiple campaigns
   */
  private async batchFetchAnalytics(
    campaigns: InstantlyCampaignRaw[]
  ): Promise<DashboardCampaign[]> {
    const results: DashboardCampaign[] = [];
    const concurrencyLimit = 3; // Prevent overwhelming the API
    
    for (let i = 0; i < campaigns.length; i += concurrencyLimit) {
      const batch = campaigns.slice(i, i + concurrencyLimit);
      
      const batchPromises = batch.map(async (campaign) => {
        try {
          const cacheKey = `${this.cacheKeys.analytics}_${campaign.id}`;
          
          // Check individual campaign cache
          const cached = this.getCache<DashboardCampaign>(cacheKey);
          if (cached) {
            return cached;
          }
          
          // Fetch all data for this campaign
          const [analytics, overview, leads] = await Promise.all([
            this.fetchCampaignAnalytics(campaign.id),
            this.fetchAnalyticsOverview(campaign.id),
            this.fetchCampaignLeads(campaign.id)
          ]);
          
          const transformedData = DataTransformer.transformCampaignData(
            campaign,
            analytics,
            overview,
            leads
          );
          
          // Cache individual campaign
          this.setCache(cacheKey, transformedData);
          
          return transformedData;
          
        } catch (error) {
          console.error(`❌ Failed to enrich campaign ${campaign.id}:`, error);
          
          // Return campaign with empty metrics on error
          return DataTransformer.createFallbackCampaign(campaign.id, campaign.name);
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Rate limiting: small delay between batches
      if (i + concurrencyLimit < campaigns.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return results;
  }

  /**
   * Fetch campaign analytics
   */
  private async fetchCampaignAnalytics(
    campaignId: string
  ): Promise<InstantlyCampaignAnalytics | undefined> {
    try {
      const response = await apiClient.instantly(`/analytics?campaign_id=${campaignId}`);
      
      if (response.error) {
        console.warn(`⚠️ Analytics not available for campaign ${campaignId}`);
        return undefined;
      }
      
      // Handle array response
      const data = response.data as any;
      if (Array.isArray(data)) {
        return data[0];
      }
      
      return data;
      
    } catch (error) {
      console.error(`❌ Failed to fetch analytics for ${campaignId}:`, error);
      return undefined;
    }
  }

  /**
   * Fetch analytics overview
   */
  private async fetchAnalyticsOverview(
    campaignId: string
  ): Promise<InstantlyAnalyticsOverview | undefined> {
    try {
      const response = await apiClient.instantly(`/analytics/overview?id=${campaignId}`);
      
      if (response.error) {
        console.warn(`⚠️ Overview not available for campaign ${campaignId}`);
        return undefined;
      }
      
      return response.data as InstantlyAnalyticsOverview;
      
    } catch (error) {
      console.error(`❌ Failed to fetch overview for ${campaignId}:`, error);
      return undefined;
    }
  }

  /**
   * Fetch campaign leads
   */
  private async fetchCampaignLeads(
    campaignId: string
  ): Promise<InstantlyLeadsData | undefined> {
    try {
      const response = await apiClient.post('/api/instantly/leads', {
        campaign_id: campaignId,
        limit: 100
      });
      
      if (response.error) {
        console.warn(`⚠️ Leads not available for campaign ${campaignId}`);
        return undefined;
      }
      
      return response.data as InstantlyLeadsData;
      
    } catch (error) {
      console.error(`❌ Failed to fetch leads for ${campaignId}:`, error);
      return undefined;
    }
  }

  /**
   * Get single campaign by ID
   */
  async getCampaignById(
    campaignId: string,
    options: CacheOptions = {}
  ): Promise<DashboardCampaign | null> {
    const cacheKey = `${this.cacheKeys.analytics}_${campaignId}`;
    
    if (!options.forceRefresh) {
      const cached = this.getCache<DashboardCampaign>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      // Fetch campaign details
      const campaignResponse = await apiClient.instantly(`/campaigns/${campaignId}`);
      
      if (campaignResponse.error) {
        throw new Error(campaignResponse.error);
      }
      
      const campaign = campaignResponse.data as InstantlyCampaignRaw;
      
      // Fetch additional data
      const [analytics, overview, leads] = await Promise.all([
        this.fetchCampaignAnalytics(campaignId),
        this.fetchAnalyticsOverview(campaignId),
        this.fetchCampaignLeads(campaignId)
      ]);
      
      const transformedData = DataTransformer.transformCampaignData(
        campaign,
        analytics,
        overview,
        leads
      );
      
      this.setCache(cacheKey, transformedData);
      return transformedData;

    } catch (error) {
      console.error(`❌ Failed to fetch campaign ${campaignId}:`, error);
      return null;
    }
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.memoryCache.clear();
    
    if (this.sessionCache) {
      Object.values(this.cacheKeys).forEach(key => {
        this.sessionCache!.removeItem(key);
      });
    }
    
    console.log('🧹 Cache cleared');
  }

  /**
   * Get cache status
   */
  getCacheStatus(): {
    size: number;
    entries: string[];
    lastFetch: Date | null;
  } {
    return {
      size: this.memoryCache.size,
      entries: Array.from(this.memoryCache.keys()),
      lastFetch: this.lastFetchTime
    };
  }

  /**
   * Check if cache is valid
   */
  isCacheValid(): boolean {
    return this.lastFetchTime !== null &&
           (new Date().getTime() - this.lastFetchTime.getTime()) < this.cacheDuration &&
           this.memoryCache.size > 0;
  }
}

// Export singleton instance
export const campaignDataManager = new CampaignDataManager();

// Export for custom instances
export default CampaignDataManager;