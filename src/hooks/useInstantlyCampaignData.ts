/**
 * Advanced React Hook for Instantly Campaign Data
 * Provides real-time campaign data with auto-refresh, filtering, and error handling
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { campaignDataManager } from '../services/instantlyDataManager';
import { DashboardCampaign } from '../services/instantlyDataTransformer';
import { instantlyApiClient } from '../services/instantlyApiClient';

export type CampaignFilter = 'All' | 'Draft' | 'Running' | 'Paused' | 'Stopped' | 'Completed';

interface UseCampaignDataOptions {
  autoRefresh?: boolean;
  autoRefreshInterval?: number; // milliseconds
  initialFilter?: CampaignFilter;
}

interface UseCampaignDataReturn {
  // Data
  campaigns: DashboardCampaign[];
  allCampaigns: DashboardCampaign[];
  
  // State
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  filter: CampaignFilter;
  
  // Actions
  setFilter: (filter: CampaignFilter) => void;
  refreshData: () => Promise<void>;
  
  // Info
  rateLimitInfo: {
    remaining: number;
    reset: Date | null;
    limit: number;
  };
  stats: {
    total: number;
    draft: number;
    running: number;
    paused: number;
    completed: number;
    stopped: number;
  };
}

export function useCampaignData(
  apiKey?: string,
  options: UseCampaignDataOptions = {}
): UseCampaignDataReturn {
  // Configuration
  const {
    autoRefresh = true,
    autoRefreshInterval = 5 * 60 * 1000, // 5 minutes
    initialFilter = 'All'
  } = options;

  // State
  const [campaigns, setCampaigns] = useState<DashboardCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filter, setFilter] = useState<CampaignFilter>(initialFilter);
  const [rateLimitInfo, setRateLimitInfo] = useState({
    remaining: 100,
    reset: null as Date | null,
    limit: 100
  });

  // Refs
  const autoRefreshInterval$ = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  // Check if API is configured
  const isConfigured = apiKey || instantlyApiClient.isConfigured();

  /**
   * Fetch campaign data
   */
  const fetchData = useCallback(async (silent = false) => {
    if (!isConfigured) {
      setError('Instantly API key not configured');
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    setError(null);

    try {
      console.log('🔄 Fetching campaign data...');
      
      const data = await campaignDataManager.fetchAllCampaignData({
        forceRefresh: !silent
      });
      
      if (isMounted.current) {
        setCampaigns(data);
        setLastUpdated(new Date());
        setRateLimitInfo(instantlyApiClient.getRateLimitInfo());
      }

    } catch (err: any) {
      console.error('❌ Failed to fetch campaigns:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to fetch campaign data');
      }
    } finally {
      if (isMounted.current && !silent) {
        setLoading(false);
      }
    }
  }, [isConfigured]);

  /**
   * Manual refresh
   */
  const refreshData = useCallback(async () => {
    await fetchData(false);
  }, [fetchData]);

  /**
   * Filter campaigns based on status
   */
  const filteredCampaigns = useMemo(() => {
    if (filter === 'All') return campaigns;
    
    return campaigns.filter(campaign => {
      switch (filter) {
        case 'Draft':
          return campaign.isDraft;
        case 'Running':
          return campaign.isActive;
        case 'Paused':
          return campaign.isPaused;
        case 'Stopped':
          // Consider high bounce rate as stopped
          return campaign.status === 'Stopped' || 
                 (campaign.isPaused && campaign.bounced > campaign.emailsSent * 0.1);
        case 'Completed':
          return campaign.isCompleted;
        default:
          return true;
      }
    });
  }, [campaigns, filter]);

  /**
   * Calculate stats
   */
  const stats = useMemo(() => {
    return {
      total: campaigns.length,
      draft: campaigns.filter(c => c.isDraft).length,
      running: campaigns.filter(c => c.isActive).length,
      paused: campaigns.filter(c => c.isPaused).length,
      stopped: campaigns.filter(c => 
        c.status === 'Stopped' || 
        (c.isPaused && c.bounced > c.emailsSent * 0.1)
      ).length,
      completed: campaigns.filter(c => c.isCompleted).length
    };
  }, [campaigns]);

  /**
   * Initial data fetch
   */
  useEffect(() => {
    if (isConfigured) {
      fetchData();
    }

    return () => {
      isMounted.current = false;
    };
  }, [isConfigured, fetchData]);

  /**
   * Auto-refresh setup
   */
  useEffect(() => {
    if (autoRefresh && !loading && campaigns.length > 0) {
      console.log(`⏰ Setting up auto-refresh every ${autoRefreshInterval}ms`);
      
      autoRefreshInterval$.current = setInterval(() => {
        console.log('🔄 Auto-refreshing campaign data...');
        fetchData(true); // Silent refresh
      }, autoRefreshInterval);

      return () => {
        if (autoRefreshInterval$.current) {
          clearInterval(autoRefreshInterval$.current);
        }
      };
    }
  }, [autoRefresh, autoRefreshInterval, loading, campaigns.length, fetchData]);

  return {
    // Data
    campaigns: filteredCampaigns,
    allCampaigns: campaigns,
    
    // State
    loading,
    error,
    lastUpdated,
    filter,
    
    // Actions
    setFilter,
    refreshData,
    
    // Info
    rateLimitInfo,
    stats
  };
}

/**
 * Hook for single campaign data
 */
export function useSingleCampaign(campaignId: string) {
  const [campaign, setCampaign] = useState<DashboardCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCampaign = async () => {
      setLoading(true);
      setError(null);

      try {
        const data = await campaignDataManager.getCampaignById(campaignId);
        setCampaign(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch campaign');
      } finally {
        setLoading(false);
      }
    };

    if (campaignId) {
      fetchCampaign();
    }
  }, [campaignId]);

  const refresh = useCallback(async () => {
    if (!campaignId) return;
    
    setLoading(true);
    try {
      const data = await campaignDataManager.getCampaignById(campaignId, {
        forceRefresh: true
      });
      setCampaign(data);
    } catch (err: any) {
      setError(err.message || 'Failed to refresh campaign');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  return {
    campaign,
    loading,
    error,
    refresh
  };
}