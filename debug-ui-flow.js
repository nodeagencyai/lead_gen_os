// UI DEBUG FUNCTION - Paste this in your browser console
// This will help us see where the data flow is breaking between API and UI

async function debugUIDataFlow(apiKey) {
  console.log('🎯 DEBUGGING UI DATA FLOW...');
  
  const headers = {
    'Authorization': 'Bearer ' + apiKey,
    'Content-Type': 'application/json'
  };
  
  try {
    // Step 1: Get raw API data
    console.log('\n1️⃣ Fetching raw API data...');
    const campaignsResponse = await fetch('https://api.instantly.ai/api/v2/campaigns?limit=10', { headers });
    const campaignsData = await campaignsResponse.json();
    
    const campaigns = campaignsData.items || [];
    console.log('📋 Raw campaigns:', campaigns);
    
    // Step 2: Fetch analytics for each campaign
    const campaignDataWithAnalytics = [];
    
    for (const campaign of campaigns) {
      console.log(`\n📊 Processing: ${campaign.name}`);
      
      try {
        const analyticsResponse = await fetch(`https://api.instantly.ai/api/v2/campaigns/analytics?id=${campaign.id}`, { headers });
        const analyticsData = await analyticsResponse.json();
        
        console.log('  📈 Raw analytics:', analyticsData);
        
        const analytics = Array.isArray(analyticsData) && analyticsData.length > 0 ? analyticsData[0] : {};
        
        // Calculate metrics exactly like your app should
        const emailsSent = analytics.emails_sent_count || 0;
        const totalLeads = analytics.leads_count || 0;
        const contacted = analytics.contacted_count || 0;
        
        const transformedData = {
          // Basic info
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          
          // Metrics
          totalContacted: contacted,
          openRate: emailsSent > 0 ? ((analytics.open_count || 0) / emailsSent * 100).toFixed(1) : '0',
          clickRate: emailsSent > 0 ? ((analytics.link_click_count || 0) / emailsSent * 100).toFixed(1) : '0',
          replyRate: emailsSent > 0 ? ((analytics.reply_count || 0) / emailsSent * 100).toFixed(1) : '0',
          leadsReady: Math.max(0, totalLeads - contacted),
          emailsSent: emailsSent,
          totalLeads: totalLeads,
          
          // Status mapping
          statusText: campaign.status === 1 ? 'Active' : 
                     campaign.status === 2 ? 'Paused' : 
                     campaign.status === 3 ? 'Completed' : 'Draft',
          
          // Raw data for debugging
          _rawCampaign: campaign,
          _rawAnalytics: analytics
        };
        
        console.log('  ✅ Transformed data:', transformedData);
        campaignDataWithAnalytics.push(transformedData);
        
      } catch (error) {
        console.log(`  ❌ Analytics error for ${campaign.name}:`, error);
        
        // Add campaign with empty metrics
        campaignDataWithAnalytics.push({
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          totalContacted: 0,
          openRate: '0',
          clickRate: '0',
          replyRate: '0',
          leadsReady: 0,
          emailsSent: 0,
          error: error.message
        });
      }
    }
    
    console.log('\n🎯 FINAL PROCESSED DATA:');
    console.log(campaignDataWithAnalytics);
    
    // Step 3: Check what's actually in your React state
    console.log('\n🔍 CHECKING REACT COMPONENT STATE...');
    
    // Try to find React components in the DOM
    const campaignCards = document.querySelectorAll('[class*="campaign"]');
    console.log('📋 Found campaign elements:', campaignCards.length);
    
    if (campaignCards.length > 0) {
      campaignCards.forEach((card, index) => {
        console.log(`Card ${index + 1}:`, {
          innerHTML: card.innerHTML.substring(0, 200) + '...',
          textContent: card.textContent.substring(0, 100) + '...'
        });
      });
    }
    
    // Step 4: Check for React DevTools
    if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      console.log('🔧 React DevTools detected - check React components state manually');
    } else {
      console.log('⚠️ React DevTools not available');
    }
    
    // Step 5: Show expected vs actual data
    console.log('\n📊 EXPECTED DATA FOR YOUR CARDS:');
    campaignDataWithAnalytics.forEach(campaign => {
      console.log(`\n${campaign.name}:`);
      console.log('  Total Contacted:', campaign.totalContacted);
      console.log('  Open Rate:', campaign.openRate + '%');
      console.log('  Click Rate:', campaign.clickRate + '%');
      console.log('  Reply Rate:', campaign.replyRate + '%');
      console.log('  Leads Ready:', campaign.leadsReady);
      console.log('  Emails Sent:', campaign.emailsSent);
      console.log('  Status:', campaign.statusText);
    });
    
    // Step 6: Return data for manual inspection
    window.debugCampaignData = campaignDataWithAnalytics;
    console.log('\n💾 Data saved to window.debugCampaignData for inspection');
    
    return campaignDataWithAnalytics;
    
  } catch (error) {
    console.log('💥 Major error:', error);
    return null;
  }
}

// Export for use in Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { debugUIDataFlow };
}

console.log('UI Debug script loaded. Copy the debugUIDataFlow function and run it in your browser console with your API key.');