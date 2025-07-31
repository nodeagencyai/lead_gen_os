import React, { useState, useEffect } from 'react';
import { Activity, AlertCircle, CheckCircle, Clock, TrendingUp, TrendingDown, RefreshCw, Filter, Search } from 'lucide-react';
import CampaignToggle from './CampaignToggle';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workflowFilter, setWorkflowFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Mock data - replace with real API calls
  const systemHealthMetrics = [
    { title: 'Total Workflows Run', value: '2,847', change: '+23%', positive: true },
    { title: 'System Uptime', value: '99.8%', change: '+0.2%', positive: true },
    { title: 'Error Rate', value: '1.2%', change: '-0.8%', positive: true }
  ];

  const workflowMetrics = [
    { title: 'Apollo Workflows', value: '1,245', change: '+18%', positive: true },
    { title: 'Apollo Success Rate', value: '98.5%', change: '+2.1%', positive: true },
    { title: 'LinkedIn Workflows', value: '1,602', change: '+25%', positive: true },
    { title: 'LinkedIn Success Rate', value: '97.8%', change: '+1.5%', positive: true },
    { title: 'Active Errors', value: '3', change: '-2', positive: true, isError: true }
  ];

  const recentWorkflows: WorkflowRun[] = [
    {
      id: '1',
      workflow: 'Apollo Lead Scraping',
      status: 'success',
      started: '2024-01-26 14:32',
      duration: '2m 45s',
      leadsProcessed: 150,
      campaign: 'Digital Marketing Agencies',
      platform: 'Apollo',
      workflowType: 'lead_scraping',
      executionId: 'exec_001'
    },
    {
      id: '2',
      workflow: 'LinkedIn Outreach',
      status: 'running',
      started: '2024-01-26 14:28',
      duration: '4m 12s',
      leadsProcessed: 89,
      campaign: 'Tech Startup Founders',
      platform: 'HeyReach',
      workflowType: 'linkedin_outreach',
      executionId: 'exec_002'
    },
    {
      id: '3',
      workflow: 'Email Campaign',
      status: 'success',
      started: '2024-01-26 14:15',
      duration: '1m 33s',
      leadsProcessed: 200,
      campaign: 'Creative Agencies',
      platform: 'Instantly',
      workflowType: 'email_sending',
      executionId: 'exec_003'
    },
    {
      id: '4',
      workflow: 'Apollo Lead Scraping',
      status: 'failed',
      started: '2024-01-26 13:58',
      duration: '0m 45s',
      leadsProcessed: 0,
      campaign: 'Recruitment Agencies',
      platform: 'Apollo',
      workflowType: 'lead_scraping',
      executionId: 'exec_004',
      errorMessage: 'API rate limit exceeded. Apollo API returned 429 status code.'
    },
    {
      id: '5',
      workflow: 'LinkedIn Connection',
      status: 'success',
      started: '2024-01-26 13:45',
      duration: '3m 21s',
      leadsProcessed: 75,
      campaign: 'SaaS Decision Makers',
      platform: 'LinkedIn',
      workflowType: 'linkedin_outreach',
      executionId: 'exec_005'
    },
    {
      id: '6',
      workflow: 'Email Validation',
      status: 'failed',
      started: '2024-01-26 13:20',
      duration: '0m 15s',
      leadsProcessed: 0,
      campaign: 'E-commerce Owners',
      platform: 'N8N',
      workflowType: 'data_processing',
      executionId: 'exec_006',
      errorMessage: 'Webhook timeout. N8N workflow did not respond within 30 seconds.'
    },
    {
      id: '7',
      workflow: 'HeyReach Outreach',
      status: 'failed',
      started: '2024-01-26 13:10',
      duration: '1m 05s',
      leadsProcessed: 25,
      campaign: 'Software Engineers',
      platform: 'HeyReach',
      workflowType: 'linkedin_outreach',
      executionId: 'exec_007',
      errorMessage: 'Authentication failed. HeyReach API key expired or invalid.'
    }
  ];

  // Filter workflows based on search and filters
  const filteredWorkflows = recentWorkflows.filter(workflow => {
    const matchesSearch = workflow.workflow.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.campaign.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.platform.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesWorkflowFilter = workflowFilter === 'All' || workflow.workflowType === workflowFilter;
    const matchesStatusFilter = statusFilter === 'All' || workflow.status === statusFilter;
    
    return matchesSearch && matchesWorkflowFilter && matchesStatusFilter;
  });

  // Auto-refresh functionality
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        // In real implementation, this would fetch fresh data
        console.log('Auto-refreshing workflow data...');
      }, 10000); // Refresh every 10 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

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
              onClick={() => onNavigate('integrations')}
              className="transition-colors hover:opacity-80" 
              style={{ color: '#888888' }}
            >
              Integrations
            </button>
            <button 
              onClick={() => onNavigate('monitoring')}
              className="transition-colors hover:opacity-80" 
              style={{ color: '#ffffff' }}
            >
              Monitoring
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
            <button 
              onClick={() => setLoading(true)}
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
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#1a1a1a', border: '1px solid #ef4444', color: '#ef4444' }}>
            Error loading monitoring data: {error}
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
                <div className="text-2xl font-bold mb-2 text-white">{metric.value}</div>
                <div className={`text-sm flex items-center`} style={{ color: metric.positive ? '#10b981' : '#ef4444' }}>
                  {metric.positive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                  {metric.change}
                </div>
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
                <div className="text-2xl font-bold mb-2" style={{ 
                  color: metric.isError && parseInt(metric.value) > 0 ? '#ef4444' : '#ffffff' 
                }}>
                  {metric.value}
                </div>
                <div className={`text-sm flex items-center`} style={{ color: metric.positive ? '#10b981' : '#ef4444' }}>
                  {metric.positive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                  {metric.change}
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
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Duration</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Leads Processed</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Campaign</th>
                  <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredWorkflows.map((workflow, index) => (
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
                    <td className="p-4 text-sm" style={{ color: '#cccccc' }}>{workflow.duration}</td>
                    <td className="p-4 text-sm" style={{ color: '#cccccc' }}>{workflow.leadsProcessed}</td>
                    <td className="p-4 text-sm" style={{ color: '#cccccc' }}>{workflow.campaign}</td>
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