/**
 * POST /api/costs/record-activity
 * Records email sent or meeting booked activity
 */

import { dashboardCostService } from '../../src/services/DashboardCostService';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, campaignId, metadata } = req.body;

    // Validate input
    if (!type || !['email_sent', 'meeting_booked'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid activity type. Must be "email_sent" or "meeting_booked"'
      });
    }

    // Record activity
    await dashboardCostService.recordActivity({
      type,
      campaignId,
      metadata
    });

    // Return updated metrics
    const metrics = await dashboardCostService.getDashboardMetrics(true);

    res.status(200).json({
      success: true,
      message: `Activity recorded: ${type}`,
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Record activity error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record activity',
      message: error.message
    });
  }
}