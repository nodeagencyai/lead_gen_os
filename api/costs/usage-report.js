/**
 * GET /api/costs/usage-report
 * Returns detailed usage breakdown for a date range
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
    // Parse date parameters
    const { start_date, end_date, days } = req.query;
    
    let startDate, endDate;
    
    if (days) {
      // Calculate date range based on days
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));
    } else if (start_date && end_date) {
      // Use provided dates
      startDate = new Date(start_date);
      endDate = new Date(end_date);
    } else {
      // Default to last 30 days
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
    }

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: 'Invalid date format'
      });
    }

    const report = await dashboardCostService.getUsageReport(startDate, endDate);

    res.status(200).json({
      success: true,
      data: {
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        report
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Usage report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate usage report',
      message: error.message
    });
  }
}