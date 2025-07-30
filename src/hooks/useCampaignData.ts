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
        const realCampaigns = await InstantlyCampaignService.fetchAllCampaigns();
        
        console.log(`✅ Loaded ${realCampaigns.length} campaigns with real Instantly data:`, 
          realCampaigns.map(c => ({ name: c.name, status: c.status, leads: c.leadsReady, emails: c.emailsSent }))
        );
        
        setCampaigns(realCampaigns);
        
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