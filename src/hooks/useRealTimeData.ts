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

  // Fetch lead analytics from the appropriate Supabase table
  const fetchLeadAnalytics = async () => {
    const tableName = mode === 'email' ? 'Apollo' : 'LinkedIn';
    
    try {
      console.log(`📊 Fetching lead analytics from ${tableName} table...`);
      
      // Get total count
      const { count: totalLeads, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error(`Error fetching count from ${tableName}:`, countError);
        throw countError;
      }

      const total = totalLeads || 0;

      if (total === 0) {
        return {
          totalLeads: 0,
          profileCoverage: { percentage: 0, completed: 0, total: 0 },
          personalizationRate: { percentage: 0, personalized: 0, total: 0 }
        };
      }

      // Fetch data for calculations based on table structure
      let selectFields = '';
      if (tableName === 'Apollo') {
        selectFields = 'id, full_name, email, company, title, linkedin_url, icebreaker, personalization_hooks';
      } else {
        selectFields = 'id, name, email, company, position, linkedin_url, icebreaker';
      }

      const { data: leads, error: leadsError } = await supabase
        .from(tableName)
        .select(selectFields);

      if (leadsError) {
        console.error(`Error fetching leads from ${tableName}:`, leadsError);
        throw leadsError;
      }

      const leadsData = leads || [];

      // Calculate profile coverage (leads with complete profiles)
      const completeProfiles = leadsData.filter(lead => {
        if (tableName === 'Apollo') {
          return lead.full_name && lead.email && lead.company && lead.title;
        } else {
          return lead.name && lead.email && lead.company && lead.position;
        }
      }).length;

      const profileCoveragePercentage = Math.round((completeProfiles / total) * 100);

      // Calculate personalization rate (leads with icebreakers)
      const personalizedLeads = leadsData.filter(lead => {
        if (tableName === 'Apollo') {
          return lead.icebreaker || lead.personalization_hooks;
        } else {
          return lead.icebreaker;
        }
      }).length;

      const personalizationPercentage = Math.round((personalizedLeads / total) * 100);

      console.log(`✅ Lead analytics from ${tableName}:`, {
        totalLeads: total,
        profileCoverage: { percentage: profileCoveragePercentage, completed: completeProfiles, total },
        personalizationRate: { percentage: personalizationPercentage, personalized: personalizedLeads, total }
      });

      return {
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

    } catch (error) {
      console.error(`Failed to fetch lead analytics from ${tableName}:`, error);
      return {
        totalLeads: 0,
        profileCoverage: { percentage: 0, completed: 0, total: 0 },
        personalizationRate: { percentage: 0, personalized: 0, total: 0 }
      };
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