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
  // LinkedIn-specific fields (optional)
  connectionsSent?: number;
  connectionsAccepted?: number;
  connectionRate?: number;
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
          const mapCampaignStatus = (status: number): string => {
            const statusMap: Record<number, string> = {
              0: 'Draft',
              1: 'Running',
              2: 'Paused',
              3: 'Stopped',
              4: 'Completed'
            };
            return statusMap[status] || 'Draft';
          };

          const mappedCampaigns = instantlyData.campaigns?.map((camp: any) => {
            const status = mapCampaignStatus(camp.status);
            return {
            id: camp.id,
            name: camp.name,
            status,
            statusColor: getStatusColor(status as any),
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
          };
          }) || [];
          setCampaigns(mappedCampaigns);
        }
        
      } else {
        // LinkedIn campaigns (HeyReach integration)
        console.log('🔄 Fetching real LinkedIn campaigns from HeyReach...');
        
        try {
          // Use dedicated HeyReach service for better data handling
          const { HeyReachCampaignService } = await import('../services/heyreachCampaignService');
          
          console.log('🔄 STEP 1: Calling HeyReachCampaignService.fetchAllCampaigns()...');
          const realCampaigns = await HeyReachCampaignService.fetchAllCampaigns();
          
          console.log('🔍 STEP 2: HeyReach service returned:', { 
            campaigns: realCampaigns, 
            length: realCampaigns?.length, 
            hasData: !!(realCampaigns && realCampaigns.length > 0) 
          });
          
          // Transform to match CampaignData interface
          const transformedCampaigns = realCampaigns.map(campaign => ({
            id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            statusColor: campaign.statusColor,
            preparation: campaign.preparation,
            leadsReady: campaign.leadsReady,
            emailsSent: 0, // Not applicable for LinkedIn
            replies: campaign.replies,
            meetings: campaign.meetings,
            template: campaign.template,
            platform: campaign.platform,
            // LinkedIn-specific fields
            totalContacted: campaign.totalContacted,
            openRate: 0, // Not applicable for LinkedIn
            clickRate: 0, // Not applicable for LinkedIn
            replyRate: campaign.replyRate,
            connectionsSent: campaign.connectionsSent,
            connectionsAccepted: campaign.connectionsAccepted,
            connectionRate: campaign.connectionRate
          }));
          
          console.log('✅ STEP 3: Using LinkedIn campaigns from HeyReach:');
          transformedCampaigns.forEach(c => {
            console.log(`  Campaign: ${c.name}`, {
              id: c.id,
              status: c.status,
              totalContacted: c.totalContacted,
              connectionsSent: c.connectionsSent,
              connectionsAccepted: c.connectionsAccepted,
              connectionRate: c.connectionRate,
              replyRate: c.replyRate
            });
          });
          
          setCampaigns(transformedCampaigns);
          
        } catch (error) {
          console.error('❌ STEP 3: CRITICAL - HeyReach service FAILED, using fallback!', error);
          
          // Fallback to basic integration service
          try {
            const heyreachData = await IntegrationService.getHeyReachData();
            const fallbackCampaigns = heyreachData.campaigns?.map((camp: any) => ({
              id: camp.id,
              name: camp.name,
              status: camp.status || 'Draft',
              statusColor: camp.statusColor || getStatusColor('Draft'),
              preparation: 50,
              leadsReady: 0,
              emailsSent: 0,
              replies: camp.replies || 0,
              meetings: 0,
              template: 'LinkedIn Outreach',
              platform: 'HeyReach',
              totalContacted: camp.sent || 0,
              openRate: 0,
              clickRate: 0,
              replyRate: camp.rate ? parseInt(camp.rate) : 0,
              connectionsSent: camp.sent || 0,
              connectionsAccepted: 0,
              connectionRate: 0
            })) || [];
            
            setCampaigns(fallbackCampaigns);
          } catch (fallbackError) {
            console.warn('HeyReach API not available, using empty campaigns');
            setCampaigns([]);
          }
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