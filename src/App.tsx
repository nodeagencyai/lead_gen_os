import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Search, LogOut } from 'lucide-react';
import LeadFinder from './components/LeadFinder.tsx';
import LeadsDatabase from './components/LeadsDatabase';
import CampaignsOverview from './components/CampaignsOverview';
import IntegrationSetup from './components/IntegrationSetup';
import AdminLogin from './components/AdminLogin';
import CampaignToggle from './components/CampaignToggle';
import PerformanceChart from './components/PerformanceChart';
import { DebugPanel } from './components/DebugPanel';
import { useCampaignStore } from './store/campaignStore';
import { useRealTimeData } from './hooks/useRealTimeData';
import { useChartData } from './hooks/useChartData';
import { useAdminAuth } from './hooks/useAdminAuth';
import { getChartLabels, getEfficiencyMetrics } from './data/campaignData';

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'leadfinder' | 'campaigns' | 'leads' | 'integrations'>('dashboard');
  const { isAuthenticated, isLoading, authenticate, logout } = useAdminAuth();
  const { mode } = useCampaignStore();
  const { emailMetrics, linkedinMetrics, campaigns, leads, loading, error, forceRefresh } = useRealTimeData();
  const { chart1, chart2, loading: chartLoading, error: chartError, refetch: refetchCharts } = useChartData();

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg" style={{ color: '#888888' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Show admin login if not authenticated
  if (!isAuthenticated) {
    return <AdminLogin onAuthenticated={authenticate} />;
  }

  // Get chart labels and efficiency metrics based on current mode and real data
  const efficiencyMetrics = getEfficiencyMetrics(mode, emailMetrics, linkedinMetrics);

  // Convert real-time data to display format
  const keyMetrics = mode === 'email' ? [
    { title: 'Emails Sent', value: emailMetrics.sent.toLocaleString(), change: '0%', positive: true },
    { title: 'Emails Opened', value: emailMetrics.opened.toLocaleString(), change: '0%', positive: true },
    { title: 'Email Replies', value: emailMetrics.replied.toLocaleString(), change: '0%', positive: true },
    { title: 'Meetings Booked', value: emailMetrics.meetings.toLocaleString(), change: '0%', positive: true },
    { title: 'Bounce Rate', value: `${emailMetrics.bounceRate}%`, change: '0%', positive: true }
  ] : [
    { title: 'Connection Requests', value: linkedinMetrics.connectionRequests.toLocaleString(), change: '0%', positive: true },
    { title: 'Connections Accepted', value: linkedinMetrics.connectionsAccepted.toLocaleString(), change: '0%', positive: true },
    { title: 'Messages Sent', value: linkedinMetrics.messagesSent.toLocaleString(), change: '0%', positive: true },
    { title: 'Message Replies', value: linkedinMetrics.messageReplies.toLocaleString(), change: '0%', positive: true },
    { title: 'Meetings Booked', value: linkedinMetrics.meetings.toLocaleString(), change: '0%', positive: true }
  ];

  const ChartSVG = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 400 100" fill="none">
      <path
        d="M10 80 L50 60 L90 70 L130 45 L170 55 L210 40 L250 65 L290 30 L330 40 L370 25"
        stroke="#888888"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );

  if (currentView === 'leadfinder') {
    return <LeadFinder onNavigate={setCurrentView} />;
  }

  if (currentView === 'leads') {
    return <LeadsDatabase onNavigate={setCurrentView} />;
  }

  if (currentView === 'campaigns') {
    return <CampaignsOverview onNavigate={setCurrentView} />;
  }

  if (currentView === 'integrations') {
    return <IntegrationSetup onNavigate={setCurrentView} />;
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
              onClick={() => setCurrentView('dashboard')}
              className="transition-colors hover:opacity-80"
             style={{ color: currentView === 'dashboard' ? '#ffffff' : '#888888' }}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setCurrentView('leadfinder')}
              className="transition-colors hover:opacity-80"
             style={{ color: currentView === 'leadfinder' ? '#ffffff' : '#888888' }}
            >
              Generate
            </button>
            <button 
              onClick={() => setCurrentView('leads')}
              className="transition-colors hover:opacity-80"
              style={{ color: currentView === 'leads' ? '#ffffff' : '#888888' }}
            >
              Leads
            </button>
            <button 
              onClick={() => setCurrentView('campaigns')}
              className="transition-colors hover:opacity-80" 
             style={{ color: currentView === 'campaigns' ? '#ffffff' : '#888888' }}
            >
              Campaigns
            </button>
            <button 
              onClick={() => setCurrentView('integrations')}
              className="transition-colors hover:opacity-80" 
             style={{ color: currentView === 'integrations' ? '#ffffff' : '#888888' }}
            >
              Integrations
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <CampaignToggle />
            <button
              onClick={logout}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors hover:opacity-80"
              style={{ 
                backgroundColor: '#333333', 
                border: '1px solid #555555', 
                color: '#ffffff' 
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#444444';
                e.currentTarget.style.borderColor = '#666666';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#333333';
                e.currentTarget.style.borderColor = '#555555';
              }}
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold" style={{ color: '#ffffff' }}>
            {mode === 'email' ? 'Email Campaign Dashboard' : 'LinkedIn Campaign Dashboard'}
          </h1>
          <div className="flex items-center space-x-4">
            <button 
              onClick={forceRefresh}
              disabled={loading}
              className="text-sm px-3 py-1 rounded-full transition-colors hover:opacity-80 disabled:opacity-50"
              style={{ backgroundColor: '#333333', border: '1px solid #555555', color: '#ffffff' }}
            >
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
            <div className="text-sm px-3 py-1 rounded-full" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333', color: '#888888' }}>
              {mode === 'email' ? 'Apollo + Instantly' : 'Sales Navigator + HeyReach'}
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#1a1a1a', border: '1px solid #ef4444', color: '#ef4444' }}>
            Error loading real-time data: {error}
          </div>
        )}

        {/* Key Metrics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#ffffff' }}>
            {mode === 'email' ? 'Email Campaign Metrics' : 'LinkedIn Campaign Metrics'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {keyMetrics.map((metric, index) => (
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

        {/* Performance Trends */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#ffffff' }}>Performance Trends</h2>
          
          {/* Time Period Tabs */}
          <div className="flex space-x-1 mb-6 rounded-lg p-1 w-fit" style={{ backgroundColor: '#333333', border: '1px solid #555555' }}>
            <button 
              className="px-4 py-2 text-sm transition-colors rounded-md hover:opacity-80"
              style={{ color: '#aaaaaa' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#555555';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#aaaaaa';
              }}
            >
              Last 7 Days
            </button>
            <button 
              className="px-4 py-2 text-sm rounded-md"
              style={{ backgroundColor: '#555555', color: '#ffffff', border: '1px solid #777777' }}
            >
              Last 30 Days
            </button>
            <button 
              className="px-4 py-2 text-sm transition-colors rounded-md hover:opacity-80"
              style={{ color: '#aaaaaa' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#555555';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#aaaaaa';
              }}
            >
              Last 90 Days
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PerformanceChart
              title={chart1.title}
              data={chart1.data}
              totalValue={chart1.totalValue}
              changePercent={chart1.changePercent}
              isPositive={true}
              color="#888888"
            />
            
            <PerformanceChart
              title={chart2.title}
              data={chart2.data}
              totalValue={chart2.totalValue}
              changePercent={chart2.changePercent}
              isPositive={true}
              color="#888888"
            />
          </div>
        </div>

        {/* Efficiency Metrics */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#ffffff' }}>
            {mode === 'email' ? 'Email Performance Metrics' : 'LinkedIn Performance Metrics'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {efficiencyMetrics.map((metric, index) => (
              <div 
                key={index} 
                className="rounded-lg p-6 transition-all duration-200"
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

        {/* Campaigns Overview */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#ffffff' }}>Campaigns Overview</h2>
          <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#1a1a1a', border: '1px solid #444444' }}>
            <table className="w-full">
              <thead style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #333333' }}>
                <tr>
                  {(mode === 'email' ? ['Campaign Name', 'Emails Sent', 'Replies', 'Meetings', 'Reply Rate'] : ['Campaign Name', 'Connections', 'Replies', 'Meetings', 'Response Rate']).map((header, index) => (
                    <th key={index} className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.slice(0, 5).map((campaign, index) => (
                  <tr 
                    key={index} 
                    className="transition-colors"
                    style={{ borderTop: '1px solid #444444' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2a2a2a';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td className="p-4 text-sm text-white">{campaign.name}</td>
                    <td className="p-4 text-sm" style={{ color: '#cccccc' }}>{campaign.leads || campaign.sent || 0}</td>
                    <td className="p-4 text-sm" style={{ color: '#cccccc' }}>{campaign.responses || campaign.replies || 0}</td>
                    <td className="p-4 text-sm" style={{ color: '#cccccc' }}>{campaign.conversions || campaign.meetings || 0}</td>
                    <td className="p-4 text-sm" style={{ color: '#cccccc' }}>{campaign.rate || '0%'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm mt-12" style={{ color: '#777777' }}>
          Powered by Node AI
        </div>
      </div>

      {/* Debug Panel - Only show in development or when needed */}
      <DebugPanel />
    </div>
  );
}

export default App;