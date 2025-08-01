import { useState, useEffect } from 'react';
import { IntegrationService } from '../services/integrationService';
import { InstantlyCampaignService } from '../services/instantlyCampaignService';

interface CampaignData {
  id: string;
  name: string;
  status: string;
  statusColor: string;
  preparation: number;
  leadsReady: number;
  emailsSent: number;
  replies: number;
  meetings: number;
  template: string;
  platform: string;
  // New analytics fields
  totalContacted: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
}

export const useCampaignData = (mode: 'email' | 'linkedin') => {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaignData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (mode === 'email') {
        // Fetch specific Instantly campaigns with real data
        console.log('🔄 Fetching real data from 3 specific Instantly campaigns...');
        
        try {
          const realCampaigns = await InstantlyCampaignService.fetchAllCampaigns();
          
          if (realCampaigns && realCampaigns.length > 0) {
            console.log(`✅ Loaded ${realCampaigns.length} campaigns with real Instantly data:`, 
              realCampaigns.map(c => ({ name: c.name, status: c.status, leads: c.leadsReady, emails: c.emailsSent }))
            );
            setCampaigns(realCampaigns);
          } else {
            console.warn('⚠️ No campaigns returned, falling back to old method...');
            // Fallback to original method if new service fails
            const instantlyData = await IntegrationService.getInstantlyData();
            const mappedCampaigns = instantlyData.campaigns?.map((camp: any) => ({
              id: camp.id,
              name: camp.name,
              status: camp.status === 1 ? 'Running' : camp.status === 0 ? 'Draft' : 'Paused',
              statusColor: camp.status === 1 ? '#10b981' : camp.status === 0 ? '#3b82f6' : '#f59e0b',
              preparation: 75,
              leadsReady: 0,
              emailsSent: 0,
              replies: 0,
              meetings: 0,
              template: 'General Outreach',
              platform: 'Instantly',
              // New analytics fields with default values
              totalContacted: 0,
              openRate: 0,
              clickRate: 0,
              replyRate: 0
            })) || [];
            setCampaigns(mappedCampaigns);
          }
        } catch (error) {
          console.error('❌ New service failed, using fallback:', error);
          // Final fallback to original method
          const instantlyData = await IntegrationService.getInstantlyData();
          const mappedCampaigns = instantlyData.campaigns?.map((camp: any) => ({
            id: camp.id,
            name: camp.name,
            status: camp.status === 1 ? 'Running' : camp.status === 0 ? 'Draft' : 'Paused',
            statusColor: camp.status === 1 ? '#10b981' : camp.status === 0 ? '#3b82f6' : '#f59e0b',
            preparation: 75,
            leadsReady: 0,
            emailsSent: 0,
            replies: 0,
            meetings: 0,
            template: 'General Outreach',
            platform: 'Instantly',
            // New analytics fields with default values
            totalContacted: 0,
            openRate: 0,
            clickRate: 0,
            replyRate: 0
          })) || [];
          setCampaigns(mappedCampaigns);
        }
        
      } else {
        // LinkedIn campaigns (HeyReach integration)
        // Placeholder implementation - no specific LinkedIn campaigns yet
        try {
          await IntegrationService.getHeyReachData();
          setCampaigns([]);
        } catch (error) {
          console.warn('HeyReach API not available, using empty campaigns');
          setCampaigns([]);
        }
      }
      
    } catch (error) {
      console.error('Failed to fetch campaign data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch campaigns');
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignData();
  }, [mode]);

  return {
    campaigns,
    loading,
    error,
    refetch: fetchCampaignData
  };
};