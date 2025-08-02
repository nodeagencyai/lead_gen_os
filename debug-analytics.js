// INSTANTLY ANALYTICS DEBUG SCRIPT
// Run this in your browser console or Node.js to debug analytics endpoints

// Create a focused debug function to test analytics endpoints
function createAnalyticsDebugger() {
  return `
// COPY AND PASTE THIS INTO YOUR BROWSER CONSOLE
// Replace 'YOUR_API_KEY_HERE' with your actual API key

async function debugAnalyticsIssue(apiKey) {
  console.log('🔍 DEBUGGING ANALYTICS ISSUE...');
  
  const headers = {
    'Authorization': 'Bearer ' + apiKey,
    'Content-Type': 'application/json'
  };
  
  try {
    // Step 1: Get campaigns (we know this works)
    console.log('\\n1️⃣ Fetching campaigns...');
    const campaignsResponse = await fetch('https://api.instantly.ai/api/v2/campaigns?limit=10', { headers });
    const campaignsData = await campaignsResponse.json();
    
    if (!campaignsData.items || campaignsData.items.length === 0) {
      console.log('❌ No campaigns found');
      return;
    }
    
    console.log('✅ Found campaigns:', campaignsData.items.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status
    })));
    
    // Step 2: Try analytics for each campaign
    for (let i = 0; i < Math.min(3, campaignsData.items.length); i++) {
      const campaign = campaignsData.items[i];
      console.log('\\n📊 Testing analytics for:', campaign.name);
      
      // Test different analytics endpoint variations
      const analyticsUrls = [
        \`https://api.instantly.ai/api/v2/campaigns/analytics?id=\${campaign.id}\`,
        \`https://api.instantly.ai/api/v2/campaigns/analytics?campaign_id=\${campaign.id}\`,
        \`https://api.instantly.ai/api/v2/campaigns/\${campaign.id}/analytics\`,
        \`https://api.instantly.ai/api/v2/analytics?id=\${campaign.id}\`,
        \`https://api.instantly.ai/api/v2/analytics?campaign_id=\${campaign.id}\`
      ];
      
      for (const url of analyticsUrls) {
        try {
          console.log('  🔗 Trying:', url);
          const response = await fetch(url, { headers });
          console.log('  📡 Status:', response.status);
          
          if (response.ok) {
            const data = await response.json();
            console.log('  ✅ Analytics data structure:', {
              isArray: Array.isArray(data),
              hasItems: !!data.items,
              keys: Object.keys(data),
              length: Array.isArray(data) ? data.length : 'not array'
            });
            
            let analytics = data;
            if (Array.isArray(data) && data.length > 0) {
              analytics = data[0];
            } else if (data.items && Array.isArray(data.items) && data.items.length > 0) {
              analytics = data.items[0];
            }
            
            if (analytics && typeof analytics === 'object') {
              console.log('  📈 Key metrics:', {
                campaign_id: analytics.campaign_id,
                campaign_name: analytics.campaign_name,
                leads_count: analytics.leads_count,
                contacted_count: analytics.contacted_count,
                emails_sent_count: analytics.emails_sent_count,
                open_count: analytics.open_count,
                reply_count: analytics.reply_count,
                bounced_count: analytics.bounced_count,
                leadsReady: (analytics.leads_count || 0) - (analytics.contacted_count || 0) - (analytics.bounced_count || 0)
              });
            }
            break; // Found working endpoint
          } else {
            const errorText = await response.text();
            console.log('  ❌ Error:', response.status, errorText.substring(0, 200));
          }
        } catch (error) {
          console.log('  💥 Exception:', error.message);
        }
      }
      
      // Also try the leads endpoint to see if leads exist
      console.log('  🎯 Checking leads directly...');
      try {
        const leadsResponse = await fetch('https://api.instantly.ai/api/v2/leads/list', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            filters: { campaign: campaign.id },
            limit: 5
          })
        });
        
        if (leadsResponse.ok) {
          const leadsData = await leadsResponse.json();
          console.log('  👥 Leads found:', leadsData.items?.length || 0);
          if (leadsData.items?.length > 0) {
            const sampleLead = leadsData.items[0];
            console.log('  📝 Sample lead status:', {
              email: sampleLead.email,
              status: sampleLead.status,
              campaign_id: sampleLead.campaign_id,
              contacted: sampleLead.contacted_count > 0
            });
          }
        } else {
          const errorText = await leadsResponse.text();
          console.log('  ❌ Leads API error:', leadsResponse.status, errorText.substring(0, 100));
        }
      } catch (error) {
        console.log('  💥 Leads API exception:', error.message);
      }
    }
    
  } catch (error) {
    console.log('💥 Major error:', error);
  }
}

// USAGE INSTRUCTIONS:
// 1. Copy the function above
// 2. Paste it in your browser console
// 3. Call it with your API key: debugAnalyticsIssue('your_api_key_here')

console.log('Debug script loaded. Copy the function above and run it in your browser console.');
`;
}

// For running directly in Node.js with your API key
async function debugAnalyticsNodeJs() {
  // Get API key from environment
  const apiKey = process.env.INSTANTLY_API_KEY || process.env.VITE_INSTANTLY_API_KEY;
  
  if (!apiKey) {
    console.log('❌ No API key found. Set INSTANTLY_API_KEY or VITE_INSTANTLY_API_KEY environment variable.');
    return;
  }
  
  console.log('🔍 DEBUGGING ANALYTICS ISSUE (Node.js)...');
  
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // Step 1: Get campaigns
    console.log('\n1️⃣ Fetching campaigns...');
    const campaignsResponse = await fetch('https://api.instantly.ai/api/v2/campaigns?limit=10', { headers });
    const campaignsData = await campaignsResponse.json();
    
    if (!campaignsData.items || campaignsData.items.length === 0) {
      console.log('❌ No campaigns found');
      return;
    }
    
    console.log('✅ Found campaigns:', campaignsData.items.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status
    })));
    
    // Focus on the specific campaigns we know about
    const targetCampaigns = [
      'afe7fbea-9d4e-491f-88e4-8f75985b9c07', // Beta
      '2e3519c8-ac6f-4961-b803-e28c7423d080', // Sales Dev
      '4bde0574-609a-409d-86cc-52b233699a2b'  // Digital Marketing
    ];
    
    for (const campaignId of targetCampaigns) {
      const campaign = campaignsData.items.find(c => c.id === campaignId);
      if (!campaign) {
        console.log(`⚠️ Campaign ${campaignId} not found in account`);
        continue;
      }
      
      console.log(`\n📊 Testing analytics for: ${campaign.name} (${campaignId})`);
      
      // Test the analytics endpoints we're currently using
      const analyticsUrls = [
        `https://api.instantly.ai/api/v2/analytics?id=${campaignId}`,
        `https://api.instantly.ai/api/v2/campaigns/analytics?id=${campaignId}`,
        `https://api.instantly.ai/api/v2/campaigns/analytics?campaign_id=${campaignId}`
      ];
      
      for (const url of analyticsUrls) {
        try {
          console.log(`  🔗 Trying: ${url}`);
          const response = await fetch(url, { headers });
          console.log(`  📡 Status: ${response.status}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log('  ✅ Success! Data structure:', {
              isArray: Array.isArray(data),
              hasItems: !!data.items,
              keys: Object.keys(data)
            });
            
            // Parse the analytics data
            let analytics = data;
            if (Array.isArray(data) && data.length > 0) {
              analytics = data[0];
            } else if (data.items && Array.isArray(data.items)) {
              analytics = data.items.find(item => item.campaign_id === campaignId) || data.items[0];
            }
            
            if (analytics && typeof analytics === 'object') {
              console.log('  📈 Key metrics:', {
                campaign_id: analytics.campaign_id,
                campaign_name: analytics.campaign_name,
                leads_count: analytics.leads_count || 0,
                contacted_count: analytics.contacted_count || 0,
                emails_sent_count: analytics.emails_sent_count || 0,
                open_count: analytics.open_count || 0,
                reply_count: analytics.reply_count || 0,
                bounced_count: analytics.bounced_count || 0,
                calculatedLeadsReady: Math.max(0, (analytics.leads_count || 0) - (analytics.contacted_count || 0) - (analytics.bounced_count || 0))
              });
            }
            break; // Found working endpoint
          } else {
            const errorText = await response.text();
            console.log(`  ❌ Error: ${response.status} ${errorText.substring(0, 100)}`);
          }
        } catch (error) {
          console.log(`  💥 Exception: ${error.message}`);
        }
      }
    }
    
  } catch (error) {
    console.log('💥 Major error:', error);
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createAnalyticsDebugger, debugAnalyticsNodeJs };
}

// If running directly with Node.js
if (require.main === module) {
  debugAnalyticsNodeJs();
}

// Print the browser console script
console.log('\n' + '='.repeat(80));
console.log('BROWSER CONSOLE DEBUG SCRIPT:');
console.log('='.repeat(80));
console.log(createAnalyticsDebugger());