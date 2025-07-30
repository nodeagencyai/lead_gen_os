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
  
  // COPY FROM OTHER SOFTWARE: Clean loading pattern
  const [allData, setAllData] = useState<UnifiedDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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

  // COPY FROM OTHER SOFTWARE: Clean unified data fetching
  const fetchAllData = async () => {
    console.log(`🔄 Loading ${mode} dashboard with clean loading pattern...`);
    setLoading(true);
    setError(null);

    try {
      if (mode === 'email') {
        // EMAIL DASHBOARD: Promise.all for simultaneous fetching
        const [apiData, leadData] = await Promise.all([
          IntegrationService.getInstantlyData(),
          fetchLeadAnalytics('Apollo')
        ]);

        console.log('✅ Email dashboard data loaded completely');
        setAllData({ apiData, leadData });
        
      } else {
        // LINKEDIN DASHBOARD: Promise.all for simultaneous fetching  
        const [apiData, leadData] = await Promise.all([
          IntegrationService.getHeyReachData(),
          fetchLeadAnalytics('LinkedIn')
        ]);

        console.log('✅ LinkedIn dashboard data loaded completely');
        setAllData({ apiData, leadData });
      }

      // Clean finish - all data ready
      setLoading(false);

    } catch (error) {
      console.error(`${mode} dashboard loading failed:`, error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
      setLoading(false);
    }
  };

  // COPY FROM OTHER SOFTWARE: Mode change triggers clean reload
  useEffect(() => {
    console.log(`🔄 Mode changed to ${mode} - triggering clean reload`);
    fetchAllData();

    // Set up background refresh every 30 seconds
    const interval = setInterval(() => {
      console.log('🔄 Background refresh...');
      fetchAllData();
    }, 30000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode]);

  // Manual refresh function
  const forceRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    fetchAllData();
  };

  // COPY FROM OTHER SOFTWARE: Transform unified data to legacy format
  const metrics = useMemo(() => {
    if (!allData) {
      // Return loading state - matches legacy interface
      return {
        emailMetrics: { sent: 0, opened: 0, replied: 0, meetings: 0, bounceRate: 0 },
        linkedinMetrics: { connectionRequests: 0, connectionsAccepted: 0, messagesSent: 0, messageReplies: 0, meetings: 0 },
        leadAnalytics: { totalLeads: 0, profileCoverage: { percentage: 0, completed: 0, total: 0 }, personalizationRate: { percentage: 0, personalized: 0, total: 0 } },
        campaigns: [],
        leads: [],
        loading,
        error
      };
    }

    // Transform loaded data to legacy format
    if (mode === 'email') {
      const emailMetrics = {
        sent: allData.apiData?.analytics?.emails_sent || 0,
        opened: allData.apiData?.analytics?.emails_opened || 0,
        replied: allData.apiData?.analytics?.emails_replied || 0,
        meetings: allData.apiData?.analytics?.meetings_booked || 0,
        bounceRate: Number(allData.apiData?.analytics?.bounce_rate) || 0
      };

      const campaigns = allData.apiData?.campaigns?.map((camp: any, index: number) => ({
        name: camp.name || `Campaign ${index + 1}`,
        sent: 0,
        replies: 0,
        meetings: 0,
        rate: '0%'
      })) || [];

      return {
        emailMetrics,
        linkedinMetrics: { connectionRequests: 0, connectionsAccepted: 0, messagesSent: 0, messageReplies: 0, meetings: 0 },
        leadAnalytics: allData.leadData,
        campaigns,
        leads: [],
        loading,
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
        loading,
        error
      };
    }
  }, [allData, loading, error, mode]);

  return {
    ...metrics,
    forceRefresh
  };
};