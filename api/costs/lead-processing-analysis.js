/**
 * GET /api/costs/lead-processing-analysis
 * Returns detailed analysis of lead processing costs vs actual results
 */

import { leadProcessingCostTracker } from '../../src/services/LeadProcessingCostTracker';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { campaign_id, days = '30' } = req.query;
    const daysPeriod = parseInt(days);

    if (campaign_id) {
      // Get analysis for specific campaign
      const costAllocation = await leadProcessingCostTracker.getCostAllocation(campaign_id, daysPeriod);
      
      res.status(200).json({
        success: true,
        data: {
          type: 'campaign_analysis',
          campaignId: campaign_id,
          period: `${daysPeriod} days`,
          analysis: costAllocation
        },
        timestamp: new Date().toISOString()
      });
    } else {
      // Get overall detailed breakdown
      const detailedBreakdown = await leadProcessingCostTracker.getDetailedCostBreakdown(daysPeriod);
      
      res.status(200).json({
        success: true,
        data: {
          type: 'overall_analysis',
          period: `${daysPeriod} days`,
          analysis: detailedBreakdown
        },
        timestamp: new Date().toISOString()
      });
    }

  } catch (error) {
    console.error('Lead processing analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze lead processing costs',
      message: error.message
    });
  }
}