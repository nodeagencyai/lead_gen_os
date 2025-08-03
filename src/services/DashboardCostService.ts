/**
 * DashboardCostService
 * 
 * This service manages cost metrics for the dashboard, including:
 * - Updating email/meeting counts
 * - Calculating real-time cost metrics
 * - Currency conversion
 * - Cost breakdown analysis
 */

import { supabase } from '../lib/supabase';
import { openRouterCostTracker } from './OpenRouterCostTracker';

interface CostBreakdown {
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
}

interface DashboardMetrics {
  costPerEmail: number;
  costPerMeeting: number;
  totalMonthlySpend: number;
  costBreakdown: CostBreakdown;
  emailsSent: number;
  meetingsBooked: number;
  remainingCredits: number;
  exchangeRate: number;
  lastUpdated: Date;
}

interface ActivityEvent {
  type: 'email_sent' | 'meeting_booked';
  campaignId?: string;
  metadata?: Record<string, any>;
}

export class DashboardCostService {
  private exchangeRate: number = 0.92; // USD to EUR default
  private cacheTimeout: number = 60000; // 1 minute cache
  private metricsCache: { data: DashboardMetrics | null; timestamp: number } = {
    data: null,
    timestamp: 0
  };

  constructor() {
    this.updateExchangeRate();
  }

  /**
   * Update exchange rate from external API or config
   */
  private async updateExchangeRate(): Promise<void> {
    try {
      // In production, you might want to use a real exchange rate API
      // For now, using a fixed rate or environment variable
      this.exchangeRate = parseFloat(process.env.USD_TO_EUR_RATE || '0.92');
    } catch (error) {
      console.error('Failed to update exchange rate:', error);
    }
  }

  /**
   * Record an activity (email sent or meeting booked)
   */
  async recordActivity(event: ActivityEvent): Promise<void> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    try {
      // Get current monthly costs
      const { data: currentMonth, error: fetchError } = await supabase
        .from('monthly_costs')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      // Prepare update data
      const updateData: any = {
        updated_at: new Date()
      };

      if (event.type === 'email_sent') {
        updateData.emails_sent = (currentMonth?.emails_sent || 0) + 1;
      } else if (event.type === 'meeting_booked') {
        updateData.meetings_booked = (currentMonth?.meetings_booked || 0) + 1;
      }

      if (currentMonth) {
        // Update existing record
        await this.updateMonthlyCosts(currentMonth.id, updateData);
      } else {
        // Create new record
        const newRecord = {
          year,
          month,
          instantly_cost: 75,
          google_workspace_cost: 48,
          openrouter_cost: 0,
          total_cost: 123,
          emails_sent: event.type === 'email_sent' ? 1 : 0,
          meetings_booked: event.type === 'meeting_booked' ? 1 : 0,
          exchange_rate: this.exchangeRate
        };

        const { error: insertError } = await supabase
          .from('monthly_costs')
          .insert(newRecord);

        if (insertError) {
          throw insertError;
        }
      }

      // Invalidate cache
      this.metricsCache.timestamp = 0;

      // Check for cost alerts
      await this.checkCostAlerts();

    } catch (error) {
      console.error('Failed to record activity:', error);
      throw error;
    }
  }

  /**
   * Update monthly costs and calculate metrics
   */
  private async updateMonthlyCosts(id: string, updateData: any): Promise<void> {
    // Get current data for calculations
    const { data: current } = await supabase
      .from('monthly_costs')
      .select('*')
      .eq('id', id)
      .single();

    if (!current) return;

    // Merge update data
    const updated = { ...current, ...updateData };

    // Calculate cost per email and per meeting
    if (updated.emails_sent > 0) {
      updated.cost_per_email = updated.total_cost / updated.emails_sent;
    }

    if (updated.meetings_booked > 0) {
      updated.cost_per_meeting = updated.total_cost / updated.meetings_booked;
    }

    // Update database
    const { error } = await supabase
      .from('monthly_costs')
      .update(updated)
      .eq('id', id);

    if (error) {
      throw error;
    }
  }

  /**
   * Get dashboard metrics with caching
   */
  async getDashboardMetrics(forceRefresh = false): Promise<DashboardMetrics> {
    // Check cache
    if (!forceRefresh && this.metricsCache.data && 
        Date.now() - this.metricsCache.timestamp < this.cacheTimeout) {
      return this.metricsCache.data;
    }

    try {
      // Get current month data
      const currentMonth = await openRouterCostTracker.getCurrentMonthCosts();
      
      // Get remaining credits
      const remainingCredits = await openRouterCostTracker.getRemainingCredits();

      // Calculate cost breakdown
      const costBreakdown: CostBreakdown = {
        fixed: {
          instantly: currentMonth.instantly_cost,
          googleWorkspace: currentMonth.google_workspace_cost,
          total: currentMonth.instantly_cost + currentMonth.google_workspace_cost
        },
        variable: {
          openRouter: currentMonth.openrouter_cost,
          total: currentMonth.openrouter_cost
        },
        total: currentMonth.total_cost
      };

      // Calculate cost per email/meeting in EUR
      const costPerEmailUSD = currentMonth.emails_sent > 0 
        ? currentMonth.total_cost / currentMonth.emails_sent 
        : 0;
      
      const costPerMeetingUSD = currentMonth.meetings_booked > 0
        ? currentMonth.total_cost / currentMonth.meetings_booked
        : 0;

      const metrics: DashboardMetrics = {
        costPerEmail: this.convertToEUR(costPerEmailUSD),
        costPerMeeting: this.convertToEUR(costPerMeetingUSD),
        totalMonthlySpend: this.convertToEUR(currentMonth.total_cost),
        costBreakdown: this.convertBreakdownToEUR(costBreakdown),
        emailsSent: currentMonth.emails_sent,
        meetingsBooked: currentMonth.meetings_booked,
        remainingCredits: this.convertToEUR(remainingCredits),
        exchangeRate: this.exchangeRate,
        lastUpdated: new Date()
      };

      // Update cache
      this.metricsCache = {
        data: metrics,
        timestamp: Date.now()
      };

      return metrics;

    } catch (error) {
      console.error('Failed to get dashboard metrics:', error);
      throw error;
    }
  }

  /**
   * Get usage report for a date range
   */
  async getUsageReport(startDate: Date, endDate: Date): Promise<any> {
    const breakdown = await openRouterCostTracker.getUsageBreakdown(startDate, endDate);
    
    // Convert costs to EUR
    const reportInEUR = {
      ...breakdown,
      totalCostEUR: this.convertToEUR(breakdown.totalCost),
      breakdownEUR: Object.entries(breakdown.breakdown).reduce((acc: any, [key, value]: [string, any]) => {
        acc[key] = {
          ...value,
          totalCostEUR: this.convertToEUR(value.totalCost)
        };
        return acc;
      }, {})
    };

    return reportInEUR;
  }

  /**
   * Get monthly cost trends
   */
  async getCostTrends(months: number = 6): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const { data, error } = await supabase
      .from('monthly_costs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('year', { ascending: true })
      .order('month', { ascending: true });

    if (error) {
      throw error;
    }

    // Convert to EUR and format for charts
    const trends = data.map(month => ({
      period: `${month.year}-${String(month.month).padStart(2, '0')}`,
      totalCostEUR: this.convertToEUR(month.total_cost),
      fixedCostsEUR: this.convertToEUR(month.instantly_cost + month.google_workspace_cost),
      variableCostsEUR: this.convertToEUR(month.openrouter_cost),
      emailsSent: month.emails_sent,
      meetingsBooked: month.meetings_booked,
      costPerEmailEUR: this.convertToEUR(month.cost_per_email || 0),
      costPerMeetingEUR: this.convertToEUR(month.cost_per_meeting || 0)
    }));

    return {
      trends,
      summary: {
        averageMonthlyCostEUR: trends.reduce((sum, t) => sum + t.totalCostEUR, 0) / trends.length,
        totalEmailsSent: trends.reduce((sum, t) => sum + t.emailsSent, 0),
        totalMeetingsBooked: trends.reduce((sum, t) => sum + t.meetingsBooked, 0)
      }
    };
  }

  /**
   * Check and trigger cost alerts
   */
  private async checkCostAlerts(): Promise<void> {
    try {
      const metrics = await this.getDashboardMetrics();
      const threshold = parseFloat(process.env.COST_ALERT_THRESHOLD || '200');

      if (metrics.totalMonthlySpend > threshold) {
        // Check if alert already exists for this month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const { data: existingAlert } = await supabase
          .from('cost_alerts')
          .select('*')
          .eq('alert_type', 'monthly_threshold')
          .gte('created_at', startOfMonth.toISOString())
          .single();

        if (!existingAlert) {
          // Create new alert
          await supabase
            .from('cost_alerts')
            .insert({
              alert_type: 'monthly_threshold',
              threshold_amount: threshold,
              current_amount: metrics.totalMonthlySpend,
              is_triggered: true,
              triggered_at: new Date()
            });

          // Here you could send notifications (email, Slack, etc.)
          console.warn(`Cost alert: Monthly spend (€${metrics.totalMonthlySpend}) exceeded threshold (€${threshold})`);
        }
      }
    } catch (error) {
      console.error('Failed to check cost alerts:', error);
    }
  }

  /**
   * Convert USD to EUR
   */
  private convertToEUR(amountUSD: number): number {
    return Math.round(amountUSD * this.exchangeRate * 100) / 100;
  }

  /**
   * Convert cost breakdown to EUR
   */
  private convertBreakdownToEUR(breakdown: CostBreakdown): CostBreakdown {
    return {
      fixed: {
        instantly: this.convertToEUR(breakdown.fixed.instantly),
        googleWorkspace: this.convertToEUR(breakdown.fixed.googleWorkspace),
        total: this.convertToEUR(breakdown.fixed.total)
      },
      variable: {
        openRouter: this.convertToEUR(breakdown.variable.openRouter),
        total: this.convertToEUR(breakdown.variable.total)
      },
      total: this.convertToEUR(breakdown.total)
    };
  }

  /**
   * Manual cost adjustment (for corrections)
   */
  async addManualAdjustment(
    amount: number,
    type: 'fixed' | 'variable',
    description: string
  ): Promise<void> {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    try {
      const { data: currentMonth } = await supabase
        .from('monthly_costs')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .single();

      if (!currentMonth) {
        throw new Error('No monthly cost record found');
      }

      const updateData: any = {
        updated_at: new Date()
      };

      if (type === 'variable') {
        updateData.openrouter_cost = currentMonth.openrouter_cost + amount;
      }

      updateData.total_cost = currentMonth.instantly_cost + 
                             currentMonth.google_workspace_cost + 
                             (updateData.openrouter_cost || currentMonth.openrouter_cost);

      await this.updateMonthlyCosts(currentMonth.id, updateData);

      // Log adjustment
      console.log(`Manual cost adjustment: ${type} ${amount} - ${description}`);

    } catch (error) {
      console.error('Failed to add manual adjustment:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const dashboardCostService = new DashboardCostService();