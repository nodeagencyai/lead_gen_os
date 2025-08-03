/**
 * GET /api/costs/trends
 * Returns monthly cost trends over time
 */

import { dashboardCostService } from '../../src/services/DashboardCostService';

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
    // Get months parameter (default 6)
    const months = parseInt(req.query.months || '6');
    
    if (months < 1 || months > 24) {
      return res.status(400).json({
        success: false,
        error: 'Months parameter must be between 1 and 24'
      });
    }

    const trends = await dashboardCostService.getCostTrends(months);

    res.status(200).json({
      success: true,
      data: trends,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cost trends error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cost trends',
      message: error.message
    });
  }
}