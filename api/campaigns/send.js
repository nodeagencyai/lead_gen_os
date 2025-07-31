import { createClient } from '@supabase/supabase-js';

// Check for required environment variables  
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(
  supabaseUrl || 'https://efpwtvlgnftlabmliguf.supabase.co',
  supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcHd0dmxnbmZ0bGFibWxpZ3VmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc4NjI2NywiZXhwIjoyMDY5MzYyMjY3fQ.jd7hbkp38CxkW05eSDcyJMwkidkE4REqxzqb7Fa1U9c'
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { leadIds, leadSource, campaignId, campaignName, platform } = req.body;

  if (!leadIds || !leadSource || !campaignId || !platform) {
    return res.status(400).json({ 
      error: 'Missing required fields: leadIds, leadSource, campaignId, platform' 
    });
  }

  try {
    // Fetch leads data
    const { data: leads, error: fetchError } = await supabase
      .from(leadSource)
      .select('*')
      .in('id', leadIds);

    if (fetchError) {
      console.error('Error fetching leads:', fetchError);
      throw fetchError;
    }

    if (!leads || leads.length === 0) {
      return res.status(404).json({ error: 'No leads found with provided IDs' });
    }

    // Send to external platform
    let sendResult;
    try {
      if (platform === 'instantly') {
        sendResult = await sendToInstantly(leads, campaignId);
      } else if (platform === 'heyreach') {
        sendResult = await sendToHeyReach(leads, campaignId);
      } else {
        throw new Error(`Unsupported platform: ${platform}`);
      }
    } catch (platformError) {
      console.error(`Error sending to ${platform}:`, platformError);
      // Continue to log in database even if external API fails
      sendResult = { 
        error: platformError.message,
        attempted: true,
        timestamp: new Date().toISOString()
      };
    }

    // Record campaign sends in database
    const campaignSends = leadIds.map(leadId => ({
      lead_id: leadId,
      lead_source: leadSource,
      campaign_id: campaignId,
      campaign_name: campaignName || `Campaign ${campaignId}`,
      platform: platform,
      sent_at: new Date().toISOString(),
      status: sendResult.error ? 'failed' : 'sent',
      response: sendResult,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    try {
      const { error: insertError } = await supabase
        .from('campaign_sends')
        .insert(campaignSends);

      if (insertError) {
        console.error('Error recording campaign sends:', insertError);
        // Don't fail the request if we can't log to database
      }
    } catch (dbError) {
      console.warn('Campaign sends table may not exist yet:', dbError);
      // Continue without logging if table doesn't exist
    }

    return res.status(200).json({
      success: true,
      count: leadIds.length,
      campaign: campaignName || campaignId,
      platform: platform,
      sendResult: sendResult
    });
  } catch (error) {
    console.error('Error sending to campaign:', error);
    return res.status(500).json({ 
      error: 'Failed to send leads to campaign', 
      details: error.message 
    });
  }
}

async function sendToInstantly(leads, campaignId) {
  const instantlyApiKey = process.env.INSTANTLY_API_KEY || process.env.VITE_INSTANTLY_API_KEY;
  
  if (!instantlyApiKey) {
    throw new Error('Instantly API key not configured');
  }

  const instantlyLeads = leads.map(lead => ({
    email: lead.email,
    first_name: lead.first_name || lead.full_name?.split(' ')[0] || '',
    last_name: lead.last_name || lead.full_name?.split(' ').slice(1).join(' ') || '',
    company_name: lead.company || '',
    title: lead.title || '',
    custom_variables: {
      niche: lead.niche || '',
      tags: lead.tags?.join(', ') || '',
      city: lead.city || '',
      linkedin_url: lead.linkedin_url || ''
    }
  }));

  const response = await fetch('https://api.instantly.ai/api/v1/lead/add', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${instantlyApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      campaign_id: campaignId,
      leads: instantlyLeads
    })
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(`Instantly API error: ${result.message || response.statusText}`);
  }

  return result;
}

async function sendToHeyReach(leads, campaignId) {
  const heyreachApiKey = process.env.HEYREACH_API_KEY || process.env.VITE_HEYREACH_API_KEY;
  
  if (!heyreachApiKey) {
    throw new Error('HeyReach API key not configured');
  }

  const heyreachLeads = leads.map(lead => ({
    email: lead.email,
    firstName: lead.first_name || lead.full_name?.split(' ')[0] || '',
    lastName: lead.last_name || lead.full_name?.split(' ').slice(1).join(' ') || '',
    company: lead.company || '',
    position: lead.title || '',
    linkedinUrl: lead.linkedin_url || '',
    customFields: {
      niche: lead.niche || '',
      tags: lead.tags?.join(', ') || '',
      city: lead.city || ''
    }
  }));

  // Note: This is a placeholder implementation
  // You'll need to implement the actual HeyReach API integration
  // based on their API documentation
  
  const response = await fetch(`https://api.heyreach.io/api/public/campaigns/${campaignId}/leads`, {
    method: 'POST',
    headers: {
      'X-API-KEY': heyreachApiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      leads: heyreachLeads
    })
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(`HeyReach API error: ${result.message || response.statusText}`);
  }

  return result;
}