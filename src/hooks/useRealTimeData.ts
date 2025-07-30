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
    activeLeads: number;
    campaignLeads: number;
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
      activeLeads: 0,
      campaignLeads: 0
    },
    campaigns: [],
    leads: [],
    loading: true,
    error: null
  });

  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Helper function to fetch lead analytics from Supabase
  const fetchLeadAnalytics = async (tableName: string) => {
    try {
      console.log(`📊 Fetching lead analytics from ${tableName} table...`);
      
      // Get total count
      const { count: totalLeads, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error(`Error fetching count from ${tableName}:`, countError);
        return { totalLeads: 0, activeLeads: 0, campaignLeads: 0 };
      }

      // Get leads data for filtering
      const { data: leadsData, error: leadsError } = await supabase
        .from(tableName)
        .select('id, status, campaign_name');

      if (leadsError) {
        console.error(`Error fetching leads from ${tableName}:`, leadsError);
        return { totalLeads: totalLeads || 0, activeLeads: 0, campaignLeads: 0 };
      }

      const total = totalLeads || 0;
      const active = leadsData?.filter(lead => 
        lead.status !== 'completed' && lead.status !== 'unqualified'
      ).length || 0;
      
      const inCampaigns = leadsData?.filter(lead => 
        lead.campaign_name && lead.campaign_name.trim() !== ''
      ).length || 0;

      console.log(`✅ Lead analytics from ${tableName}:`, { total, active, inCampaigns });

      return {
        totalLeads: total,
        activeLeads: active,
        campaignLeads: inCampaigns
      };
    } catch (error) {
      console.error(`Failed to fetch lead analytics from ${tableName}:`, error);
      return { totalLeads: 0, activeLeads: 0, campaignLeads: 0 };
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

          // Fetch lead analytics from Apollo table for email mode
          const leadAnalytics = await fetchLeadAnalytics('Apollo');

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

          // Still try to fetch lead analytics from Apollo table even if API fails
          const leadAnalytics = await fetchLeadAnalytics('Apollo');

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

          // Fetch lead analytics from LinkedIn table for LinkedIn mode
          const leadAnalytics = await fetchLeadAnalytics('LinkedIn');

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

          // Still try to fetch lead analytics from LinkedIn table even if API fails
          const leadAnalytics = await fetchLeadAnalytics('LinkedIn');

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
    
    // Initial fetch
    fetchRealTimeData(false);

    // Set up auto-refresh every 30 seconds (background refresh)
    const interval = setInterval(() => fetchRealTimeData(true), 30000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode]);

  const forceRefresh = () => {
    fetchRealTimeData(false); // Manual refresh shows loading
  };

  return {
    ...metrics,
    forceRefresh
  };
};