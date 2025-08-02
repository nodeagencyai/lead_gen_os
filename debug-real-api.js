// REAL API DEBUG SCRIPT - Test if our smart API client is working
// Paste this in browser console to test the actual data flow

async function testRealAPIFlow() {
  console.log('🧪 TESTING REAL API FLOW...');
  
  try {
    // Test 1: Check if we can access the API client
    console.log('1️⃣ Testing API client access...');
    if (typeof window !== 'undefined' && window.location) {
      console.log('✅ Running in browser');
    }
    
    // Test 2: Try calling our campaigns endpoint directly
    console.log('2️⃣ Testing campaigns endpoint...');
    const campaignResponse = await fetch('/api/instantly/campaigns');
    const campaignText = await campaignResponse.text();
    
    console.log('📋 Campaigns response:', {
      status: campaignResponse.status,
      isJSON: campaignText.startsWith('{') || campaignText.startsWith('['),
      isSourceCode: campaignText.includes('Vercel Serverless Function'),
      preview: campaignText.substring(0, 200)
    });
    
    // Test 3: If it's source code, test direct API call
    if (campaignText.includes('Vercel Serverless Function')) {
      console.log('3️⃣ Proxy failed, testing direct API call...');
      
      // This will be blocked by CORS, but we can see the error
      try {
        const directResponse = await fetch('https://api.instantly.ai/api/v2/campaigns', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('instantly_api_key') || 'TEST_KEY'}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('📡 Direct API response:', directResponse.status);
      } catch (error) {
        console.log('🚫 Direct API blocked (expected CORS error):', error.message);
        console.log('💡 This is why we need the smart fallback in the service layer');
      }
    }
    
    // Test 4: Check what our service is actually returning
    console.log('4️⃣ Checking service data flow...');
    
    // Look for campaign data in React components
    const campaignElements = document.querySelectorAll('[data-campaign-id], .campaign-card, [class*="campaign"]');
    console.log('📊 Found campaign elements:', campaignElements.length);
    
    campaignElements.forEach((el, idx) => {
      console.log(`Card ${idx + 1}:`, {
        textContent: el.textContent?.substring(0, 100),
        hasZeros: el.textContent?.includes('0'),
        hasRealData: el.textContent?.match(/[1-9]\d*/) // Look for non-zero numbers
      });
    });
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
  }
}

// Run the test
testRealAPIFlow();

console.log(`
🔍 DEBUGGING CHECKLIST:
1. Are we getting JavaScript source code instead of JSON from /api/instantly/campaigns?
2. Is the smart fallback actually working in the service layer?
3. Are campaigns showing real numbers or still zeros?
4. Is the data transformation working correctly?

📝 NEXT STEPS:
- If proxy returns source code: Smart fallback should kick in
- If cards still show zeros: Data transformation issue
- If no campaigns load: API client or service issue
`);