// Vercel Serverless Function to check if a lead exists in HeyReach
export default async function handler(req, res) {
  // Set comprehensive CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔄 CORS preflight request handled for /api/heyreach/check-lead');
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

    // Use server-side environment variable (NO VITE_ prefix)
    const HEYREACH_API_KEY = process.env.HEYREACH_API_KEY;
    
    if (!HEYREACH_API_KEY) {
      console.error('❌ HeyReach API key not found');
      return res.status(200).json({ 
        synced: false,
        error: 'API key not configured',
        platform: 'heyreach'
      });
    }

    console.log(`🔄 Checking if lead ${email} exists in HeyReach...`);

    // First, get all campaigns
    const campaignsResponse = await fetch('https://api.heyreach.io/api/public/campaign/GetAll', {
      method: 'POST',
      headers: {
        'X-API-KEY': HEYREACH_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (!campaignsResponse.ok) {
      console.error('❌ Failed to fetch campaigns:', campaignsResponse.status);
      return res.status(200).json({ 
        synced: false,
        error: 'Failed to fetch campaigns',
        platform: 'heyreach'
      });
    }

    const campaignsData = await campaignsResponse.json();
    const campaigns = campaignsData.items || [];

    // Check each campaign for the lead
    for (const campaign of campaigns) {
      try {
        // Get campaign leads/prospects
        const prospectsResponse = await fetch('https://api.heyreach.io/api/public/prospect/GetByCampaign', {
          method: 'POST',
          headers: {
            'X-API-KEY': HEYREACH_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            campaignId: campaign.id,
            page: 1,
            pageSize: 1000 // Check first 1000 leads
          })
        });

        if (prospectsResponse.ok) {
          const prospectsData = await prospectsResponse.json();
          const prospects = prospectsData.items || [];
          
          // Check if email exists in this campaign
          const leadExists = prospects.some(prospect => 
            prospect.email?.toLowerCase() === email.toLowerCase() ||
            prospect.linkedInEmail?.toLowerCase() === email.toLowerCase()
          );
          
          if (leadExists) {
            console.log(`✅ Lead ${email} found in campaign ${campaign.name}`);
            return res.status(200).json({ 
              synced: true,
              platform: 'heyreach',
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

    console.log(`❌ Lead ${email} not found in any HeyReach campaigns`);
    res.status(200).json({ 
      synced: false,
      platform: 'heyreach'
    });

  } catch (error) {
    console.error('❌ HeyReach check-lead error:', error);
    res.status(200).json({ 
      synced: false,
      error: 'Failed to check lead status',
      message: error.message,
      platform: 'heyreach'
    });
  }
}