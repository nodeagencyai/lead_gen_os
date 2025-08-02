import { useState, useEffect } from 'react';
import { IntegrationService } from '../services/integrationService';
import { InstantlyCampaignService } from '../services/instantlyCampaignService';
import { getStatusColor } from '../config/campaignColors';

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
          console.log('🔄 STEP 1: Calling InstantlyCampaignService.fetchAllCampaigns()...');
          const realCampaigns = await InstantlyCampaignService.fetchAllCampaigns();
          
          console.log('🔍 STEP 2: Service returned:', { 
            campaigns: realCampaigns, 
            length: realCampaigns?.length, 
            hasData: !!(realCampaigns && realCampaigns.length > 0) 
          });
          
          // ALWAYS use the real campaigns data - no fallback to zeros
          console.log('✅ STEP 3: Using data from InstantlyCampaignService (forced):');
          const finalCampaigns = realCampaigns || [];
          finalCampaigns.forEach(c => {
            console.log(`  Campaign: ${c.name}`, {
              id: c.id,
              status: c.status,
              totalContacted: c.totalContacted,
              emailsSent: c.emailsSent,
              leadsReady: c.leadsReady,
              openRate: c.openRate,
              replyRate: c.replyRate
            });
          });
          setCampaigns(finalCampaigns);
        } catch (error) {
          console.error('❌ STEP 3: CRITICAL - Main service FAILED, using fallback with ZEROS!', error);
          // Final fallback to original method
          const instantlyData = await IntegrationService.getInstantlyData();
          const mappedCampaigns = instantlyData.campaigns?.map((camp: any) => ({
            id: camp.id,
            name: camp.name,
            status: camp.status === 1 ? 'Running' : camp.status === 0 ? 'Draft' : 'Paused',
            statusColor: getStatusColor(camp.status === 1 ? 'Running' : camp.status === 0 ? 'Draft' : 'Paused'),
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