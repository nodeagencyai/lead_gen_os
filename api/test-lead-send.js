// Simple test endpoint to test lead sending directly
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const instantlyApiKey = process.env.INSTANTLY_API_KEY;
  
  if (!instantlyApiKey) {
    return res.status(200).json({
      error: 'INSTANTLY_API_KEY not found',
      debug: 'Check environment variables'
    });
  }

  // Use your actual campaign ID
  const campaignId = req.query.campaignId || '4bde0574-609a-409d-86cc-52b233699a2b'; // Digital Marketing Agencies
  
  // Test lead data
  const testLead = {
    email: req.query.email || `test-${Date.now()}@example.com`,
    first_name: 'Test',
    last_name: 'Lead',
    company_name: 'Test Company',
    job_title: 'Test Position'
  };

  console.log('Testing lead send to campaign:', campaignId);
  console.log('Test lead data:', testLead);

  try {
    // Test the exact API call that your app makes
    const response = await fetch(`https://api.instantly.ai/api/v2/lead/add`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${instantlyApiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        campaign_id: campaignId,
        leads: [testLead],
        skip_if_in_workspace: true
      })
    });

    const responseText = await response.text();
    console.log('Raw response:', responseText);
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (e) {
      result = { raw_response: responseText };
    }

    return res.status(200).json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      campaign_id: campaignId,
      test_lead: testLead,
      api_response: result,
      headers: Object.fromEntries(response.headers.entries()),
      api_key_length: instantlyApiKey.length
    });

  } catch (error) {
    console.error('Test lead send error:', error);
    return res.status(200).json({
      success: false,
      error: error.message,
      stack: error.stack,
      campaign_id: campaignId,
      test_lead: testLead
    });
  }
}