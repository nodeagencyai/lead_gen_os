/**
 * GET /api/costs/dashboard-metrics
 * Returns current month dashboard cost metrics
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
    const forceRefresh = req.query.refresh === 'true';
    const metrics = await dashboardCostService.getDashboardMetrics(forceRefresh);

    res.status(200).json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard metrics',
      message: error.message
    });
  }
}