// Vercel Serverless Function to check if a lead exists in Instantly
export default async function handler(req, res) {
  // Set comprehensive CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔄 CORS preflight request handled for /api/instantly/check-lead');
    return res.status(200).end();
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required',
        synced: false 
      });
    }

    // Use server-side environment variable (with fallback to VITE_ prefixed version)
    const INSTANTLY_API_KEY = process.env.INSTANTLY_API_KEY || process.env.VITE_INSTANTLY_API_KEY;
    
    if (!INSTANTLY_API_KEY) {
      console.error('❌ Instantly API key not found');
      return res.status(200).json({ 
        synced: false,
        error: 'API key not configured',
        platform: 'instantly'
      });
    }

    console.log(`🔄 Checking if lead ${email} exists in Instantly...`);

    // First, get all campaigns
    const campaignsResponse = await fetch('https://api.instantly.ai/api/v2/campaigns', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${INSTANTLY_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!campaignsResponse.ok) {
      console.error('❌ Failed to fetch campaigns:', campaignsResponse.status);
      return res.status(200).json({ 
        synced: false,
        error: 'Failed to fetch campaigns',
        platform: 'instantly'
      });
    }

    const campaignsData = await campaignsResponse.json();
    const campaigns = campaignsData.items || [];

    // Check each campaign for the lead
    for (const campaign of campaigns) {
      try {
        // Check campaign leads
        const leadsResponse = await fetch(`https://api.instantly.ai/api/v2/campaigns/${campaign.id}/leads`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${INSTANTLY_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        if (leadsResponse.ok) {
          const leadsData = await leadsResponse.json();
          const leads = leadsData.items || [];
          
          // Check if email exists in this campaign
          const leadExists = leads.some(lead => 
            lead.email?.toLowerCase() === email.toLowerCase()
          );
          
          if (leadExists) {
            console.log(`✅ Lead ${email} found in campaign ${campaign.name}`);
            return res.status(200).json({ 
              synced: true,
              platform: 'instantly',
              campaign: {
                id: campaign.id,
                name: campaign.name
              }
            });
          }
        }
      } catch (err) {
        console.error(`Error checking campaign ${campaign.id}:`, err);
        // Continue checking other campaigns
      }
    }

    console.log(`❌ Lead ${email} not found in any Instantly campaigns`);
    res.status(200).json({ 
      synced: false,
      platform: 'instantly'
    });

  } catch (error) {
    console.error('❌ Instantly check-lead error:', error);
    res.status(200).json({ 
      synced: false,
      error: 'Failed to check lead status',
      message: error.message,
      platform: 'instantly'
    });
  }
}