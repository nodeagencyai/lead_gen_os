// SIMPLE BROWSER TEST - Paste this in console on campaigns page
// This bypasses the complex service layer to test if campaigns show real data

async function simpleCampaignTest() {
  console.log('🔍 SIMPLE TEST: Checking campaign data display\n');
  
  // 1. Check what's currently displayed in the UI
  console.log('1️⃣ Current UI Display:');
  
  const campaignCards = document.querySelectorAll('.grid > div');
  console.log(`Found ${campaignCards.length} campaign cards\n`);
  
  const uiData = [];
  
  campaignCards.forEach((card, index) => {
    // Get campaign name
    const nameElement = card.querySelector('.text-lg.font-semibold, h3');
    const campaignName = nameElement?.textContent?.trim() || `Campaign ${index + 1}`;
    
    // Get all metric values (the big numbers)
    const metricElements = card.querySelectorAll('.text-lg.font-bold');
    const metrics = Array.from(metricElements).map(el => el.textContent?.trim());
    
    // Check if any metrics are non-zero
    const hasRealData = metrics.some(m => {
      if (!m) return false;
      const numValue = parseInt(m.replace('%', ''));
      return !isNaN(numValue) && numValue > 0;
    });
    
    const cardData = {
      name: campaignName,
      metrics: metrics,
      hasRealData: hasRealData
    };
    
    uiData.push(cardData);
    
    console.log(`📊 ${campaignName}:`, {
      metrics: metrics.join(' | '),
      status: hasRealData ? '✅ HAS NON-ZERO DATA' : '❌ ALL ZEROS'
    });
  });
  
  // 2. Test if we can bypass the proxy issue
  console.log('\n2️⃣ Testing Proxy Bypass:');
  
  // Check if we're getting source code from the proxy
  try {
    const proxyTest = await fetch('/api/instantly/campaigns');
    const proxyText = await proxyTest.text();
    const isSourceCode = proxyText.includes('Vercel Serverless Function') || proxyText.includes('module.exports');
    
    console.log('Proxy response:', {
      status: proxyTest.status,
      isSourceCode: isSourceCode,
      preview: proxyText.substring(0, 100) + '...'
    });
    
    if (isSourceCode) {
      console.log('⚠️ Confirmed: Vite dev server serving source code instead of executing functions');
      console.log('💡 This is why the smart fallback tried to activate');
    }
  } catch (e) {
    console.log('❌ Proxy test failed:', e.message);
  }
  
  // 3. Summary and diagnosis
  console.log('\n3️⃣ DIAGNOSIS:');
  
  const totalCampaigns = uiData.length;
  const campaignsWithData = uiData.filter(c => c.hasRealData).length;
  
  console.log(`📈 Summary:`);
  console.log(`  Total campaigns: ${totalCampaigns}`);
  console.log(`  Campaigns with real data: ${campaignsWithData}`);
  console.log(`  Campaigns with zeros: ${totalCampaigns - campaignsWithData}`);
  
  if (campaignsWithData === 0) {
    console.log('\n🚨 ISSUE: ALL campaigns showing zeros');
    console.log('🔍 Cause: API data is not reaching the UI components');
    console.log('💡 From logs above, proxy is serving source code → fallback failed on CORS');
  } else if (campaignsWithData === 1) {
    console.log('\n⚠️ PARTIAL ISSUE: Only 1 campaign showing real data');
    console.log('🔍 This matches your concern about "only Beta showing data"');
  } else if (campaignsWithData === totalCampaigns) {
    console.log('\n✅ SUCCESS: All campaigns showing real data!');
  } else {
    console.log('\n⚠️ MIXED: Some campaigns showing real data, others zeros');
  }
  
  // 4. Next steps
  console.log('\n4️⃣ NEXT STEPS:');
  
  if (campaignsWithData < totalCampaigns) {
    console.log('🔧 SOLUTION NEEDED:');
    console.log('  1. Fix Vite dev server to properly proxy serverless functions');
    console.log('  2. OR deploy to Vercel to test with real serverless functions');
    console.log('  3. OR create a development-specific data mock that uses real API structure');
    
    console.log('\n📝 IMMEDIATE FIX OPTIONS:');
    console.log('  A. Deploy to Vercel: vercel --prod');
    console.log('  B. Use production URL to test real serverless functions');
    console.log('  C. Mock API data in development with real structure');
  }
  
  return {
    uiData: uiData,
    summary: {
      total: totalCampaigns,
      withData: campaignsWithData,
      withZeros: totalCampaigns - campaignsWithData
    }
  };
}

// Run the test
simpleCampaignTest().then(result => {
  console.log('\n📋 TEST COMPLETE');
  console.log('🔍 Full results:', result);
});

console.log(`
🎯 WHAT THIS TEST DOES:

1. ✅ Checks what's currently displayed in campaign cards
2. ✅ Tests if Vite proxy is serving source code  
3. ✅ Provides clear diagnosis of the data flow issue
4. ✅ Suggests specific solutions

📊 EXPECTED FINDINGS:
- If all zeros: Confirms API data not reaching UI
- If mixed: Confirms some campaigns have real data, others don't
- If all real: Problem is solved!
`);