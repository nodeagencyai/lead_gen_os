import { createClient } from '@supabase/supabase-js';

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { 
    source = 'linkedin',
    niche, 
    tags, 
    dateStart, 
    dateEnd, 
    campaignStatus,
    page = 1,
    limit = 100 
  } = req.query;

  try {
    // Map source to correct table name
    const tableName = source === 'linkedin' ? 'LinkedIn' : 'Apollo';
    
    let query = supabase
      .from(tableName)
      .select(`
        *
      `)
      .order('created_at', { ascending: false });

    if (niche) {
      query = query.ilike('niche', `%${niche}%`);
    }

    if (tags && tags !== '') {
      const tagArray = tags.split(',').filter(tag => tag.trim());
      if (tagArray.length > 0) {
        query = query.contains('tags', tagArray);
      }
    }

    if (dateStart) {
      query = query.gte('created_at', dateStart);
    }

    if (dateEnd) {
      query = query.lte('created_at', dateEnd);
    }

    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching leads:', error);
      throw error;
    }

    // Get campaign history for each lead
    let leadsWithCampaigns = data || [];
    
    if (leadsWithCampaigns.length > 0) {
      const leadIds = leadsWithCampaigns.map(lead => lead.id);
      
      try {
        const { data: campaignData } = await supabase
          .from('campaign_sends')
          .select('*')
          .in('lead_id', leadIds)
          .eq('lead_source', tableName)
          .order('sent_at', { ascending: false });

        // Group campaign history by lead_id
        const campaignsByLead = {};
        if (campaignData) {
          campaignData.forEach(campaign => {
            if (!campaignsByLead[campaign.lead_id]) {
              campaignsByLead[campaign.lead_id] = [];
            }
            campaignsByLead[campaign.lead_id].push(campaign);
          });
        }

        // Add campaign history to leads
        leadsWithCampaigns = leadsWithCampaigns.map(lead => ({
          ...lead,
          campaign_history: campaignsByLead[lead.id] || []
        }));
      } catch (campaignError) {
        console.warn('Error fetching campaign history, continuing without it:', campaignError);
        // Continue without campaign history if the table doesn't exist yet
        leadsWithCampaigns = leadsWithCampaigns.map(lead => ({
          ...lead,
          campaign_history: []
        }));
      }
    }

    // Filter by campaign status if specified
    let filteredData = leadsWithCampaigns;
    if (campaignStatus === 'sent') {
      filteredData = leadsWithCampaigns.filter(lead => 
        lead.campaign_history && lead.campaign_history.length > 0
      );
    } else if (campaignStatus === 'not-sent') {
      filteredData = leadsWithCampaigns.filter(lead => 
        !lead.campaign_history || lead.campaign_history.length === 0
      );
    }

    return res.status(200).json({
      leads: filteredData,
      total: count,
      page: Number(page),
      totalPages: Math.ceil((count || 0) / Number(limit))
    });
  } catch (error) {
    console.error('Error filtering leads:', error);
    return res.status(500).json({ 
      error: 'Failed to filter leads', 
      details: error.message,
      leads: [],
      total: 0
    });
  }
}