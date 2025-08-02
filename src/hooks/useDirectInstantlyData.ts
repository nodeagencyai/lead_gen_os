// DIRECT INSTANTLY DATA HOOK - BYPASSES ALL COMPLEX SERVICE LOGIC
import { useState, useEffect } from 'react';

interface DirectCampaignData {
  id: string;
  name: string;
  status: string;
  statusColor: string;
  totalContacted: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  leadsReady: number;
  emailsSent: number;
  replies: number;
  meetings: number;
  preparation: number;
  template: string;
  platform: string;
}

export const useDirectInstantlyData = () => {
  const [campaigns, setCampaigns] = useState<DirectCampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDirectData = async () => {
    const apiKey = import.meta.env.VITE_INSTANTLY_API_KEY;
    
    if (!apiKey) {
      setError('No API key found');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 DIRECT HOOK: Fetching campaigns directly...');
      
      // 1. Get campaigns
      const campaignsResponse = await fetch('https://api.instantly.ai/api/v2/campaigns', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!campaignsResponse.ok) {
        throw new Error(`Campaigns API failed: ${campaignsResponse.status}`);
      }
      
      const campaignsData = await campaignsResponse.json();
      const rawCampaigns = campaignsData.items || [];
      
      console.log('✅ DIRECT HOOK: Got campaigns:', rawCampaigns.length);
      
      // 2. Enrich each campaign with analytics
      const enrichedCampaigns = await Promise.all(
        rawCampaigns.map(async (campaign: any) => {
          console.log(`🔄 DIRECT HOOK: Processing ${campaign.name} (${campaign.id})`);
          
          try {
            const analyticsResponse = await fetch(
              `https://api.instantly.ai/api/v2/campaigns/analytics?id=${campaign.id}`,
              {
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            let analytics = null;
            if (analyticsResponse.ok) {
              const analyticsData = await analyticsResponse.json();
              analytics = Array.isArray(analyticsData) && analyticsData.length > 0 
                ? analyticsData[0] 
                : null;
            }
            
            console.log(`📊 DIRECT HOOK: ${campaign.name} analytics:`, analytics);
            
            // Map status
            const statusMap: { [key: number]: string } = {
              0: 'Draft',
              1: 'Running', 
              2: 'Paused',
              3: 'Completed',
              4: 'Stopped'
            };
            
            const statusColorMap: { [key: string]: string } = {
              'Draft': '#3b82f6',
              'Running': '#10b981',
              'Paused': '#f59e0b', 
              'Completed': '#6b7280',
              'Stopped': '#ef4444'
            };
            
            const status = statusMap[campaign.status] || 'Draft';
            const statusColor = statusColorMap[status];
            
            // Calculate metrics
            const totalLeads = analytics?.leads_count || 0;
            const contacted = analytics?.contacted_count || 0;
            const emailsSent = analytics?.emails_sent_count || 0;
            const opens = analytics?.open_count || 0;
            const replies = analytics?.reply_count || 0;
            const clicks = analytics?.link_click_count || 0;
            const bounced = analytics?.bounced_count || 0;
            const unsubscribed = analytics?.unsubscribed_count || 0;
            
            const openRate = emailsSent > 0 ? Math.round((opens / emailsSent) * 100) : 0;
            const replyRate = emailsSent > 0 ? Math.round((replies / emailsSent) * 100) : 0;
            const clickRate = emailsSent > 0 ? Math.round((clicks / emailsSent) * 100) : 0;
            const leadsReady = Math.max(0, totalLeads - contacted - bounced - unsubscribed);
            
            const enriched: DirectCampaignData = {
              id: campaign.id,
              name: campaign.name,
              status,
              statusColor,
              totalContacted: contacted,
              openRate,
              clickRate, 
              replyRate,
              leadsReady,
              emailsSent,
              replies,
              meetings: analytics?.total_opportunities || 0,
              preparation: campaign.status === 1 ? 100 : 75,
              template: 'General Outreach',
              platform: 'Instantly'
            };
            
            console.log(`✅ DIRECT HOOK: ${campaign.name} final data:`, {
              status: enriched.status,
              totalContacted: enriched.totalContacted,
              emailsSent: enriched.emailsSent,
              openRate: enriched.openRate,
              leadsReady: enriched.leadsReady
            });
            
            return enriched;
            
          } catch (error) {
            console.error(`❌ DIRECT HOOK: Error processing ${campaign.name}:`, error);
            
            // Return basic campaign without analytics
            return {
              id: campaign.id,
              name: campaign.name, 
              status: 'Draft',
              statusColor: '#3b82f6',
              totalContacted: 0,
              openRate: 0,
              clickRate: 0,
              replyRate: 0,
              leadsReady: 0,
              emailsSent: 0,
              replies: 0,
              meetings: 0,
              preparation: 50,
              template: 'General Outreach',
              platform: 'Instantly'
            };
          }
        })
      );
      
      console.log('🎯 DIRECT HOOK: Final campaigns data:', enrichedCampaigns);
      setCampaigns(enrichedCampaigns);
      
    } catch (error) {
      console.error('❌ DIRECT HOOK: Failed to fetch data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectData();
  }, []);

  return {
    campaigns,
    loading,
    error,
    refetch: fetchDirectData
  };
};