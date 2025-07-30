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
          // Use exact Instantly status instead of mapping
          const exactStatus = getExactInstantlyStatus(camp);
          const statusColor = getInstantlyStatusColor(exactStatus);
          
          // Debug log to verify status processing
          console.log(`Campaign "${camp.name}": Raw status = ${camp.status}, Mapped status = ${exactStatus}`);
          
          return {
            id: camp.id,
            name: camp.name,
            status: exactStatus,
            statusColor: statusColor,
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

// Helper functions for Instantly's exact status system
const getExactInstantlyStatus = (campaign: any): 'Draft' | 'Running' | 'Paused' | 'Stopped' | 'Completed' => {
  // Check multiple possible status fields from Instantly API
  const status = campaign.status || campaign.campaign_status || campaign.state || campaign.current_status;
  
  // Handle numeric status codes that map to Instantly's string statuses
  if (typeof status === 'number') {
    switch(status) {
      case 0: return 'Draft';
      case 1: return 'Running';
      case 2: return 'Paused';
      case 3: return 'Stopped';
      case 4: return 'Completed';
      default: return 'Draft';
    }
  }
  
  // Handle string status values (normalize to exact Instantly statuses)
  if (typeof status === 'string') {
    const statusLower = status.toLowerCase();
    if (statusLower.includes('draft')) return 'Draft';
    if (statusLower.includes('running') || statusLower.includes('active')) return 'Running';
    if (statusLower.includes('paused')) return 'Paused';
    if (statusLower.includes('stopped') || statusLower.includes('inactive')) return 'Stopped';
    if (statusLower.includes('completed') || statusLower.includes('finished')) return 'Completed';
  }
  
  // Default fallback
  return 'Draft';
};

const getInstantlyStatusColor = (status: 'Draft' | 'Running' | 'Paused' | 'Stopped' | 'Completed'): string => {
  // Color coding to match Instantly's system
  switch(status) {
    case 'Draft': return '#3b82f6';      // 🔵 Blue
    case 'Running': return '#10b981';    // 🟢 Green  
    case 'Paused': return '#f59e0b';     // 🟡 Yellow
    case 'Stopped': return '#ef4444';   // 🔴 Red
    case 'Completed': return '#6b7280'; // ⚪ Gray
    default: return '#3b82f6';          // Default blue
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