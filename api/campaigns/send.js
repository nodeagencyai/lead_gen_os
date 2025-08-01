import { createClient } from '@supabase/supabase-js';

// Check for required environment variables with multiple fallbacks
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

console.log('Environment variables check:', {
  supabase_url_exists: !!supabaseUrl,
  supabase_url_source: supabaseUrl ? 'found' : 'missing',
  supabase_key_exists: !!supabaseKey,
  available_env_vars: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
});

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required Supabase environment variables:', {
    url_missing: !supabaseUrl,
    key_missing: !supabaseKey,
    available_vars: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
  });
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  console.log('=== CAMPAIGN SEND REQUEST START ===');
  console.log('Method:', req.method);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', JSON.stringify(req.body, null, 2));

  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    console.log('Invalid method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { leadIds, leadSource, campaignId, campaignName, platform } = req.body;

  console.log('Extracted fields:', { leadIds, leadSource, campaignId, campaignName, platform });

  if (!leadIds || !leadSource || !campaignId || !platform) {
    console.log('Missing required fields validation failed');
    return res.status(400).json({ 
      error: 'Missing required fields: leadIds, leadSource, campaignId, platform',
      received: { leadIds: !!leadIds, leadSource: !!leadSource, campaignId: !!campaignId, platform: !!platform }
    });
  }

  try {
    // Map lead source to correct table name
    const tableName = leadSource === 'linkedin' ? 'LinkedIn' : 'Apollo';
    console.log('Using table name:', tableName);
    
    // Fetch leads data - convert string IDs to integers (all IDs are now integers)
    console.log('Fetching leads from Supabase...');
    
    // Convert string IDs to integers (simple and reliable now)
    const numericLeadIds = leadIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
    console.log('Converting lead IDs:', { original: leadIds, converted: numericLeadIds });
    
    // Validation: ensure all IDs converted successfully
    if (numericLeadIds.length !== leadIds.length) {
      console.error('❌ Invalid lead IDs detected:', {
        original: leadIds,
        converted: numericLeadIds,
        failed: leadIds.filter(id => isNaN(parseInt(id, 10)))
      });
      return res.status(400).json({
        error: 'Invalid lead IDs provided',
        details: 'All lead IDs must be valid integers',
        invalidIds: leadIds.filter(id => isNaN(parseInt(id, 10)))
      });
    }
    
    const { data: leads, error: fetchError } = await supabase
      .from(tableName)
      .select('*')
      .in('id', numericLeadIds);

    console.log('Supabase query result:', { 
      leadsCount: leads?.length, 
      error: fetchError,
      requestedIds: numericLeadIds,
      foundLeads: leads?.map(l => ({ id: l.id, name: l.full_name }))
    });

    if (fetchError) {
      console.error('Error fetching leads:', {
        error: fetchError,
        message: fetchError.message,
        code: fetchError.code,
        details: fetchError.details,
        hint: fetchError.hint,
        table: tableName,
        leadIds: leadIds
      });
      
      return res.status(500).json({ 
        error: 'Database error', 
        message: fetchError.message,
        code: fetchError.code,
        details: fetchError.details,
        hint: fetchError.hint,
        table: tableName,
        leadIds,
        supabase_url_exists: !!supabaseUrl,
        supabase_key_exists: !!supabaseKey
      });
    }

    if (!leads || leads.length === 0) {
      console.log('No leads found with provided IDs');
      return res.status(404).json({ 
        error: 'No leads found with provided IDs',
        table: tableName,
        leadIds 
      });
    }

    console.log('Found leads:', leads.map(l => ({ id: l.id, email: l.email, name: l.full_name })));

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
    const campaignSends = numericLeadIds.map(leadId => ({
      lead_id: leadId,
      lead_source: tableName,
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
      count: numericLeadIds.length,
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
  const instantlyApiKey = process.env.VITE_INSTANTLY_API_KEY || process.env.INSTANTLY_API_KEY;
  
  if (!instantlyApiKey) {
    throw new Error('Instantly API key not configured');
  }

  console.log(`Sending ${leads.length} leads to Instantly campaign ${campaignId}`);
  console.log('Lead data before formatting:', leads[0]); // Log first lead for debugging

  // Format leads for Instantly API v2 - correct field names
  const instantlyLeads = leads.map(lead => ({
    email: lead.email,
    first_name: lead.first_name || lead.full_name?.split(' ')[0] || '',
    last_name: lead.last_name || lead.full_name?.split(' ').slice(1).join(' ') || '',
    company_name: lead.company || '',
    job_title: lead.title || '',
    website: lead.website || '',
    location: lead.city || lead.location || '',
    phone: lead.phone || '',
    custom_variables: {
      niche: lead.niche || '',
      tags: Array.isArray(lead.tags) ? lead.tags.join(', ') : (lead.tags || ''),
      linkedin_url: lead.linkedin_url || '',
      industry: lead.industry || ''
    }
  }));

  // Use proper batch processing with concurrency control
  const maxConcurrent = 3; // Conservative limit to avoid rate limiting
  const results = [];
  
  console.log(`Processing ${instantlyLeads.length} leads with max ${maxConcurrent} concurrent requests`);
  
  // Simple semaphore for concurrency control
  class Semaphore {
    constructor(max) {
      this.max = max;
      this.current = 0;
      this.queue = [];
    }

    async acquire() {
      if (this.current < this.max) {
        this.current++;
        return;
      }
      return new Promise(resolve => this.queue.push(resolve));
    }

    release() {
      this.current--;
      if (this.queue.length > 0) {
        const resolve = this.queue.shift();
        this.current++;
        resolve();
      }
    }
  }

  const semaphore = new Semaphore(maxConcurrent);
  
  // Upload single lead with retry logic
  const uploadSingleLead = async (lead, retryAttempts = 2) => {
    await semaphore.acquire();
    
    try {
      const payload = {
        campaign: campaignId,
        email: lead.email,
        first_name: lead.first_name,
        last_name: lead.last_name,
        company_name: lead.company_name,
        website: lead.website,
        phone: lead.phone,
        custom_variables: lead.custom_variables
      };

      console.log(`Uploading lead: ${lead.email}`);

      for (let attempt = 1; attempt <= retryAttempts; attempt++) {
        try {
          const response = await fetch(`https://api.instantly.ai/api/v2/leads`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${instantlyApiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });

          const result = await response.json();
          
          if (!response.ok) {
            // Handle specific errors
            if (response.status === 429) {
              console.log(`Rate limited for ${lead.email}, waiting...`);
              await new Promise(resolve => setTimeout(resolve, 2000));
              continue; // Retry
            }
            
            throw new Error(`API Error ${response.status}: ${JSON.stringify(result)}`);
          }

          console.log(`✅ Successfully uploaded: ${lead.email}`);
          return { email: lead.email, success: true, id: result.id, result };

        } catch (error) {
          if (attempt === retryAttempts) {
            console.error(`❌ Failed to upload ${lead.email} after ${retryAttempts} attempts:`, error.message);
            return { email: lead.email, success: false, error: error.message };
          }
          
          // Exponential backoff
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`Retry ${attempt} for ${lead.email} in ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    } finally {
      semaphore.release();
    }
  };

  // Process all leads concurrently with semaphore control
  const uploadPromises = instantlyLeads.map(lead => uploadSingleLead(lead));
  const uploadResults = await Promise.all(uploadPromises);
  
  // Analyze results
  const successful = uploadResults.filter(r => r.success);
  const failed = uploadResults.filter(r => !r.success);
  
  console.log(`\n=== Upload Summary ===`);
  console.log(`Total leads: ${instantlyLeads.length}`);
  console.log(`Successful: ${successful.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Success rate: ${((successful.length / instantlyLeads.length) * 100).toFixed(1)}%`);
  
  if (failed.length > 0) {
    console.log(`\nFailed leads:`);
    failed.forEach(f => console.log(`- ${f.email}: ${f.error}`));
  }
  
  // Return results in expected format
  if (failed.length > 0 && successful.length === 0) {
    throw new Error(`All ${failed.length} leads failed to upload`);
  }
  
  return {
    successful: successful.length,
    failed: failed.length,
    results: uploadResults,
    details: {
      successful_emails: successful.map(s => s.email),
      failed_emails: failed.map(f => ({ email: f.email, error: f.error }))
    }
  };
}

async function sendToHeyReach(leads, campaignId) {
  const heyreachApiKey = process.env.VITE_HEYREACH_API_KEY || process.env.HEYREACH_API_KEY;
  
  if (!heyreachApiKey) {
    throw new Error('HeyReach API key not configured');
  }

  console.log(`Sending ${leads.length} leads to HeyReach campaign ${campaignId}`);

  // Format leads for HeyReach API
  const heyreachLeads = leads.map(lead => ({
    email: lead.email || '',
    firstName: lead.first_name || lead.full_name?.split(' ')[0] || '',
    lastName: lead.last_name || lead.full_name?.split(' ').slice(1).join(' ') || '',
    companyName: lead.company || '',
    jobTitle: lead.title || '',
    linkedInUrl: lead.linkedin_url || '',
    phoneNumber: lead.phone || '',
    location: lead.city || lead.location || '',
    custom: {
      niche: lead.niche || '',
      tags: Array.isArray(lead.tags) ? lead.tags.join(', ') : '',
      industry: lead.industry || '',
      website: lead.website || ''
    }
  }));

  // Use HeyReach prospect import endpoint
  const response = await fetch('https://api.heyreach.io/api/public/prospect/Import', {
    method: 'POST',
    headers: {
      'X-API-KEY': heyreachApiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      campaignId: campaignId,
      prospects: heyreachLeads,
      skipDuplicates: true // Avoid duplicates
    })
  });

  const result = await response.json();
  
  console.log('HeyReach API response:', response.status, result);
  
  if (!response.ok) {
    console.error('HeyReach API error:', result);
    throw new Error(`HeyReach API error: ${result.error || result.message || response.statusText}`);
  }

  return result;
}