// Vercel Serverless Function for Instantly Daily Analytics
export default async function handler(req, res) {
  // Set comprehensive CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('🔄 CORS preflight request handled for /api/instantly/daily-analytics');
    return res.status(200).end();
  }

  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Use server-side environment variable (with fallback to VITE_ prefixed version)
    const INSTANTLY_API_KEY = process.env.INSTANTLY_API_KEY || process.env.VITE_INSTANTLY_API_KEY;
    
    if (!INSTANTLY_API_KEY) {
      console.error('❌ Instantly API key not found');
      return res.status(500).json({ 
        error: 'API key not configured',
        debug: 'INSTANTLY_API_KEY environment variable is missing'
      });
    }

    // Get days parameter from query (default to 30)
    const { days = '30' } = req.query;
    const daysPeriod = parseInt(days);
    
    console.log(`🔄 Fetching daily analytics from Instantly for last ${daysPeriod} days...`);

    // Get date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysPeriod);
    
    // Format dates as YYYY-MM-DD
    const formatDate = (date) => {
      return date.toISOString().split('T')[0];
    };

    // First, get all campaigns
    console.log('🔄 Step 1: Fetching all campaigns...');
    const campaignsResponse = await fetch(`https://api.instantly.ai/api/v2/campaigns`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${INSTANTLY_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const campaignsData = await campaignsResponse.json();
    
    if (!campaignsResponse.ok) {
      console.error('❌ Failed to fetch campaigns:', campaignsResponse.status, campaignsData);
      return res.status(campaignsResponse.status).json({
        error: 'Failed to fetch campaigns',
        status: campaignsResponse.status,
        details: campaignsData
      });
    }

    const campaigns = Array.isArray(campaignsData) ? campaignsData : (campaignsData.items || []);
    console.log(`✅ Found ${campaigns.length} campaigns`);

    // Fetch daily analytics for each campaign individually
    console.log('🔄 Step 2: Fetching daily analytics for each campaign...');
    const allDailyData = [];
    
    for (const campaign of campaigns) {
      try {
        console.log(`🔄 Fetching daily analytics for campaign: ${campaign.name} (${campaign.id})`);
        const response = await fetch(`https://api.instantly.ai/api/v2/campaigns/analytics/daily?campaign_id=${campaign.id}&start_date=${formatDate(startDate)}&end_date=${formatDate(endDate)}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${INSTANTLY_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const campaignDailyData = await response.json();
          const dailyArray = Array.isArray(campaignDailyData) ? campaignDailyData : (campaignDailyData.items || []);
          console.log(`✅ Campaign ${campaign.name}: ${dailyArray.length} daily records`);
          allDailyData.push(...dailyArray);
        } else {
          console.warn(`⚠️ Failed to fetch daily analytics for campaign ${campaign.name}:`, response.status);
        }
      } catch (error) {
        console.warn(`⚠️ Error fetching daily analytics for campaign ${campaign.name}:`, error.message);
      }
    }

    const data = allDailyData;
    console.log(`✅ Total daily records collected: ${data.length}`);

    console.log('✅ Fetched daily analytics from Instantly');
    console.log('📊 RAW DAILY ANALYTICS RESPONSE:', JSON.stringify(data, null, 2));
    console.log('📊 Daily analytics structure:', {
      hasItems: !!data.items,
      isArray: Array.isArray(data),
      keys: Object.keys(data || {}),
      dataLength: Array.isArray(data) ? data.length : (data.items ? data.items.length : 'unknown')
    });
    
    // Process the daily data into the format needed for charts
    const dailyData = Array.isArray(data) ? data : (data.items || []);
    console.log('📊 DAILY DATA TO PROCESS:', {
      length: dailyData.length,
      firstItem: dailyData.length > 0 ? dailyData[0] : 'no items'
    });
    
    // Group by date and aggregate across all campaigns
    const dateAggregates = {};
    
    dailyData.forEach((dayData, index) => {
      console.log(`📊 Processing day ${index + 1}:`, {
        date: dayData.date,
        sent: dayData.sent,
        opened: dayData.opened,
        replies: dayData.replies,
        unique_opened: dayData.unique_opened,
        unique_replies: dayData.unique_replies
      });
      const date = dayData.date;
      if (!dateAggregates[date]) {
        dateAggregates[date] = {
          date: date,
          sent: 0,
          opened: 0,
          replies: 0,
          unique_opened: 0,
          unique_replies: 0,
          clicks: 0,
          unique_clicks: 0
        };
      }
      
      // Aggregate metrics for this date
      dateAggregates[date].sent += dayData.sent || 0;
      dateAggregates[date].opened += dayData.opened || 0;
      dateAggregates[date].replies += dayData.replies || 0;
      dateAggregates[date].unique_opened += dayData.unique_opened || 0;
      dateAggregates[date].unique_replies += dayData.unique_replies || 0;
      dateAggregates[date].clicks += dayData.clicks || 0;
      dateAggregates[date].unique_clicks += dayData.unique_clicks || 0;
    });
    
    // Convert to array and sort by date
    const aggregatedData = Object.values(dateAggregates).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Calculate totals and percentage changes
    const totals = aggregatedData.reduce((acc, day) => ({
      sent: acc.sent + day.sent,
      unique_opened: acc.unique_opened + day.unique_opened,
      unique_replies: acc.unique_replies + day.unique_replies,
      clicks: acc.clicks + day.clicks
    }), { sent: 0, unique_opened: 0, unique_replies: 0, clicks: 0 });

    // Calculate percentage changes (compare first half vs second half of period)
    const midPoint = Math.floor(aggregatedData.length / 2);
    const firstHalf = aggregatedData.slice(0, midPoint);
    const secondHalf = aggregatedData.slice(midPoint);
    
    const firstHalfTotals = firstHalf.reduce((acc, day) => ({
      sent: acc.sent + day.sent,
      unique_opened: acc.unique_opened + day.unique_opened,
      unique_replies: acc.unique_replies + day.unique_replies
    }), { sent: 0, unique_opened: 0, unique_replies: 0 });
    
    const secondHalfTotals = secondHalf.reduce((acc, day) => ({
      sent: acc.sent + day.sent,
      unique_opened: acc.unique_opened + day.unique_opened,
      unique_replies: acc.unique_replies + day.unique_replies
    }), { sent: 0, unique_opened: 0, unique_replies: 0 });
    
    const calculateChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous * 100).toFixed(1);
    };

    const result = {
      dailyData: aggregatedData,
      totals,
      changes: {
        sent: calculateChange(secondHalfTotals.sent, firstHalfTotals.sent),
        unique_opened: calculateChange(secondHalfTotals.unique_opened, firstHalfTotals.unique_opened),
        unique_replies: calculateChange(secondHalfTotals.unique_replies, firstHalfTotals.unique_replies)
      },
      period: daysPeriod
    };

    console.log('📊 Processed daily analytics:', {
      daysCount: aggregatedData.length,
      totalsSent: totals.sent,
      totalsOpened: totals.unique_opened,
      changesData: result.changes
    });
    console.log('📊 FINAL RESULT:', JSON.stringify(result, null, 2));

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ Instantly daily analytics error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}