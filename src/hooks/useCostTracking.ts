/**
 * useCostTracking Hook
 * Provides cost tracking functionality to React components
 */

import { useState, useEffect, useCallback } from 'react';
import { costIntegrationService } from '../services/costIntegrationService';

interface CostMetrics {
  costPerEmail: number;
  costPerMeeting: number;
  totalMonthlySpend: number;
  totalTokensUsed: number;
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

interface CostTrackingState {
  metrics: CostMetrics | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export const useCostTracking = () => {
  const [state, setState] = useState<CostTrackingState>({
    metrics: null,
    loading: true,
    error: null,
    lastUpdated: null
  });

  // Fetch cost metrics
  const fetchMetrics = useCallback(async (forceRefresh = false) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const metrics = await costIntegrationService.getDashboardMetrics(forceRefresh);
      
      setState({
        metrics,
        loading: false,
        error: null,
        lastUpdated: new Date()
      });
      
    } catch (error) {
      console.error('Failed to fetch cost metrics:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch cost metrics'
      }));
    }
  }, []);

  // Record activity (email sent or meeting booked)
  const recordActivity = useCallback(async (
    type: 'email_sent' | 'meeting_booked',
    campaignId?: string,
    metadata?: Record<string, any>
  ) => {
    try {
      await costIntegrationService.recordActivity(type, campaignId, metadata);
      
      // Refresh metrics after recording activity
      await fetchMetrics(true);
      
    } catch (error) {
      console.error('Failed to record activity:', error);
      // Don't update error state for activity recording failures
    }
  }, [fetchMetrics]);

  // Get formatted cost display
  const formatCost = useCallback((amount: number, currency = '€'): string => {
    return costIntegrationService.formatCost(amount, currency);
  }, []);

  // Get cost efficiency score
  const getCostEfficiencyScore = useCallback((): number => {
    if (!state.metrics) return 0;
    return costIntegrationService.getCostEfficiencyScore(state.metrics);
  }, [state.metrics]);

  // Check if cost alert should be shown
  const shouldShowCostAlert = useCallback((): boolean => {
    if (!state.metrics) return false;
    return costIntegrationService.shouldShowCostAlert(state.metrics);
  }, [state.metrics]);

  // Initial fetch
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMetrics();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [fetchMetrics]);

  return {
    // State
    metrics: state.metrics,
    loading: state.loading,
    error: state.error,
    lastUpdated: state.lastUpdated,
    
    // Actions
    fetchMetrics,
    recordActivity,
    
    // Utilities
    formatCost,
    getCostEfficiencyScore,
    shouldShowCostAlert,
    
    // Quick access to common metrics
    costPerEmail: state.metrics?.costPerEmail || 0,
    costPerMeeting: state.metrics?.costPerMeeting || 0,
    totalMonthlySpend: state.metrics?.totalMonthlySpend || 0,
    emailsSent: state.metrics?.emailsSent || 0,
    meetingsBooked: state.metrics?.meetingsBooked || 0
  };
};