// Vercel Serverless Function to check if a lead exists in HeyReach
const { heyreachRateLimiter } = require('../utils/heyreachRateLimiter');

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

    // Check rate limit before making requests
    try {
      await heyreachRateLimiter.checkLimit();
    } catch (rateLimitError) {
      console.warn('⚠️ Rate limit exceeded:', rateLimitError.message);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: rateLimitError.message,
        retryAfter: Math.ceil(rateLimitError.waitTime / 1000),
        synced: false,
        platform: 'heyreach'
      });
    }

    console.log(`🔄 Checking if lead ${email} exists in HeyReach...`);

    // First, get all campaigns using correct HeyReach API pattern
    const campaignsResponse = await fetch('https://api.heyreach.io/api/public/campaign/GetAll', {
      method: 'POST',
      headers: {
        'X-API-KEY': HEYREACH_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        offset: "0",
        limit: "100"
      })
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
        // Check rate limit before each additional request
        await heyreachRateLimiter.checkLimit();
        
        // Get campaign conversations using correct HeyReach API pattern
        const prospectsResponse = await fetch('https://api.heyreach.io/api/public/conversation/GetAll', {
          method: 'POST',
          headers: {
            'X-API-KEY': HEYREACH_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            offset: "0",
            limit: "1000",
            campaign_id: campaign.id
          })
        });

        if (prospectsResponse.ok) {
          const prospectsData = await prospectsResponse.json();
          const conversations = prospectsData.items || prospectsData.conversations || [];
          
          // Check if email exists in this campaign's conversations
          const leadExists = conversations.some(conversation => 
            conversation.lead_email?.toLowerCase() === email.toLowerCase() ||
            conversation.email?.toLowerCase() === email.toLowerCase() ||
            conversation.prospect_email?.toLowerCase() === email.toLowerCase()
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
        // If rate limit error, don't continue
        if (err.message && err.message.includes('Rate limit')) {
          return res.status(429).json({
            error: 'Rate limit exceeded during lead check',
            synced: false,
            platform: 'heyreach'
          });
        }
        // Continue checking other campaigns for other errors
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