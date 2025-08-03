/**
 * Cost Integration Service
 * Integrates cost tracking with the existing dashboard
 */

import { apiClient } from '../utils/apiClient';

interface CostMetrics {
  costPerEmail: number;
  costPerMeeting: number;
  totalMonthlySpend: number;
  costBreakdown: {
    fixed: {
      instantly: number;
      googleWorkspace: number;
      total: number;
    };
    variable: {
      openRouter: number;
      total: number;
    };
    total: number;
  };
  emailsSent: number;
  meetingsBooked: number;
  remainingCredits: number;
  exchangeRate: number;
  lastUpdated: Date;
}

interface CostTrend {
  period: string;
  totalCostEUR: number;
  fixedCostsEUR: number;
  variableCostsEUR: number;
  emailsSent: number;
  meetingsBooked: number;
  costPerEmailEUR: number;
  costPerMeetingEUR: number;
}

export class CostIntegrationService {
  private static instance: CostIntegrationService;
  private metricsCache: CostMetrics | null = null;
  private cacheTimestamp: number = 0;
  private cacheTimeout: number = 60000; // 1 minute

  private constructor() {}

  static getInstance(): CostIntegrationService {
    if (!CostIntegrationService.instance) {
      CostIntegrationService.instance = new CostIntegrationService();
    }
    return CostIntegrationService.instance;
  }

  /**
   * Get current cost metrics for dashboard
   */
  async getDashboardMetrics(forceRefresh = false): Promise<CostMetrics> {
    // Check cache
    if (!forceRefresh && this.metricsCache && 
        Date.now() - this.cacheTimestamp < this.cacheTimeout) {
      return this.metricsCache;
    }

    try {
      console.log('📊 Fetching cost metrics from API...');
      
      const response = await apiClient.get('/api/costs/dashboard-metrics', {
        params: { refresh: forceRefresh }
      });

      if (!response.data || response.data.error) {
        throw new Error(response.data?.error || 'Failed to fetch cost metrics');
      }

      const metrics = response.data.data;
      
      // Update cache
      this.metricsCache = metrics;
      this.cacheTimestamp = Date.now();
      
      console.log('✅ Cost metrics fetched successfully:', metrics);
      return metrics;

    } catch (error) {
      console.error('❌ Failed to fetch cost metrics:', error);
      
      // Return default values if API fails
      return {
        costPerEmail: 0,
        costPerMeeting: 0,
        totalMonthlySpend: 123, // Fixed costs only
        costBreakdown: {
          fixed: {
            instantly: 75,
            googleWorkspace: 48,
            total: 123
          },
          variable: {
            openRouter: 0,
            total: 0
          },
          total: 123
        },
        emailsSent: 0,
        meetingsBooked: 0,
        remainingCredits: 0,
        exchangeRate: 0.92,
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Record an activity (email sent or meeting booked)
   */
  async recordActivity(
    type: 'email_sent' | 'meeting_booked',
    campaignId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      console.log(`📧 Recording activity: ${type}`, { campaignId, metadata });
      
      const response = await apiClient.post('/api/costs/record-activity', {
        type,
        campaignId,
        metadata
      });

      if (!response.data || response.data.error) {
        throw new Error(response.data?.error || 'Failed to record activity');
      }

      // Update cache with new metrics
      if (response.data.data) {
        this.metricsCache = response.data.data;
        this.cacheTimestamp = Date.now();
      }

      console.log('✅ Activity recorded successfully');
      
    } catch (error) {
      console.error('❌ Failed to record activity:', error);
      // Don't throw - we don't want to break the app if cost tracking fails
    }
  }

  /**
   * Get cost trends for charts
   */
  async getCostTrends(months = 6): Promise<{ trends: CostTrend[]; summary: any }> {
    try {
      const response = await apiClient.get('/api/costs/trends', {
        params: { months }
      });

      if (!response.data || response.data.error) {
        throw new Error(response.data?.error || 'Failed to fetch cost trends');
      }

      return response.data.data;

    } catch (error) {
      console.error('❌ Failed to fetch cost trends:', error);
      return {
        trends: [],
        summary: {
          averageMonthlyCostEUR: 123,
          totalEmailsSent: 0,
          totalMeetingsBooked: 0
        }
      };
    }
  }

  /**
   * Get usage report for detailed breakdown
   */
  async getUsageReport(days = 30): Promise<any> {
    try {
      const response = await apiClient.get('/api/costs/usage-report', {
        params: { days }
      });

      if (!response.data || response.data.error) {
        throw new Error(response.data?.error || 'Failed to fetch usage report');
      }

      return response.data.data.report;

    } catch (error) {
      console.error('❌ Failed to fetch usage report:', error);
      return {
        totalUsage: 0,
        totalCostEUR: 0,
        totalTokens: 0,
        breakdown: {},
        details: []
      };
    }
  }

  /**
   * Format cost for display
   */
  formatCost(amount: number, currency = '€'): string {
    if (amount === 0) return `${currency}0.00`;
    if (amount < 0.01) return `<${currency}0.01`;
    return `${currency}${amount.toFixed(2)}`;
  }

  /**
   * Format large numbers with abbreviations
   */
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  /**
   * Check if cost alerts are needed
   */
  shouldShowCostAlert(metrics: CostMetrics): boolean {
    const threshold = 200; // €200 default threshold
    return metrics.totalMonthlySpend > threshold;
  }

  /**
   * Get cost efficiency score (0-100)
   */
  getCostEfficiencyScore(metrics: CostMetrics): number {
    if (metrics.emailsSent === 0) return 0;
    
    // Target: €0.10 per email, €5 per meeting
    const targetCostPerEmail = 0.10;
    const targetCostPerMeeting = 5.00;
    
    const emailScore = Math.max(0, 100 - ((metrics.costPerEmail - targetCostPerEmail) / targetCostPerEmail) * 100);
    const meetingScore = metrics.meetingsBooked > 0 
      ? Math.max(0, 100 - ((metrics.costPerMeeting - targetCostPerMeeting) / targetCostPerMeeting) * 100)
      : emailScore;
    
    return Math.round((emailScore + meetingScore) / 2);
  }
}

// Export singleton instance
export const costIntegrationService = CostIntegrationService.getInstance();