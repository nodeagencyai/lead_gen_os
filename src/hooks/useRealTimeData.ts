import { useState, useEffect, useMemo } from 'react';
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
    openRate?: number;
    changes?: {
      sent: string | number;
      unique_opened: string | number;
      unique_replies: string | number;
      meetings_booked: string | number;
      bounce_rate: string | number;
    };
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

// COPY FROM OTHER SOFTWARE: Unified data structure
interface UnifiedDashboardData {
  apiData: any;
  leadData: any;
}

export const useRealTimeData = () => {
  const { mode } = useCampaignStore();
  
  // SPEED OPTIMIZATION: Smart caching + faster loading
  const [allData, setAllData] = useState<UnifiedDashboardData | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isBackgroundRefresh, setIsBackgroundRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Smart caching with 90-second expiry for fast mode switching
  const [dataCache, setDataCache] = useState<{
    email?: { data: UnifiedDashboardData; timestamp: number };
    linkedin?: { data: UnifiedDashboardData; timestamp: number };
  }>({});
  const CACHE_DURATION = 90 * 1000; // 90 seconds - balance between speed and freshness
  
  // Background refresh interval
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Clean Lead Analytics fetch function (optimized)
  const fetchLeadAnalytics = async (tableName: string) => {
    try {
      console.log(`📊 Fetching lead analytics from ${tableName} table...`);
      
      // Parallel database queries for speed
      const [countResult, profileResult, personalizationResult] = await Promise.all([
        // Total count
        supabase.from(tableName).select('*', { count: 'exact', head: true }),
        
        // Profile completion count
        tableName === 'Apollo' 
          ? supabase.from(tableName).select('*', { count: 'exact', head: true })
              .not('full_name', 'is', null).not('email', 'is', null)
              .not('company', 'is', null).not('title', 'is', null)
          : supabase.from(tableName).select('*', { count: 'exact', head: true })
              .not('name', 'is', null).not('email', 'is', null)
              .not('company', 'is', null).not('position', 'is', null),
        
        // Personalization count
        tableName === 'Apollo'
          ? supabase.from(tableName).select('*', { count: 'exact', head: true })
              .or('icebreaker.not.is.null,personalization_hooks.not.is.null')
          : supabase.from(tableName).select('*', { count: 'exact', head: true })
              .not('icebreaker', 'is', null)
      ]);

      const total = countResult.count || 0;
      const completeProfiles = profileResult.count || 0;
      const personalizedLeads = personalizationResult.count || 0;

      return {
        totalLeads: total,
        profileCoverage: {
          percentage: total > 0 ? Math.round((completeProfiles / total) * 100) : 0,
          completed: completeProfiles,
          total: total
        },
        personalizationRate: {
          percentage: total > 0 ? Math.round((personalizedLeads / total) * 100) : 0,
          personalized: personalizedLeads,
          total: total
        }
      };

    } catch (error) {
      console.error(`Failed to fetch lead analytics from ${tableName}:`, error);
      return {
        totalLeads: 0,
        profileCoverage: { percentage: 0, completed: 0, total: 0 },
        personalizationRate: { percentage: 0, personalized: 0, total: 0 }
      };
    }
  };

  // SPEED OPTIMIZATION: Fast cache checking + optimized data fetching
  const fetchAllData = async (isInitialLoad = false, bypassCache = false) => {
    console.log(`🚀 Loading ${mode} dashboard (optimized)...`);
    
    // SPEED BOOST: Check cache first for instant loading
    if (!bypassCache) {
      const cached = dataCache[mode as keyof typeof dataCache];
      if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        console.log(`⚡ INSTANT: Using cached ${mode} data (${Math.round((Date.now() - cached.timestamp) / 1000)}s old)`);
        setAllData(cached.data);
        setInitialLoading(false);
        setIsBackgroundRefresh(false);
        return;
      }
    }
    
    if (isInitialLoad) {
      setInitialLoading(true);
    } else {
      setIsBackgroundRefresh(true);
    }
    
    setError(null);

    try {
      console.time(`${mode}-load`); // Measure load time
      
      if (mode === 'email') {
        // EMAIL DASHBOARD: Optimized Promise.all with faster timeout
        const [apiData, leadData] = await Promise.all([
          Promise.race([
            // Fetch both campaigns and aggregated analytics
            (async () => {
              console.log('🚀 Starting to fetch campaigns and calculate client-side aggregated analytics...');
              const { InstantlyCampaignService } = await import('../services/instantlyCampaignService');
              
              // Fetch campaigns with individual analytics (this works!)
              const campaigns = await InstantlyCampaignService.fetchAllCampaigns();
              console.log('📋 Campaigns Response:', campaigns?.length || 0, 'campaigns');
              
              // Calculate aggregated analytics from individual campaign data
              const aggregatedAnalytics = {
                sent: 0,
                unique_opened: 0,
                unique_replies: 0,
                meetings_booked: 0,
                bounced: 0,
                unsubscribed: 0,
                leads_count: 0,
                open_rate: 0,
                bounce_rate: 0,
                reply_rate: 0,
                changes: {
                  sent: 0,
                  unique_opened: 0,
                  unique_replies: 0,
                  meetings_booked: 0,
                  bounce_rate: 0
                }
              };
              
              // Aggregate data from all campaigns
              campaigns?.forEach(campaign => {
                aggregatedAnalytics.sent += campaign.emailsSent || 0;
                aggregatedAnalytics.unique_opened += campaign.analytics?.open_count || 0;
                aggregatedAnalytics.unique_replies += campaign.analytics?.reply_count || 0;
                aggregatedAnalytics.meetings_booked += campaign.analytics?.total_opportunities || 0;
                aggregatedAnalytics.bounced += campaign.analytics?.bounced_count || 0;
                aggregatedAnalytics.unsubscribed += campaign.analytics?.unsubscribed_count || 0;
                aggregatedAnalytics.leads_count += campaign.analytics?.leads_count || 0;
              });
              
              // Calculate rates
              if (aggregatedAnalytics.sent > 0) {
                aggregatedAnalytics.open_rate = Number(((aggregatedAnalytics.unique_opened / aggregatedAnalytics.sent) * 100).toFixed(2));
                aggregatedAnalytics.reply_rate = Number(((aggregatedAnalytics.unique_replies / aggregatedAnalytics.sent) * 100).toFixed(2));
              }
              
              console.log('📊 CLIENT-SIDE AGGREGATED ANALYTICS:', aggregatedAnalytics);
              
              return { campaigns, analytics: aggregatedAnalytics };
            })(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('API timeout')), 8000)) // 8s timeout
          ]),
          fetchLeadAnalytics('Apollo')
        ]);

        const dashboardData = { apiData, leadData };
        console.timeEnd(`${mode}-load`);
        console.log('⚡ Email dashboard loaded with optimization');
        
        // Cache the result
        setDataCache(prev => ({ ...prev, email: { data: dashboardData, timestamp: Date.now() } }));
        setAllData(dashboardData);
        
      } else {
        // LINKEDIN DASHBOARD: Optimized Promise.all with faster timeout
        const [apiData, leadData] = await Promise.all([
          Promise.race([
            IntegrationService.getHeyReachData(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('API timeout')), 8000)) // 8s timeout
          ]),
          fetchLeadAnalytics('LinkedIn')
        ]);

        const dashboardData = { apiData, leadData };
        console.timeEnd(`${mode}-load`);
        console.log('⚡ LinkedIn dashboard loaded with optimization');
        
        // Cache the result
        setDataCache(prev => ({ ...prev, linkedin: { data: dashboardData, timestamp: Date.now() } }));
        setAllData(dashboardData);
      }

      // Clean finish - all data ready
      if (isInitialLoad) {
        setInitialLoading(false);
      } else {
        setIsBackgroundRefresh(false);
      }

    } catch (error) {
      console.error(`${mode} dashboard loading failed:`, error);
      console.timeEnd(`${mode}-load`);
      
      // FALLBACK: Try to use stale cache if available
      const staleCache = dataCache[mode as keyof typeof dataCache];
      if (staleCache) {
        console.log(`🔄 Using stale cache as fallback (${Math.round((Date.now() - staleCache.timestamp) / 1000)}s old)`);
        setAllData(staleCache.data);
        setError('Using cached data - refresh to retry');
      } else {
        setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
      }
      
      if (isInitialLoad) {
        setInitialLoading(false);
      } else {
        setIsBackgroundRefresh(false);
      }
    }
  };

  // SPEED OPTIMIZATION: Fast mode switching + background refresh + preloading
  useEffect(() => {
    console.log(`🚀 Mode changed to ${mode} - checking cache first`);
    // Try cache first, then load if needed - much faster mode switching
    fetchAllData(true, false); // Initial load with cache check

    // PRELOAD: After 5 seconds, preload the alternate mode for instant future switching
    const preloadTimeout = setTimeout(() => {
      const alternateMode = mode === 'email' ? 'linkedin' : 'email';
      const alternateCache = dataCache[alternateMode as keyof typeof dataCache];
      
      if (!alternateCache || (Date.now() - alternateCache.timestamp > CACHE_DURATION)) {
        console.log(`🚀 PRELOADING: ${alternateMode} data for faster future switching...`);
        
        // Preload alternate mode data silently
        const preloadData = async () => {
          try {
            let preloadResult;
            if (alternateMode === 'email') {
              const [apiData, leadData] = await Promise.all([
                Promise.race([
                  IntegrationService.getInstantlyData(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Preload timeout')), 10000))
                ]),
                fetchLeadAnalytics('Apollo')
              ]);
              preloadResult = { apiData, leadData };
            } else {
              const [apiData, leadData] = await Promise.all([
                Promise.race([
                  IntegrationService.getHeyReachData(),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Preload timeout')), 10000))
                ]),
                fetchLeadAnalytics('LinkedIn')
              ]);
              preloadResult = { apiData, leadData };
            }
            
            // Cache preloaded data
            setDataCache(prev => ({
              ...prev,
              [alternateMode]: { data: preloadResult, timestamp: Date.now() }
            }));
            console.log(`✅ PRELOADED: ${alternateMode} data cached for instant switching`);
            
          } catch (error) {
            console.log(`⚠️ Preload failed for ${alternateMode}:`, error);
          }
        };
        
        preloadData();
      }
    }, 5000); // Preload after 5 seconds

    // Set up background refresh every 30 seconds - bypass cache for fresh data
    const interval = setInterval(() => {
      console.log('🔄 Background refresh (silent, bypassing cache)...');
      fetchAllData(false, true); // Background refresh bypasses cache for fresh data
    }, 30000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
      if (preloadTimeout) clearTimeout(preloadTimeout);
    };
  }, [mode, dataCache]);

  // Manual refresh function - bypasses cache for fresh data
  const forceRefresh = () => {
    console.log('🔄 Manual refresh triggered (bypassing cache)');
    fetchAllData(true, true); // Manual refresh bypasses cache and shows spinner
  };

  // MINIMALISTIC SPINNER: Transform unified data to legacy format
  const metrics = useMemo(() => {
    if (!allData) {
      // Return loading state - matches legacy interface
      return {
        emailMetrics: { sent: 0, opened: 0, replied: 0, meetings: 0, bounceRate: 0, openRate: 0, changes: { sent: 0, unique_opened: 0, unique_replies: 0, meetings_booked: 0, bounce_rate: 0 } },
        linkedinMetrics: { connectionRequests: 0, connectionsAccepted: 0, messagesSent: 0, messageReplies: 0, meetings: 0 },
        leadAnalytics: { totalLeads: 0, profileCoverage: { percentage: 0, completed: 0, total: 0 }, personalizationRate: { percentage: 0, personalized: 0, total: 0 } },
        campaigns: [],
        leads: [],
        loading: initialLoading, // Use initialLoading instead of loading
        error
      };
    }

    // Transform loaded data to legacy format
    if (mode === 'email') {
      console.log('🔍 DEBUG: allData:', allData);
      console.log('🔍 DEBUG: allData.apiData:', allData.apiData);
      console.log('🔍 DEBUG: allData.apiData.analytics:', allData.apiData?.analytics);
      console.log('🔍 DEBUG: Object.keys(allData.apiData):', Object.keys(allData.apiData || {}));
      
      const emailMetrics = {
        sent: allData.apiData?.analytics?.sent || 0,
        opened: allData.apiData?.analytics?.unique_opened || 0,
        replied: allData.apiData?.analytics?.unique_replies || 0,
        meetings: allData.apiData?.analytics?.meetings_booked || 0,
        bounceRate: Number(allData.apiData?.analytics?.bounce_rate) || 0,
        openRate: Number(allData.apiData?.analytics?.open_rate) || 0,
        // Store percentage changes for the UI
        changes: allData.apiData?.analytics?.changes || {
          sent: 0,
          unique_opened: 0,
          unique_replies: 0,
          meetings_booked: 0,
          bounce_rate: 0
        }
      };
      
      console.log('📊 EMAIL METRICS TRANSFORMED:', emailMetrics);

      const campaigns = allData.apiData?.campaigns?.map((camp: any, index: number) => ({
        name: camp.name || `Campaign ${index + 1}`,
        sent: camp.emailsSent || 0,
        replies: camp.replies || 0,
        meetings: camp.meetings || 0,
        rate: camp.replyRate ? `${camp.replyRate}%` : '0%'
      })) || [];

      return {
        emailMetrics,
        linkedinMetrics: { connectionRequests: 0, connectionsAccepted: 0, messagesSent: 0, messageReplies: 0, meetings: 0 },
        leadAnalytics: allData.leadData,
        campaigns,
        leads: [],
        loading: initialLoading, // Use initialLoading instead of loading
        error
      };
    } else {
      const linkedinMetrics = {
        connectionRequests: allData.apiData?.analytics?.connection_requests_sent || 0,
        connectionsAccepted: allData.apiData?.analytics?.connections_accepted || 0,
        messagesSent: allData.apiData?.analytics?.messages_sent || 0,
        messageReplies: allData.apiData?.analytics?.message_replies || 0,
        meetings: allData.apiData?.analytics?.meetings_booked || 0
      };

      return {
        emailMetrics: { sent: 0, opened: 0, replied: 0, meetings: 0, bounceRate: 0 },
        linkedinMetrics,
        leadAnalytics: allData.leadData,
        campaigns: allData.apiData?.campaigns || [],
        leads: allData.apiData?.connections || [],
        loading: initialLoading, // Use initialLoading instead of loading
        error
      };
    }
  }, [allData, initialLoading, error, mode]);

  return {
    ...metrics,
    forceRefresh
  };
};