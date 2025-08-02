// VERIFICATION: ALL CAMPAIGNS REAL DATA
// This script verifies that ALL campaigns show real API data, not just Beta
// Paste this in browser console on campaigns page

async function verifyAllCampaignsShowRealData() {
  console.log('🔍 VERIFYING: All campaigns display real data (not just Beta)...\n');
  
  // Step 1: Test each campaign's analytics endpoint individually
  console.log('1️⃣ Testing each campaign analytics endpoint:');
  
  const campaigns = [
    { id: '4bde0574-609a-409d-86cc-52b233699a2b', name: 'Digital Marketing' },
    { id: '2e3519c8-ac6f-4961-b803-e28c7423d080', name: 'Sales Development' },
    { id: 'afe7fbea-9d4e-491f-88e4-8f75985b9c07', name: 'Beta' }
  ];
  
  const campaignResults = {};
  
  for (const campaign of campaigns) {
    console.log(`\n📊 Testing ${campaign.name} (${campaign.id.substring(0, 8)}...):`);
    
    try {
      const response = await fetch(`/api/instantly/analytics?id=${campaign.id}`);
      const text = await response.text();
      
      // Check if we got real data
      const isJSON = text.startsWith('[') || text.startsWith('{');
      const isSourceCode = text.includes('Vercel Serverless Function');
      
      if (isJSON && !isSourceCode) {
        const data = JSON.parse(text);
        const analytics = Array.isArray(data) ? data[0] : data;
        
        campaignResults[campaign.name] = {
          status: 'SUCCESS',
          hasData: true,
          contactedCount: analytics?.contacted_count || 0,
          emailsSent: analytics?.emails_sent_count || 0,
          leadsCount: analytics?.leads_count || 0,
          openCount: analytics?.open_count || 0,
          replyCount: analytics?.reply_count || 0
        };
        
        console.log(`✅ ${campaign.name} - Real data received:`, {
          contacted: analytics?.contacted_count || 0,
          sent: analytics?.emails_sent_count || 0,
          leads: analytics?.leads_count || 0,
          opens: analytics?.open_count || 0,
          replies: analytics?.reply_count || 0
        });
      } else {
        campaignResults[campaign.name] = {
          status: 'FAILED',
          hasData: false,
          reason: isSourceCode ? 'Source code returned' : 'Invalid response'
        };
        console.log(`❌ ${campaign.name} - Failed: ${isSourceCode ? 'Source code returned' : 'Invalid response'}`);
      }
    } catch (error) {
      campaignResults[campaign.name] = {
        status: 'ERROR',
        hasData: false,
        reason: error.message
      };
      console.log(`❌ ${campaign.name} - Error: ${error.message}`);
    }
  }
  
  // Step 2: Analyze what's displayed in the UI
  console.log('\n2️⃣ Analyzing UI campaign cards:');
  
  const cards = Array.from(document.querySelectorAll('.grid > div')).filter(card => 
    card.querySelector('.text-lg.font-semibold')
  );
  
  console.log(`Found ${cards.length} campaign cards in UI`);
  
  const uiResults = {};
  
  cards.forEach((card, index) => {
    const nameElement = card.querySelector('.text-lg.font-semibold');
    const campaignName = nameElement?.textContent?.trim() || `Campaign ${index + 1}`;
    
    // Get all metrics from the card
    const metricElements = card.querySelectorAll('.text-lg.font-bold');
    const metrics = Array.from(metricElements).map(el => el.textContent?.trim());
    
    // Parse metrics (assuming order: totalContacted, openRate, clickRate, replyRate, leadsReady, emailsSent)
    const [totalContacted, openRate, clickRate, replyRate, leadsReady, emailsSent] = metrics;
    
    uiResults[campaignName] = {
      totalContacted: parseInt(totalContacted) || 0,
      openRate: parseInt(openRate?.replace('%', '')) || 0,
      clickRate: parseInt(clickRate?.replace('%', '')) || 0,
      replyRate: parseInt(replyRate?.replace('%', '')) || 0,
      leadsReady: parseInt(leadsReady) || 0,
      emailsSent: parseInt(emailsSent) || 0,
      hasRealData: metrics.some(m => m && m !== '0' && m !== '0%')
    };
    
    console.log(`📱 ${campaignName}:`, {
      contacted: uiResults[campaignName].totalContacted,
      openRate: uiResults[campaignName].openRate + '%',
      emailsSent: uiResults[campaignName].emailsSent,
      leadsReady: uiResults[campaignName].leadsReady,
      hasRealData: uiResults[campaignName].hasRealData
    });
  });
  
  // Step 3: Compare API data vs UI display
  console.log('\n3️⃣ COMPARISON: API Data vs UI Display');
  
  const comparison = {};
  
  Object.keys(campaignResults).forEach(campaignName => {
    const apiData = campaignResults[campaignName];
    const uiData = uiResults[campaignName] || uiResults[Object.keys(uiResults).find(key => 
      key.toLowerCase().includes(campaignName.toLowerCase().split(' ')[0])
    )];
    
    if (uiData) {
      const matches = {
        contacted: apiData.contactedCount === uiData.totalContacted,
        emailsSent: apiData.emailsSent === uiData.emailsSent
      };
      
      comparison[campaignName] = {
        apiHasData: apiData.hasData,
        uiHasData: uiData.hasRealData,
        dataMatches: matches.contacted && matches.emailsSent,
        apiContacted: apiData.contactedCount,
        uiContacted: uiData.totalContacted,
        apiSent: apiData.emailsSent,
        uiSent: uiData.emailsSent
      };
      
      console.log(`🔄 ${campaignName}:`, {
        apiHasData: apiData.hasData,
        uiHasData: uiData.hasRealData,
        contacted: `API:${apiData.contactedCount} UI:${uiData.totalContacted} ${matches.contacted ? '✅' : '❌'}`,
        emailsSent: `API:${apiData.emailsSent} UI:${uiData.emailsSent} ${matches.emailsSent ? '✅' : '❌'}`
      });
    }
  });
  
  // Step 4: Final assessment
  console.log('\n4️⃣ FINAL ASSESSMENT:');
  
  const totalCampaigns = Object.keys(campaignResults).length;
  const campaignsWithApiData = Object.values(campaignResults).filter(r => r.hasData).length;
  const campaignsWithUiData = Object.values(uiResults).filter(r => r.hasRealData).length;
  const campaignsWithMatchingData = Object.values(comparison).filter(c => c.dataMatches).length;
  
  console.log(`📊 Campaign Data Summary:`);
  console.log(`  Total campaigns: ${totalCampaigns}`);
  console.log(`  API returning data: ${campaignsWithApiData}/${totalCampaigns}`);
  console.log(`  UI showing real data: ${campaignsWithUiData}/${Object.keys(uiResults).length}`);
  console.log(`  Data matching API: ${campaignsWithMatchingData}/${totalCampaigns}`);
  
  if (campaignsWithMatchingData === totalCampaigns) {
    console.log('🎉 SUCCESS: ALL campaigns showing real API data!');
  } else if (campaignsWithUiData > 1) {
    console.log('⚠️ PARTIAL SUCCESS: Multiple campaigns showing real data, but not all match API');
  } else if (campaignsWithUiData === 1) {
    console.log('❌ ISSUE: Only one campaign (likely Beta) showing real data');
  } else {
    console.log('🚨 CRITICAL: NO campaigns showing real data in UI');
  }
  
  return {
    campaignResults,
    uiResults,
    comparison,
    summary: {
      totalCampaigns,
      campaignsWithApiData,
      campaignsWithUiData,
      campaignsWithMatchingData
    }
  };
}

// Auto-run the verification
verifyAllCampaignsShowRealData().then(results => {
  console.log('\n📋 VERIFICATION COMPLETE');
  console.log('🔍 Results stored in:', results);
});

console.log(`
🎯 WHAT THIS TEST CHECKS:

1. Individual API endpoints for each campaign
2. What data is actually displayed in UI cards  
3. Whether API data matches UI display
4. If all campaigns or just Beta show real data

📊 EXPECTED RESULT:
All campaigns should show real metrics from their respective Instantly API data.

⚠️ IF ONLY BETA SHOWS DATA:
- Other campaigns may not have analytics data in Instantly
- Service may be filtering out campaigns without data
- API may be returning empty arrays for inactive campaigns

✅ SOLUTION:
If campaigns exist but have no activity, they should show 0 metrics from API, not hardcoded 0s.
`);