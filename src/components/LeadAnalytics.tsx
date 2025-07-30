import React from 'react';
import { TrendingUp, Users, CheckCircle, Target, RefreshCw } from 'lucide-react';
import { useLeadAnalytics } from '../hooks/useLeadAnalytics';
import { useCampaignStore } from '../store/campaignStore';

interface AnalyticsCardProps {
  title: string;
  value: string;
  subtitle: string;
  change: string;
  icon: React.ReactNode;
  loading?: boolean;
}

const AnalyticsCard: React.FC<AnalyticsCardProps> = ({
  title,
  value,
  subtitle,
  change,
  icon,
  loading = false
}) => {
  if (loading) {
    return (
      <div 
        className="rounded-lg p-6 transition-all duration-200"
        style={{ 
          backgroundColor: '#1a1a1a', 
          border: '1px solid #444444' 
        }}
      >
        {/* Skeleton loader */}
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 bg-gray-600 rounded w-24"></div>
            <div className="h-5 w-5 bg-gray-600 rounded"></div>
          </div>
          <div className="h-8 bg-gray-600 rounded w-16 mb-2"></div>
          <div className="h-4 bg-gray-600 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-600 rounded w-20"></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="rounded-lg p-6 transition-all duration-200 hover:border-opacity-80"
      style={{ 
        backgroundColor: '#1a1a1a', 
        border: '1px solid #444444' 
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#2a2a2a';
        e.currentTarget.style.borderColor = '#666666';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = '#1a1a1a';
        e.currentTarget.style.borderColor = '#444444';
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium" style={{ color: '#cccccc' }}>{title}</div>
        <div style={{ color: '#888888' }}>{icon}</div>
      </div>
      
      <div className="text-3xl font-bold mb-2 text-white">{value}</div>
      
      <div className="text-sm mb-3" style={{ color: '#999999' }}>{subtitle}</div>
      
      <div className="flex items-center text-sm" style={{ color: '#10b981' }}>
        <TrendingUp className="w-4 h-4 mr-1" />
        {change}
      </div>
    </div>
  );
};

const LeadAnalytics: React.FC = () => {
  const { mode } = useCampaignStore();
  const { analytics, loading, isRefreshing, error, refetch } = useLeadAnalytics(mode);

  // Only show error if we don't have any data AND we're not loading initially
  if (error && !analytics && !loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold" style={{ color: '#ffffff' }}>
            Lead Analytics ({mode === 'email' ? 'Apollo' : 'LinkedIn'})
          </h2>
          <button
            onClick={refetch}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors hover:opacity-80"
            style={{ 
              backgroundColor: '#333333', 
              border: '1px solid #555555', 
              color: '#ffffff' 
            }}
          >
            <RefreshCw className="w-4 h-4" />
            <span className="text-sm">Retry</span>
          </button>
        </div>
        <div 
          className="rounded-lg p-6 text-center"
          style={{ 
            backgroundColor: '#1a1a1a', 
            border: '1px solid #ef4444',
            color: '#ef4444' 
          }}
        >
          <p className="text-sm font-medium">Failed to load {mode === 'email' ? 'Apollo' : 'LinkedIn'} lead analytics</p>
          <p className="text-xs mt-2" style={{ color: '#999999' }}>{error}</p>
          <p className="text-xs mt-2" style={{ color: '#777777' }}>
            Make sure the {mode === 'email' ? 'Apollo' : 'LinkedIn'} table exists in your Supabase database
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold" style={{ color: '#ffffff' }}>
          Lead Analytics ({mode === 'email' ? 'Apollo' : 'LinkedIn'})
        </h2>
        {!loading && (
          <button
            onClick={refetch}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors hover:opacity-80 disabled:opacity-50"
            style={{ 
              backgroundColor: '#333333', 
              border: '1px solid #555555', 
              color: '#ffffff' 
            }}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Leads Card */}
        <AnalyticsCard
          title="Total Leads"
          value={analytics?.totalLeads.toLocaleString() || "0"}
          subtitle="All time"
          change={`+${analytics?.growth.totalLeadsChange || 0}% this month`}
          icon={<Users className="w-5 h-5" />}
          loading={loading && !analytics} // Only show loading if we have no data
        />

        {/* Profile Coverage Card */}
        <AnalyticsCard
          title="Profile Coverage"
          value={`${analytics?.profileCoverage.percentage || 0}%`}
          subtitle={`${analytics?.profileCoverage.completed || 0} of ${analytics?.profileCoverage.total || 0} leads`}
          change={`+${analytics?.growth.profileCoverageChange || 0}% this month`}
          icon={<CheckCircle className="w-5 h-5" />}
          loading={loading && !analytics} // Only show loading if we have no data
        />

        {/* Personalization Rate Card */}
        <AnalyticsCard
          title="Personalization Rate"
          value={`${analytics?.personalizationRate.percentage || 0}%`}
          subtitle={`${analytics?.personalizationRate.personalized || 0} with hooks/icebreakers`}
          change={`+${analytics?.growth.personalizationChange || 0}% this month`}
          icon={<Target className="w-5 h-5" />}
          loading={loading && !analytics} // Only show loading if we have no data
        />
      </div>
    </div>
  );
};

export default LeadAnalytics;