import { useState, useEffect } from 'react';
import { IntegrationService } from '../services/integrationService';
import { useCampaignStore } from '../store/campaignStore';

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
    campaigns: [],
    leads: [],
    loading: true,
    error: null
  });

  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

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

          setMetrics(prev => ({
            ...prev,
            emailMetrics,
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

          setMetrics(prev => ({
            ...prev,
            emailMetrics,
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

          setMetrics(prev => ({
            ...prev,
            linkedinMetrics,
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

          setMetrics(prev => ({
            ...prev,
            linkedinMetrics,
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