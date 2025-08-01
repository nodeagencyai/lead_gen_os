// Test endpoint specifically for Instantly campaign send
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const instantlyApiKey = process.env.INSTANTLY_API_KEY;
  const campaignIds = [
    'afe7fbea-9d4e-491f-88e4-8f75985b9c07', // beta campaign
    '2e3519c8-ac6f-4961-b803-e28c7423d080'  // sales development representative
  ];
  const campaignId = req.query.campaignId || campaignIds[0];
  
  const results = {
    api_key_exists: !!instantlyApiKey,
    api_key_length: instantlyApiKey?.length || 0,
    campaign_id: campaignId,
    tests: []
  };

  if (!instantlyApiKey) {
    return res.status(200).json({
      ...results,
      error: 'INSTANTLY_API_KEY not found in environment variables'
    });
  }

  // Test 1: Check if campaign exists
  try {
    console.log('Testing campaign existence...');
    const campaignsResponse = await fetch('https://api.instantly.ai/api/v2/campaigns', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${instantlyApiKey}`,
        'Content-Type': 'application/json',
      }
    });
    
    const campaignsData = await campaignsResponse.json();
    const campaigns = campaignsData.items || [];
    const targetCampaign = campaigns.find(c => c.id === campaignId);
    
    results.tests.push({
      test: 'Get campaigns',
      status: campaignsResponse.status,
      success: campaignsResponse.ok,
      total_campaigns: campaigns.length,
      campaign_found: !!targetCampaign,
      campaign_details: targetCampaign ? {
        id: targetCampaign.id,
        name: targetCampaign.name,
        status: targetCampaign.status
      } : null,
      error: !campaignsResponse.ok ? campaignsData : null
    });
  } catch (error) {
    results.tests.push({
      test: 'Get campaigns',
      success: false,
      error: error.message
    });
  }

  // Test 2: Try to send a test lead
  if (req.method === 'POST' || req.query.testSend === 'true') {
    try {
      console.log('Testing lead send...');
      
      const testLead = {
        email: req.body?.email || `test-${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'Lead',
        companyName: 'Test Company',
        title: 'Test Title'
      };

      const sendResponse = await fetch(`https://api.instantly.ai/api/v2/campaigns/${campaignId}/leads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${instantlyApiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          leads: [testLead],
          skip_if_in_workspace: true
        })
      });
      
      const responseText = await sendResponse.text();
      let sendData;
      try {
        sendData = JSON.parse(responseText);
      } catch (e) {
        sendData = { raw_response: responseText };
      }
      
      results.tests.push({
        test: 'Send test lead',
        status: sendResponse.status,
        success: sendResponse.ok,
        test_lead: testLead,
        response: sendData,
        headers: Object.fromEntries(sendResponse.headers.entries())
      });
    } catch (error) {
      results.tests.push({
        test: 'Send test lead',
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  }

  // Test 3: Try different API endpoint variations
  try {
    console.log('Testing API endpoint variations...');
    
    // Test v1 endpoint (old)
    const v1Response = await fetch(`https://api.instantly.ai/api/v1/lead/add`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${instantlyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        campaign_id: campaignId,
        leads: [{
          email: `test-v1-${Date.now()}@example.com`,
          first_name: 'Test',
          last_name: 'V1'
        }]
      })
    });
    
    const v1Data = await v1Response.json();
    results.tests.push({
      test: 'Try v1 API endpoint',
      endpoint: '/api/v1/lead/add',
      status: v1Response.status,
      success: v1Response.ok,
      response: v1Data
    });
  } catch (error) {
    results.tests.push({
      test: 'Try v1 API endpoint',
      success: false,
      error: error.message
    });
  }

  return res.status(200).json(results);
}