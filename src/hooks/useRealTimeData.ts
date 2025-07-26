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

  const fetchRealTimeData = async () => {
    try {
      setMetrics(prev => ({ ...prev, loading: true, error: null }));

      if (mode === 'email') {
        // Fetch Instantly + Apollo data
        const [instantlyData, apolloData] = await Promise.all([
          IntegrationService.getInstantlyData().catch(() => null),
          IntegrationService.getApolloData().catch(() => null)
        ]);

        const emailMetrics = {
          sent: (instantlyData?.analytics?.emails_sent || 0) + (apolloData?.analytics?.total_contacts || 0),
          opened: instantlyData?.analytics?.emails_opened || 0,
          replied: instantlyData?.analytics?.emails_replied || 0,
          meetings: instantlyData?.analytics?.meetings_booked || 0,
          bounceRate: instantlyData?.analytics?.bounce_rate || 0
        };

        const campaigns = [
          ...(instantlyData?.campaigns || []),
          ...(apolloData?.campaigns || [])
        ];

        const leads = [
          ...(instantlyData?.leads || []),
          ...(apolloData?.leads || [])
        ];

        setMetrics(prev => ({
          ...prev,
          emailMetrics,
          campaigns,
          leads,
          loading: false
        }));

      } else {
        // Fetch HeyReach data
        const heyReachData = await IntegrationService.getHeyReachData().catch(() => null);

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
          loading: false
        }));
      }

    } catch (error) {
      console.error('Real-time data fetch error:', error);
      setMetrics(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch real-time data'
      }));
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchRealTimeData();

    // Set up auto-refresh every 30 seconds
    const interval = setInterval(fetchRealTimeData, 30000);
    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mode]);

  const forceRefresh = () => {
    fetchRealTimeData();
  };

  return {
    ...metrics,
    forceRefresh
  };
};