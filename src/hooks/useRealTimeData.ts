import { useState, useEffect } from 'react';
import { IntegrationService } from '../services/integrationService';
import { useCampaignStore } from '../store/campaignStore';
import { supabase } from '../lib/supabase';

interface RealTimeMetrics {
  emailMetrics: {
    sent: number;
    opened: number;
    replied: number;
    meetings: number;
    bounceRate: number;
  };
  linkedinMetrics: {
    connectionRequests: number;
    connectionsAccepted: number;
    messagesSent: number;
    messageReplies: number;
    meetings: number;
  };
  leadAnalytics: {
    totalLeads: number;
    profileCoverage: {
      percentage: number;
      completed: number;
      total: number;
    };
    personalizationRate: {
      percentage: number;
      personalized: number;
      total: number;
    };
  };
  campaigns: any[];
  leads: any[];
  loading: boolean;
  error: string | null;
}

export const useRealTimeData = () => {
  const { mode } = useCampaignStore();
  const [metrics, setMetrics] = useState<RealTimeMetrics>({
    emailMetrics: {
      sent: 0,
      opened: 0,
      replied: 0,
      meetings: 0,
      bounceRate: 0
    },
    linkedinMetrics: {
      connectionRequests: 0,
      connectionsAccepted: 0,
      messagesSent: 0,
      messageReplies: 0,
      meetings: 0
    },
    leadAnalytics: {
      totalLeads: 0,
      profileCoverage: {
        percentage: 0,
        completed: 0,
        total: 0
      },
      personalizationRate: {
        percentage: 0,
        personalized: 0,
        total: 0
      }
    },
    campaigns: [],
    leads: [],
    loading: true,
    error: null
  });

  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Add caching for Lead Analytics with 2-minute cache duration
  const [leadAnalyticsCache, setLeadAnalyticsCache] = useState<{
    [key: string]: { data: any; timestamp: number; }
  }>({});
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  // Optimized Lead Analytics with caching and database aggregation
  const fetchLeadAnalytics = async () => {
    const tableName = mode === 'email' ? 'Apollo' : 'LinkedIn';
    
    // Check cache first
    const cached = leadAnalyticsCache[tableName];
    if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
      console.log(`⚡ Using cached lead analytics for ${tableName}`);
      return cached.data;
    }
    
    try {
      console.log(`📊 Fetching optimized lead analytics from ${tableName} table...`);
      
      // Use Promise.all for parallel queries instead of sequential
      const [countResult, profileResult, personalizationResult] = await Promise.all([
        // Total count
        supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true }),
        
        // Profile completion count using database filtering
        tableName === 'Apollo' 
          ? supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true })
              .not('full_name', 'is', null)
              .not('email', 'is', null)
              .not('company', 'is', null)
              .not('title', 'is', null)
          : supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true })
              .not('name', 'is', null)
              .not('email', 'is', null)
              .not('company', 'is', null)
              .not('position', 'is', null),
        
        // Personalization count using database filtering
        tableName === 'Apollo'
          ? supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true })
              .or('icebreaker.not.is.null,personalization_hooks.not.is.null')
          : supabase
              .from(tableName)
              .select('*', { count: 'exact', head: true })
              .not('icebreaker', 'is', null)
      ]);

      // Handle errors
      if (countResult.error) {
        console.error(`Error fetching count from ${tableName}:`, countResult.error);
        throw countResult.error;
      }
      if (profileResult.error) {
        console.error(`Error fetching profile count from ${tableName}:`, profileResult.error);
        throw profileResult.error;
      }
      if (personalizationResult.error) {
        console.error(`Error fetching personalization count from ${tableName}:`, personalizationResult.error);
        throw personalizationResult.error;
      }

      const total = countResult.count || 0;
      const completeProfiles = profileResult.count || 0;
      const personalizedLeads = personalizationResult.count || 0;

      if (total === 0) {
        const emptyResult = {
          totalLeads: 0,
          profileCoverage: { percentage: 0, completed: 0, total: 0 },
          personalizationRate: { percentage: 0, personalized: 0, total: 0 }
        };
        
        // Cache empty result to avoid repeated queries
        setLeadAnalyticsCache(prev => ({
          ...prev,
          [tableName]: { data: emptyResult, timestamp: Date.now() }
        }));
        
        return emptyResult;
      }

      const profileCoveragePercentage = Math.round((completeProfiles / total) * 100);
      const personalizationPercentage = Math.round((personalizedLeads / total) * 100);

      const result = {
        totalLeads: total,
        profileCoverage: {
          percentage: profileCoveragePercentage,
          completed: completeProfiles,
          total: total
        },
        personalizationRate: {
          percentage: personalizationPercentage,
          personalized: personalizedLeads,
          total: total
        }
      };

      // Cache the result
      setLeadAnalyticsCache(prev => ({
        ...prev,
        [tableName]: { data: result, timestamp: Date.now() }
      }));

      console.log(`✅ Optimized lead analytics from ${tableName}:`, result);
      return result;

    } catch (error) {
      console.error(`Failed to fetch lead analytics from ${tableName}:`, error);
      const errorResult = {
        totalLeads: 0,
        profileCoverage: { percentage: 0, completed: 0, total: 0 },
        personalizationRate: { percentage: 0, personalized: 0, total: 0 }
      };
      
      // Cache error result briefly to avoid repeated failed requests
      setLeadAnalyticsCache(prev => ({
        ...prev,
        [tableName]: { data: errorResult, timestamp: Date.now() }
      }));
      
      return errorResult;
    }
  };

  const fetchRealTimeData = async (isBackgroundRefresh = false) => {
    try {
      // Only show loading on initial load or manual refresh, not on background refresh
      if (!isBackgroundRefresh) {
        setMetrics(prev => ({ ...prev, loading: true, error: null }));
      } else {
        setMetrics(prev => ({ ...prev, error: null }));
      }

      if (mode === 'email') {
        // Fetch Instantly data - use real data only
        console.log('🔄 Fetching email metrics...');
        try {
          const instantlyData = await IntegrationService.getInstantlyData();
          console.log('✅ Using real Instantly data');
          
          const emailMetrics = {
            sent: instantlyData.analytics.emails_sent || 0,
            opened: instantlyData.analytics.emails_opened || 0,
            replied: instantlyData.analytics.emails_replied || 0,
            meetings: instantlyData.analytics.meetings_booked || 0,
            bounceRate: Number(instantlyData.analytics.bounce_rate) || 0
          };

          const campaigns = instantlyData.campaigns.map((camp: any, index: number) => ({
            name: camp.name || `Campaign ${index + 1}`,
            sent: 0, // No performance data available until campaign is active and sending
            replies: 0,
            meetings: 0,
            rate: '0%'
          }));

          // Fetch lead analytics from Apollo table
          const leadAnalytics = await fetchLeadAnalytics();

          setMetrics(prev => ({
            ...prev,
            emailMetrics,
            leadAnalytics,
            campaigns,
            leads: [],
            loading: isInitialLoad ? false : prev.loading
          }));
          if (isInitialLoad) setIsInitialLoad(false);
        } catch (error) {
          console.error('Instantly API failed:', error);
          // Use zeros when API fails
          const emailMetrics = {
            sent: 0,
            opened: 0,
            replied: 0,
            meetings: 0,
            bounceRate: 0
          };

          // Still try to fetch lead analytics even if API fails
          const leadAnalytics = await fetchLeadAnalytics();

          setMetrics(prev => ({
            ...prev,
            emailMetrics,
            leadAnalytics,
            campaigns: [],
            leads: [],
            loading: isInitialLoad ? false : prev.loading,
            error: error instanceof Error ? error.message : 'Failed to fetch Instantly data'
          }));
          if (isInitialLoad) setIsInitialLoad(false);
        }

      } else {
        // Fetch HeyReach data - use real data only
        try {
          const heyReachData = await IntegrationService.getHeyReachData();
          
          const linkedinMetrics = {
            connectionRequests: heyReachData?.analytics?.connection_requests_sent || 0,
            connectionsAccepted: heyReachData?.analytics?.connections_accepted || 0,
            messagesSent: heyReachData?.analytics?.messages_sent || 0,
            messageReplies: heyReachData?.analytics?.message_replies || 0,
            meetings: heyReachData?.analytics?.meetings_booked || 0
          };

          // Fetch lead analytics from LinkedIn table
          const leadAnalytics = await fetchLeadAnalytics();

          setMetrics(prev => ({
            ...prev,
            linkedinMetrics,
            leadAnalytics,
            campaigns: heyReachData?.campaigns || [],
            leads: heyReachData?.connections || [],
            loading: isInitialLoad ? false : prev.loading
          }));
          if (isInitialLoad) setIsInitialLoad(false);
        } catch (error) {
          console.error('HeyReach API failed:', error);
          // Use zeros when API fails
          const linkedinMetrics = {
            connectionRequests: 0,
            connectionsAccepted: 0,
            messagesSent: 0,
            messageReplies: 0,
            meetings: 0
          };

          // Still try to fetch lead analytics even if API fails
          const leadAnalytics = await fetchLeadAnalytics();

          setMetrics(prev => ({
            ...prev,
            linkedinMetrics,
            leadAnalytics,
            campaigns: [],
            leads: [],
            loading: isInitialLoad ? false : prev.loading,
            error: error instanceof Error ? error.message : 'Failed to fetch HeyReach data'
          }));
          if (isInitialLoad) setIsInitialLoad(false);
        }
      }

    } catch (error) {
      console.error('Real-time data fetch error:', error);
      setMetrics(prev => ({
        ...prev,
        loading: isInitialLoad ? false : prev.loading,
        error: error instanceof Error ? error.message : 'Failed to fetch real-time data'
      }));
      if (isInitialLoad) setIsInitialLoad(false);
    }
  };

  useEffect(() => {
    // Reset initial load state when mode changes
    setIsInitialLoad(true);
    
    // Check if we have cached Lead Analytics for the new mode
    const tableName = mode === 'email' ? 'Apollo' : 'LinkedIn';
    const cached = leadAnalyticsCache[tableName];
    const hasCachedAnalytics = cached && (Date.now() - cached.timestamp < CACHE_DURATION);
    
    if (hasCachedAnalytics) {
      // Use cached data immediately for instant switching
      console.log(`⚡ Instant mode switch using cached data for ${tableName}`);
      setMetrics(prev => ({
        ...prev,
        leadAnalytics: cached.data,
        loading: false
      }));
      setIsInitialLoad(false);
    } else {
      // Show loading state only when no cache available
      setMetrics(prev => ({
        ...prev,
        leadAnalytics: {
          totalLeads: 0,
          profileCoverage: {
            percentage: 0,
            completed: 0,
            total: 0
          },
          personalizationRate: {
            percentage: 0,
            personalized: 0,
            total: 0
          }
        },
        loading: true
      }));
    }
    
    // Always fetch fresh data (will use cache if available)
    fetchRealTimeData(false);

    // Set up auto-refresh every 30 seconds (background refresh)
    const interval = setInterval(() => fetchRealTimeData(true), 30000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode, leadAnalyticsCache]);

  const forceRefresh = () => {
    // Clear cache for current mode to force fresh data
    const tableName = mode === 'email' ? 'Apollo' : 'LinkedIn';
    setLeadAnalyticsCache(prev => {
      const newCache = { ...prev };
      delete newCache[tableName];
      return newCache;
    });
    fetchRealTimeData(false); // Manual refresh shows loading
  };

  return {
    ...metrics,
    forceRefresh
  };
};