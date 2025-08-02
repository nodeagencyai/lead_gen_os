// INSTANTLY ANALYTICS DEBUG SCRIPT (ES Module)
// Run this to debug analytics endpoints

import { config } from 'dotenv';

// Load environment variables
config();

async function debugAnalyticsIssue() {
  // Get API key from environment
  const apiKey = process.env.INSTANTLY_API_KEY || process.env.VITE_INSTANTLY_API_KEY;
  
  if (!apiKey) {
    console.log('❌ No API key found. Set INSTANTLY_API_KEY or VITE_INSTANTLY_API_KEY environment variable.');
    console.log('🔍 Checking available env vars:', Object.keys(process.env).filter(k => k.includes('INSTANTLY')));
    return;
  }
  
  console.log('🔍 DEBUGGING ANALYTICS ISSUE...');
  console.log('🔑 Using API key:', apiKey.substring(0, 8) + '...');
  
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
  
  try {
    // Step 1: Get campaigns
    console.log('\n1️⃣ Fetching campaigns...');
    const campaignsResponse = await fetch('https://api.instantly.ai/api/v2/campaigns?limit=10', { headers });
    
    if (!campaignsResponse.ok) {
      console.log('❌ Campaigns request failed:', campaignsResponse.status);
      const errorText = await campaignsResponse.text();
      console.log('Error details:', errorText.substring(0, 200));
      return;
    }
    
    const campaignsData = await campaignsResponse.json();
    
    if (!campaignsData.items || campaignsData.items.length === 0) {
      console.log('❌ No campaigns found');
      console.log('Response structure:', Object.keys(campaignsData));
      return;
    }
    
    console.log('✅ Found campaigns:', campaignsData.items.map(c => ({
      id: c.id,
      name: c.name,
      status: c.status
    })));
    
    // Focus on the specific campaigns we know about
    const targetCampaigns = [
      { id: 'afe7fbea-9d4e-491f-88e4-8f75985b9c07', name: 'Beta' },
      { id: '2e3519c8-ac6f-4961-b803-e28c7423d080', name: 'Sales Dev' },
      { id: '4bde0574-609a-409d-86cc-52b233699a2b', name: 'Digital Marketing' }
    ];
    
    for (const targetCampaign of targetCampaigns) {
      const campaign = campaignsData.items.find(c => c.id === targetCampaign.id);
      if (!campaign) {
        console.log(`⚠️ Campaign ${targetCampaign.name} (${targetCampaign.id}) not found in account`);
        continue;
      }
      
      console.log(`\n📊 Testing analytics for: ${campaign.name} (${targetCampaign.id})`);
      
      // Test the analytics endpoints we're currently using
      const analyticsUrls = [
        `https://api.instantly.ai/api/v2/analytics?id=${targetCampaign.id}`,
        `https://api.instantly.ai/api/v2/campaigns/analytics?id=${targetCampaign.id}`,
        `https://api.instantly.ai/api/v2/campaigns/analytics?campaign_id=${targetCampaign.id}`
      ];
      
      let workingEndpoint = null;
      
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
              keys: Object.keys(data),
              itemCount: Array.isArray(data) ? data.length : (data.items?.length || 'no items')
            });
            
            // Parse the analytics data
            let analytics = null;
            if (Array.isArray(data) && data.length > 0) {
              analytics = data[0];
              console.log('  📋 Using first item from array');
            } else if (data.items && Array.isArray(data.items)) {
              analytics = data.items.find(item => item.campaign_id === targetCampaign.id) || data.items[0];
              console.log('  📋 Found matching item in items array');
            } else if (data.campaign_id) {
              analytics = data;
              console.log('  📋 Using direct data object');
            }
            
            if (analytics && typeof analytics === 'object') {
              console.log('  📈 Raw analytics fields:', Object.keys(analytics));
              console.log('  📊 Key metrics:', {
                campaign_id: analytics.campaign_id,
                campaign_name: analytics.campaign_name,
                leads_count: analytics.leads_count || 0,
                contacted_count: analytics.contacted_count || 0,
                emails_sent_count: analytics.emails_sent_count || 0,
                open_count: analytics.open_count || 0,
                reply_count: analytics.reply_count || 0,
                bounced_count: analytics.bounced_count || 0,
                unsubscribed_count: analytics.unsubscribed_count || 0
              });
              
              // Calculate rates
              const emailsSent = analytics.emails_sent_count || 0;
              const openRate = emailsSent > 0 ? Math.round((analytics.open_count || 0) / emailsSent * 100) : 0;
              const replyRate = emailsSent > 0 ? Math.round((analytics.reply_count || 0) / emailsSent * 100) : 0;
              const leadsReady = Math.max(0, 
                (analytics.leads_count || 0) - 
                (analytics.contacted_count || 0) - 
                (analytics.bounced_count || 0) - 
                (analytics.unsubscribed_count || 0)
              );
              
              console.log('  🎯 Calculated metrics for UI:', {
                openRate: `${openRate}%`,
                replyRate: `${replyRate}%`,
                leadsReady,
                hasRealData: emailsSent > 0 || (analytics.leads_count || 0) > 0
              });
              
              workingEndpoint = url;
            } else {
              console.log('  ⚠️ No analytics object found in response');
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
      
      if (workingEndpoint) {
        console.log(`  ✅ Working endpoint found: ${workingEndpoint}`);
      } else {
        console.log(`  ❌ No working analytics endpoint found for ${campaign.name}`);
      }
    }
    
    console.log('\n🏁 Debug complete!');
    
  } catch (error) {
    console.log('💥 Major error:', error);
  }
}

// Run the debug
debugAnalyticsIssue();