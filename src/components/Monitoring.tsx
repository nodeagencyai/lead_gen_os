import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, CheckCircle, Clock, RefreshCw, Search } from 'lucide-react';
import CampaignToggle from './CampaignToggle';
import { apiClient } from '../utils/apiClient';

interface MonitoringProps {
  onNavigate: (view: 'dashboard' | 'leadfinder' | 'campaigns' | 'leads' | 'integrations' | 'monitoring') => void;
}

interface WorkflowRun {
  id: string;
  workflow: string;
  status: 'success' | 'failed' | 'running';
  started: string;
  duration: string;
  leadsProcessed: number;
  campaign: string;
  errorMessage?: string;
  executionId?: string;
  userId?: string;
  platform: 'Apollo' | 'LinkedIn' | 'Instantly' | 'HeyReach' | 'N8N';
  workflowType: 'lead_scraping' | 'email_sending' | 'linkedin_outreach' | 'data_processing';
}

const Monitoring: React.FC<MonitoringProps> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workflowFilter, setWorkflowFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Real API data states
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [healthData, setHealthData] = useState<any>(null);
  const [recentWorkflows, setRecentWorkflows] = useState<WorkflowRun[]>([]);

  // Fetch real monitoring data
  const fetchMonitoringData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setLoading(true);
      }
      setError(null);

      // Fetch data from all monitoring endpoints in parallel
      const [dashboardResult, healthResult] = await Promise.all([
        apiClient.get('/api/monitoring/dashboard?timeRange=24h'),
        apiClient.get('/api/monitoring/health')
      ]);

      if (dashboardResult.error) {
        const errorMessage = typeof dashboardResult.error === 'string' 
          ? dashboardResult.error 
          : JSON.stringify(dashboardResult.error);
        throw new Error(`Dashboard API: ${errorMessage}`);
      }
      if (healthResult.error) {
        const errorMessage = typeof healthResult.error === 'string' 
          ? healthResult.error 
          : JSON.stringify(healthResult.error);
        throw new Error(`Health API: ${errorMessage}`);
      }

      setDashboardData(dashboardResult.data);
      setHealthData(healthResult.data);
      
      // Check if setup is required
      if (healthResult.data?.status === 'setup_required') {
        setError('Database setup required. Please run the monitoring setup SQL script in your Supabase dashboard.');
      }
      
      // Transform recent activity to workflow format
      if (dashboardResult.data?.recent_activity) {
        const transformedWorkflows = transformRecentActivity(dashboardResult.data.recent_activity);
        setRecentWorkflows(transformedWorkflows);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch monitoring data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load monitoring data');
    } finally {
      setLoading(false);
    }
  };

  // Transform API data to component format
  const transformRecentActivity = (activities: any[]): WorkflowRun[] => {
    return activities.slice(0, 20).map((activity, index) => {
      let status: 'success' | 'failed' | 'running' = 'success';
      let platform: 'Apollo' | 'LinkedIn' | 'Instantly' | 'HeyReach' | 'N8N' = 'N8N';
      let workflowType: 'lead_scraping' | 'email_sending' | 'linkedin_outreach' | 'data_processing' = 'data_processing';

      // Determine status from activity
      if (activity.activity_type === 'error') {
        status = 'failed';
      } else if (activity.severity === 'error') {
        status = 'failed';
      } else if (activity.details?.includes('running') || activity.details?.includes('processing')) {
        status = 'running';
      }

      // Determine platform and workflow type from title
      if (activity.title?.includes('Apollo')) {
        platform = 'Apollo';
        workflowType = 'lead_scraping';
      } else if (activity.title?.includes('LinkedIn') || activity.title?.includes('HeyReach')) {
        platform = 'LinkedIn';
        workflowType = 'linkedin_outreach';
      } else if (activity.title?.includes('Email') || activity.title?.includes('Instantly')) {
        platform = 'Instantly';
        workflowType = 'email_sending';
      }

      return {
        id: `activity-${index}`,
        workflow: activity.title || 'Unknown Workflow',
        status,
        started: formatDateTime(activity.timestamp),
        duration: '—', // Duration removed due to data accuracy issues
        leadsProcessed: activity.metric_value || 0,
        campaign: activity.subtitle || 'Unknown Campaign',
        errorMessage: activity.activity_type === 'error' ? activity.details : undefined,
        executionId: `exec-${index}`,
        platform,
        workflowType
      };
    });
  };

  // Format date and time consistently
  const formatDateTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    
    // Manual formatting for complete consistency
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const hoursStr = String(hours).padStart(2, '0');
    
    return `${month}/${day}/${year} ${hoursStr}:${minutes}:${seconds} ${ampm}`;
  };

  // Calculate metrics from real data
  const systemHealthMetrics = dashboardData ? [
    { 
      title: 'Total Workflows Run', 
      value: (dashboardData.executions?.total || 0).toLocaleString()
    },
    { 
      title: 'System Uptime', 
      value: healthData?.uptime || '99.8%'
    },
    { 
      title: 'Error Rate', 
      value: dashboardData.executions?.total > 0 
        ? `${Math.round((dashboardData.errors?.total / dashboardData.executions.total) * 100 * 100) / 100}%`
        : '0%'
    }
  ] : [
    { title: 'Total Workflows Run', value: '0' },
    { title: 'System Uptime', value: '100%' },
    { title: 'Error Rate', value: '0%' }
  ];

  const workflowMetrics = dashboardData ? [
    { 
      title: 'Apollo Workflows', 
      value: (dashboardData.health?.apollo?.totalExecutions || 0).toLocaleString()
    },
    { 
      title: 'Apollo Success Rate', 
      value: dashboardData.health?.apollo?.totalExecutions > 0
        ? `${Math.round((dashboardData.health.apollo.successfulExecutions / dashboardData.health.apollo.totalExecutions) * 100 * 100) / 100}%`
        : '0%'
    },
    { 
      title: 'LinkedIn Workflows', 
      value: (dashboardData.health?.linkedin?.totalExecutions || 0).toLocaleString()
    },
    { 
      title: 'LinkedIn Success Rate', 
      value: dashboardData.health?.linkedin?.totalExecutions > 0
        ? `${Math.round((dashboardData.health.linkedin.successfulExecutions / dashboardData.health.linkedin.totalExecutions) * 100 * 100) / 100}%`
        : '0%'
    },
    { 
      title: 'Active Errors', 
      value: (dashboardData.errors?.bySeverity?.critical || 0).toString(), 
      isError: true 
    }
  ] : [
    { title: 'Apollo Workflows', value: '0' },
    { title: 'Apollo Success Rate', value: '0%' },
    { title: 'LinkedIn Workflows', value: '0' },
    { title: 'LinkedIn Success Rate', value: '0%' },
    { title: 'Active Errors', value: '0', isError: true }
  ];

  // Initial data fetch and auto-refresh setup
  useEffect(() => {
    fetchMonitoringData();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchMonitoringData();
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Manual refresh function
  const handleRefresh = () => {
    fetchMonitoringData(true);
  };

  // Filter workflows based on search and filters
  const filteredWorkflows = recentWorkflows.filter(workflow => {
    const matchesSearch = workflow.workflow.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.campaign.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.platform.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesWorkflowFilter = workflowFilter === 'All' || workflow.workflowType === workflowFilter;
    const matchesStatusFilter = statusFilter === 'All' || workflow.status === statusFilter;
    
    return matchesSearch && matchesWorkflowFilter && matchesStatusFilter;
  });


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#10b981';
      case 'failed': return '#ef4444';
      case 'running': return '#f59e0b';
      default: return '#888888';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <AlertCircle className="w-4 h-4" />;
      case 'running': return <Clock className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // Show loading screen on initial load
  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="px-6 py-4" style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #333333' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/Node Logo-White.png" 
              alt="Logo" 
              className="h-8 w-auto"
            />
          </div>
          <div className="flex space-x-8">
            <button 
              onClick={() => onNavigate('dashboard')}
              className="transition-colors hover:opacity-80"
              style={{ color: '#888888' }}
            >
              Dashboard
            </button>
            <button 
              onClick={() => onNavigate('leadfinder')}
              className="transition-colors hover:opacity-80"
              style={{ color: '#888888' }}
            >
              Generate
            </button>
            <button 
              onClick={() => onNavigate('leads')}
              className="transition-colors hover:opacity-80"
              style={{ color: '#888888' }}
            >
              Leads
            </button>
            <button 
              onClick={() => onNavigate('campaigns')}
              className="transition-colors hover:opacity-80" 
              style={{ color: '#888888' }}
            >
              Campaigns
            </button>
            <button 
              onClick={() => onNavigate('monitoring')}
              className="transition-colors hover:opacity-80" 
              style={{ color: '#ffffff' }}
            >
              Monitoring
            </button>
            <button 
              onClick={() => onNavigate('integrations')}
              className="transition-colors hover:opacity-80" 
              style={{ color: '#888888' }}
            >
              Settings
            </button>
          </div>
          <div className="flex items-center">
            <CampaignToggle />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#ffffff' }}>
            System Monitoring Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            {lastUpdated && (
              <div className="text-xs" style={{ color: '#888888' }}>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
            <button 
              onClick={handleRefresh}
              disabled={loading}
              className="text-sm px-3 py-1 rounded-full transition-colors hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: '#333333', border: '1px solid #555555', color: '#ffffff' }}
            >
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <div className="text-sm px-3 py-1 rounded-full" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333', color: '#888888' }}>
              N8N Workflows
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#1a1a1a', border: '1px solid #ef4444' }}>
            <div className="font-semibold mb-2" style={{ color: '#ef4444' }}>Error loading monitoring data</div>
            <div className="text-sm" style={{ color: '#ff6b6b' }}>{error}</div>
            {error.includes('500') && (
              <div className="mt-3 text-sm" style={{ color: '#ffa94d' }}>
                <strong>This usually means the monitoring tables haven't been created yet.</strong>
                <br />
                Please run the <code style={{ backgroundColor: '#2a2a2a', padding: '2px 6px', borderRadius: '3px' }}>supabase-monitoring-setup.sql</code> script in your Supabase SQL Editor.
              </div>
            )}
          </div>
        )}

        {/* System Health Analytics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#ffffff' }}>
            System Health Analytics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {systemHealthMetrics.map((metric, index) => (
              <div 
                key={index} 
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
                <div className="text-sm mb-2" style={{ color: '#cccccc' }}>{metric.title}</div>
                <div className="text-2xl font-bold text-white">{metric.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Workflow Performance Metrics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#ffffff' }}>
            Workflow Performance Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {workflowMetrics.map((metric, index) => (
              <div 
                key={index} 
                className="rounded-lg p-6 transition-all duration-200 hover:border-opacity-80"
                style={{ 
                  backgroundColor: '#1a1a1a', 
                  border: metric.isError && parseInt(metric.value) > 0 ? '1px solid #ef4444' : '1px solid #444444' 
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2a2a2a';
                  e.currentTarget.style.borderColor = metric.isError && parseInt(metric.value) > 0 ? '#ef4444' : '#666666';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#1a1a1a';
                  e.currentTarget.style.borderColor = metric.isError && parseInt(metric.value) > 0 ? '#ef4444' : '#444444';
                }}
              >
                <div className="text-sm mb-2" style={{ color: '#cccccc' }}>{metric.title}</div>
                <div className="text-2xl font-bold" style={{ 
                  color: metric.isError && parseInt(metric.value) > 0 ? '#ef4444' : '#ffffff' 
                }}>
                  {metric.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity Table */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold" style={{ color: '#ffffff' }}>
              Recent Workflow Activity
            </h2>
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#888888' }} />
                <input
                  type="text"
                  placeholder="Search workflows..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 rounded-lg focus:outline-none transition-all duration-300"
                  style={{
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #333333',
                    color: '#ffffff',
                    width: '200px'
                  }}
                />
              </div>
              
              {/* Workflow Type Filter */}
              <select
                value={workflowFilter}
                onChange={(e) => setWorkflowFilter(e.target.value)}
                className="px-3 py-2 rounded-lg focus:outline-none transition-all duration-300"
                style={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333333',
                  color: '#ffffff'
                }}
              >
                <option value="All">All Types</option>
                <option value="lead_scraping">Lead Scraping</option>
                <option value="email_sending">Email Sending</option>
                <option value="linkedin_outreach">LinkedIn Outreach</option>
                <option value="data_processing">Data Processing</option>
              </select>
              
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-lg focus:outline-none transition-all duration-300"
                style={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333333',
                  color: '#ffffff'
                }}
              >
                <option value="All">All Status</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="running">Running</option>
              </select>
              
              {/* Auto-refresh Toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                  autoRefresh ? 'text-green-400' : 'text-gray-400'
                }`}
                style={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333333'
                }}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                <span className="text-sm">Auto</span>
              </button>
            </div>
          </div>
          
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#1a1a1a', border: '1px solid #444444' }}>
            <table className="w-full">
              <thead style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #333333' }}>
                <tr>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Workflow</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Platform</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Status</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Started</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkflows.map((workflow, _index) => (
                  <tr 
                    key={workflow.id} 
                    className="transition-colors"
                    style={{ borderTop: '1px solid #444444' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2a2a2a';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td className="p-4">
                      <div>
                        <div className="text-sm text-white font-medium">{workflow.workflow}</div>
                        <div className="text-xs" style={{ color: '#888888' }}>ID: {workflow.executionId}</div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className="text-xs font-medium px-2 py-1 rounded-full"
                        style={{ 
                          backgroundColor: '#333333',
                          color: '#cccccc'
                        }}
                      >
                        {workflow.platform}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <span style={{ color: getStatusColor(workflow.status) }}>
                          {getStatusIcon(workflow.status)}
                        </span>
                        <span
                          className="text-xs font-medium px-2 py-1 rounded-full capitalize"
                          style={{ 
                            backgroundColor: getStatusColor(workflow.status) + '20',
                            color: getStatusColor(workflow.status)
                          }}
                        >
                          {workflow.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm" style={{ color: '#cccccc' }}>{workflow.started}</td>
                    <td className="p-4">
                      {workflow.status === 'failed' && workflow.errorMessage ? (
                        <div className="max-w-xs">
                          <div className="text-xs text-red-400 truncate" title={workflow.errorMessage}>
                            {workflow.errorMessage}
                          </div>
                        </div>
                      ) : workflow.status === 'running' ? (
                        <div className="text-xs" style={{ color: '#f59e0b' }}>
                          Processing...
                        </div>
                      ) : (
                        <div className="text-xs" style={{ color: '#10b981' }}>
                          Completed successfully
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredWorkflows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center" style={{ color: '#888888' }}>
                      {recentWorkflows.length === 0 
                        ? 'No workflow data available. Start sending webhook data from N8N to see activity here.' 
                        : 'No workflows match your current filters.'
                      }
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Activity Summary */}
          <div className="mt-4 flex items-center justify-between text-sm" style={{ color: '#777777' }}>
            <div>
              Showing {filteredWorkflows.length} of {recentWorkflows.length} workflows
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                <span>{filteredWorkflows.filter(w => w.status === 'success').length} Success</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444' }}></div>
                <span>{filteredWorkflows.filter(w => w.status === 'failed').length} Failed</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#f59e0b' }}></div>
                <span>{filteredWorkflows.filter(w => w.status === 'running').length} Running</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm mt-12" style={{ color: '#777777' }}>
          Powered by Node AI
        </div>
      </div>
    </div>
  );
};

export default Monitoring;