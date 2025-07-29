import { useState, useEffect } from 'react';
import { IntegrationService } from '../services/integrationService';
import { LeadsService } from '../services/leadsService';

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
        // Fetch Instantly campaigns
        const instantlyData = await IntegrationService.getInstantlyData();
        
        // Get lead counts from Supabase
        const apolloLeads = await LeadsService.getApolloLeads();
        
        const mappedCampaigns = instantlyData.campaigns.map((camp: any) => {
          const statusInfo = mapInstantlyStatus(camp.status);
          
          return {
            id: camp.id,
            name: camp.name,
            status: statusInfo.status,
            statusColor: statusInfo.color,
            preparation: calculatePreparation(camp),
            leadsReady: apolloLeads.length, // Total leads available
            emailsSent: 0, // From analytics when available
            replies: 0,    // From analytics when available
            meetings: 0,   // From analytics when available
            template: inferTemplate(camp.name),
            platform: 'Instantly'
          };
        });

        setCampaigns(mappedCampaigns);
        
      } else {
        // LinkedIn campaigns (HeyReach integration)
        // Placeholder implementation
        try {
          const heyReachData = await IntegrationService.getHeyReachData();
          // For now, return empty array until HeyReach API is configured
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

// Helper functions
const mapInstantlyStatus = (status: number) => {
  switch(status) {
    case 0: return { status: 'Ready', color: '#10b981' };
    case 1: return { status: 'In progress', color: '#3b82f6' };
    case 2: return { status: 'Draft', color: '#8b5cf6' };
    case 3: return { status: 'Completed', color: '#6b7280' };
    default: return { status: 'Draft', color: '#8b5cf6' };
  }
};

const calculatePreparation = (campaign: any) => {
  // Calculate based on campaign setup completeness
  const hasSchedule = campaign.campaign_schedule && Object.keys(campaign.campaign_schedule).length > 0;
  const isActive = campaign.status === 1;
  const isCompleted = campaign.status === 3;
  
  if (isCompleted) return 100;
  if (isActive) return 90;
  if (hasSchedule) return 75;
  return 50; // Basic campaign created
};

const inferTemplate = (campaignName: string) => {
  // Infer template from campaign name
  const name = campaignName.toLowerCase();
  if (name.includes('agency') || name.includes('agencies')) return 'Agency Outreach';
  if (name.includes('saas')) return 'SaaS Outreach';
  if (name.includes('startup')) return 'Startup Outreach';
  if (name.includes('digital') || name.includes('marketing')) return 'Digital Marketing Outreach';
  if (name.includes('recruitment')) return 'Recruitment Outreach';
  if (name.includes('creative')) return 'Creative Agency Outreach';
  return 'General Outreach';
};