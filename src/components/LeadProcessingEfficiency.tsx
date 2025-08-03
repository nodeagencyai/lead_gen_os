/**
 * Lead Processing Efficiency Component
 * Shows the relationship between AI personalization costs and campaign results
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Target } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

interface LeadProcessingAnalysis {
  totalLeadsProcessed: number;
  totalPersonalizationCost: number;
  totalWastedCost: number;
  campaignBreakdown: Array<{
    campaignId: string;
    totalPersonalizationCost: number;
    leadsProcessed: number;
    leadsActuallySent: number;
    meetingsBooked: number;
    wastedCost: number;
  }>;
}

export const LeadProcessingEfficiency: React.FC = () => {
  const [analysis, setAnalysis] = useState<LeadProcessingAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timePeriod, setTimePeriod] = useState(30);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/api/costs/lead-processing-analysis', {
        params: { days: timePeriod }
      });

      if (response.data?.success) {
        setAnalysis(response.data.data.analysis);
      } else {
        setError('Failed to fetch lead processing analysis');
      }
    } catch (err) {
      console.error('Failed to fetch lead processing analysis:', err);
      setError('Failed to load analysis data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [timePeriod]);

  const formatCost = (amount: number): string => {
    if (amount === 0) return '€0.00';
    if (amount < 0.01) return '<€0.01';
    return `€${amount.toFixed(2)}`;
  };

  const formatPercent = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  const getEfficiencyColor = (percentage: number): string => {
    if (percentage >= 80) return '#10b981'; // Green
    if (percentage >= 60) return '#D97706'; // Amber
    return '#DC2626'; // Red
  };

  const calculateSendRate = (sent: number, processed: number): number => {
    return processed > 0 ? (sent / processed) * 100 : 0;
  };

  const calculateConversionRate = (meetings: number, sent: number): number => {
    return sent > 0 ? (meetings / sent) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="rounded-lg p-6" style={{ backgroundColor: '#1a1a1a', border: '1px solid #444444' }}>
        <div className="flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-gray-600 border-t-white rounded-full animate-spin mr-3"></div>
          <span style={{ color: '#888888' }}>Loading lead processing analysis...</span>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="rounded-lg p-6" style={{ backgroundColor: '#1a1a1a', border: '1px solid #444444' }}>
        <div className="text-center" style={{ color: '#ef4444' }}>
          <AlertTriangle className="w-6 h-6 mx-auto mb-2" />
          <p>{error || 'No analysis data available'}</p>
        </div>
      </div>
    );
  }

  const overallSendRate = analysis.campaignBreakdown.reduce((acc, campaign) => {
    return acc + campaign.leadsProcessed;
  }, 0) > 0 ? 
    (analysis.campaignBreakdown.reduce((acc, campaign) => acc + campaign.leadsActuallySent, 0) / 
     analysis.campaignBreakdown.reduce((acc, campaign) => acc + campaign.leadsProcessed, 0)) * 100 : 0;

  const wastePercentage = analysis.totalPersonalizationCost > 0 ? 
    (analysis.totalWastedCost / analysis.totalPersonalizationCost) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Time Period Selector */}
      <div className="flex space-x-1 rounded-lg p-1 w-fit" style={{ backgroundColor: '#333333', border: '1px solid #555555' }}>
        {[7, 30, 90].map((days) => (
          <button 
            key={days}
            onClick={() => setTimePeriod(days)}
            className="px-3 py-1 text-sm transition-colors rounded-md hover:opacity-80"
            style={{ 
              backgroundColor: timePeriod === days ? '#555555' : 'transparent',
              color: timePeriod === days ? '#ffffff' : '#aaaaaa',
              border: timePeriod === days ? '1px solid #777777' : '1px solid transparent'
            }}
          >
            {days}d
          </button>
        ))}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Personalization Cost */}
        <div 
          className="rounded-lg p-4 transition-all duration-200"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #444444' }}
        >
          <div className="text-sm mb-1" style={{ color: '#cccccc' }}>AI Personalization Cost</div>
          <div className="text-xl font-bold text-white">{formatCost(analysis.totalPersonalizationCost)}</div>
          <div className="text-xs" style={{ color: '#888888' }}>
            {analysis.totalLeadsProcessed} leads processed
          </div>
        </div>

        {/* Send Rate */}
        <div 
          className="rounded-lg p-4 transition-all duration-200"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #444444' }}
        >
          <div className="text-sm mb-1" style={{ color: '#cccccc' }}>Send Rate</div>
          <div className="text-xl font-bold text-white">{formatPercent(overallSendRate)}</div>
          <div className="text-xs flex items-center" style={{ color: getEfficiencyColor(overallSendRate) }}>
            {overallSendRate >= 80 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {overallSendRate >= 80 ? 'Excellent' : overallSendRate >= 60 ? 'Good' : 'Needs improvement'}
          </div>
        </div>

        {/* Wasted Cost */}
        <div 
          className="rounded-lg p-4 transition-all duration-200"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #444444' }}
        >
          <div className="text-sm mb-1" style={{ color: '#cccccc' }}>Wasted Personalization</div>
          <div className="text-xl font-bold text-white">{formatCost(analysis.totalWastedCost)}</div>
          <div className="text-xs" style={{ color: wastePercentage > 20 ? '#DC2626' : '#888888' }}>
            {formatPercent(wastePercentage)} of total cost
          </div>
        </div>

        {/* Cost per Sent */}
        <div 
          className="rounded-lg p-4 transition-all duration-200"
          style={{ backgroundColor: '#1a1a1a', border: '1px solid #444444' }}
        >
          <div className="text-sm mb-1" style={{ color: '#cccccc' }}>Cost per Email Sent</div>
          <div className="text-xl font-bold text-white">
            {formatCost(analysis.campaignBreakdown.reduce((acc, c) => acc + c.leadsActuallySent, 0) > 0 ?
              analysis.totalPersonalizationCost / analysis.campaignBreakdown.reduce((acc, c) => acc + c.leadsActuallySent, 0) : 0)}
          </div>
          <div className="text-xs" style={{ color: '#888888' }}>
            AI personalization only
          </div>
        </div>
      </div>

      {/* Campaign Breakdown */}
      {analysis.campaignBreakdown.length > 0 && (
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#1a1a1a', border: '1px solid #444444' }}>
          <div className="p-4 border-b border-gray-600">
            <h3 className="text-lg font-semibold text-white">Campaign Efficiency Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ backgroundColor: '#2a2a2a' }}>
                <tr>
                  <th className="text-left p-3 text-sm font-medium" style={{ color: '#cccccc' }}>Campaign</th>
                  <th className="text-left p-3 text-sm font-medium" style={{ color: '#cccccc' }}>Processed</th>
                  <th className="text-left p-3 text-sm font-medium" style={{ color: '#cccccc' }}>Sent</th>
                  <th className="text-left p-3 text-sm font-medium" style={{ color: '#cccccc' }}>Meetings</th>
                  <th className="text-left p-3 text-sm font-medium" style={{ color: '#cccccc' }}>Send Rate</th>
                  <th className="text-left p-3 text-sm font-medium" style={{ color: '#cccccc' }}>AI Cost</th>
                  <th className="text-left p-3 text-sm font-medium" style={{ color: '#cccccc' }}>Wasted</th>
                </tr>
              </thead>
              <tbody>
                {analysis.campaignBreakdown.map((campaign, index) => {
                  const sendRate = calculateSendRate(campaign.leadsActuallySent, campaign.leadsProcessed);
                  const conversionRate = calculateConversionRate(campaign.meetingsBooked, campaign.leadsActuallySent);
                  
                  return (
                    <tr 
                      key={index}
                      className="transition-colors hover:bg-gray-800"
                      style={{ borderTop: '1px solid #444444' }}
                    >
                      <td className="p-3 text-sm text-white">
                        <div className="flex items-center">
                          <Target className="w-4 h-4 mr-2" style={{ color: '#888888' }} />
                          {campaign.campaignId}
                        </div>
                      </td>
                      <td className="p-3 text-sm" style={{ color: '#cccccc' }}>
                        {campaign.leadsProcessed}
                      </td>
                      <td className="p-3 text-sm" style={{ color: '#cccccc' }}>
                        {campaign.leadsActuallySent}
                      </td>
                      <td className="p-3 text-sm" style={{ color: '#cccccc' }}>
                        {campaign.meetingsBooked}
                      </td>
                      <td className="p-3 text-sm" style={{ color: getEfficiencyColor(sendRate) }}>
                        {formatPercent(sendRate)}
                      </td>
                      <td className="p-3 text-sm" style={{ color: '#cccccc' }}>
                        {formatCost(campaign.totalPersonalizationCost)}
                      </td>
                      <td className="p-3 text-sm" style={{ color: campaign.wastedCost > 0 ? '#DC2626' : '#cccccc' }}>
                        {formatCost(campaign.wastedCost)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};