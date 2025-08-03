import { useState } from 'react';
import { TrendingUp, TrendingDown, LogOut, Users, CheckCircle, Target } from 'lucide-react';
import LeadFinder from './components/LeadFinder.tsx';
import LeadsDatabase from './components/LeadsDatabase';
import CampaignsOverview from './components/CampaignsOverview';
import IntegrationSetup from './components/IntegrationSetup';
import Monitoring from './components/Monitoring';
import AdminLogin from './components/AdminLogin';
import CampaignToggle from './components/CampaignToggle';
import PerformanceChart from './components/PerformanceChart';
import { DebugPanel } from './components/DebugPanel';
import { useCampaignStore } from './store/campaignStore';
import { useRealTimeData } from './hooks/useRealTimeData';
import { useChartData } from './hooks/useChartData';
import { useAdminAuth } from './hooks/useAdminAuth';
import { useCostTracking } from './hooks/useCostTracking';
import { getEfficiencyMetrics } from './data/campaignData';
import { getStatusColor } from './config/campaignColors';

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'leadfinder' | 'campaigns' | 'leads' | 'integrations' | 'monitoring'>('dashboard');
  const { isAuthenticated, isLoading, authenticate, logout } = useAdminAuth();
  const { mode } = useCampaignStore();
  const { emailMetrics, linkedinMetrics, leadAnalytics, campaigns, loading, error, forceRefresh } = useRealTimeData();
  const { chart1, chart2, timePeriod, setTimePeriod } = useChartData();
  const { 
    metrics: costMetrics, 
    loading: costLoading, 
    formatCost,
    shouldShowCostAlert
  } = useCostTracking();

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
    { 
      title: 'Emails Sent', 
      value: emailMetrics.sent.toLocaleString(), 
      change: `${(emailMetrics as any).changes?.sent || 0}%`, 
      positive: Number((emailMetrics as any).changes?.sent || 0) >= 0 
    },
    { 
      title: 'Emails Opened', 
      value: emailMetrics.opened.toLocaleString(), 
      change: `${emailMetrics.changes?.unique_opened || 0}%`, 
      positive: Number(emailMetrics.changes?.unique_opened || 0) >= 0 
    },
    { 
      title: 'Email Replies', 
      value: emailMetrics.replied.toLocaleString(), 
      change: `${emailMetrics.changes?.unique_replies || 0}%`, 
      positive: Number(emailMetrics.changes?.unique_replies || 0) >= 0 
    },
    { 
      title: 'Open Rate', 
      value: `${emailMetrics.openRate || 0}%`, 
      change: `${emailMetrics.changes?.unique_opened || 0}%`, 
      positive: Number(emailMetrics.changes?.unique_opened || 0) >= 0 
    },
    { 
      title: 'Bounce Rate', 
      value: `${emailMetrics.bounceRate}%`, 
      change: `${emailMetrics.changes?.bounce_rate || 0}%`, 
      positive: Number(emailMetrics.changes?.bounce_rate || 0) <= 0 // Lower bounce rate is positive
    }
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

  if (currentView === 'monitoring') {
    return <Monitoring onNavigate={setCurrentView} />;
  }

  // MINIMALISTIC SPINNER - Clean UI without text
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
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
              onClick={() => setCurrentView('monitoring')}
              className="transition-colors hover:opacity-80" 
             style={{ color: currentView === 'monitoring' ? '#ffffff' : '#888888' }}
            >
              Monitoring
            </button>
            <button 
              onClick={() => setCurrentView('integrations')}
              className="transition-colors hover:opacity-80" 
             style={{ color: currentView === 'integrations' ? '#ffffff' : '#888888' }}
            >
              Settings
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
            <button
              onClick={() => {
                if (mode === 'email') {
                  window.open('https://app.instantly.ai/app/campaigns', '_blank');
                } else if (mode === 'linkedin') {
                  window.open('https://app.heyreach.io/app/dashboard', '_blank');
                }
              }}
              className="text-sm px-3 py-1 rounded-full transition-all duration-200 hover:opacity-80"
              style={{ 
                backgroundColor: '#1a1a1a', 
                border: '1px solid #333333', 
                color: '#888888',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#555555';
                e.currentTarget.style.backgroundColor = '#2a2a2a';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#333333';
                e.currentTarget.style.backgroundColor = '#1a1a1a';
              }}
            >
              {mode === 'email' ? 'Go to Instantly' : 'Go to HeyReach'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: '#1a1a1a', border: '1px solid #ef4444', color: '#ef4444' }}>
            Error loading real-time data: {error}
          </div>
        )}

        {/* Lead Analytics - NO SKELETON LOADING, shows complete data */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#ffffff' }}>
            Lead Analytics
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Leads Card */}
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
                <div className="text-sm font-medium" style={{ color: '#cccccc' }}>Total Leads</div>
                <div style={{ color: '#888888' }}><Users className="w-5 h-5" /></div>
              </div>
              <div className="text-3xl font-bold mb-2 text-white">{leadAnalytics.totalLeads.toLocaleString()}</div>
              <div className="text-sm mb-3" style={{ color: '#999999' }}>All time</div>
            </div>

            {/* Profile Coverage Card */}
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
                <div className="text-sm font-medium" style={{ color: '#cccccc' }}>Profile Coverage</div>
                <div style={{ color: '#888888' }}><CheckCircle className="w-5 h-5" /></div>
              </div>
              <div className="text-3xl font-bold mb-2 text-white">{leadAnalytics.profileCoverage.percentage}%</div>
              <div className="text-sm mb-3" style={{ color: '#999999' }}>{leadAnalytics.profileCoverage.completed} of {leadAnalytics.profileCoverage.total} leads</div>
            </div>

            {/* Personalization Rate Card */}
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
                <div className="text-sm font-medium" style={{ color: '#cccccc' }}>Personalization Rate</div>
                <div style={{ color: '#888888' }}><Target className="w-5 h-5" /></div>
              </div>
              <div className="text-3xl font-bold mb-2 text-white">{leadAnalytics.personalizationRate.percentage}%</div>
              <div className="text-sm mb-3" style={{ color: '#999999' }}>{leadAnalytics.personalizationRate.personalized} with hooks/icebreakers</div>
            </div>
          </div>
        </div>

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
            {[7, 30, 90].map((days) => (
              <button 
                key={days}
                onClick={() => setTimePeriod(days)}
                className="px-4 py-2 text-sm transition-colors rounded-md hover:opacity-80"
                style={{ 
                  backgroundColor: timePeriod === days ? '#555555' : 'transparent',
                  color: timePeriod === days ? '#ffffff' : '#aaaaaa',
                  border: timePeriod === days ? '1px solid #777777' : '1px solid transparent'
                }}
                onMouseEnter={(e) => {
                  if (timePeriod !== days) {
                    e.currentTarget.style.backgroundColor = '#444444';
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
                onMouseLeave={(e) => {
                  if (timePeriod !== days) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#aaaaaa';
                  }
                }}
              >
                Last {days} Days
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PerformanceChart
              title={chart1.title}
              data={chart1.data}
              totalValue={chart1.totalValue}
              changePercent={chart1.changePercent}
              isPositive={true}
              color="#5BB0FF"
              timePeriod={timePeriod}
            />
            
            <PerformanceChart
              title={chart2.title}
              data={chart2.data}
              totalValue={chart2.totalValue}
              changePercent={chart2.changePercent}
              isPositive={true}
              color="#10b981"
              timePeriod={timePeriod}
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

        {/* Cost Metrics */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold" style={{ color: '#ffffff' }}>
              Cost Metrics
            </h2>
            {shouldShowCostAlert() && (
              <div className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: '#DC262620', color: '#DC2626', border: '1px solid #DC2626' }}>
                ⚠️ Monthly budget exceeded
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Cost per Email - Fixed costs only */}
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
              <div className="text-sm mb-2" style={{ color: '#cccccc' }}>Cost per Email</div>
              <div className="text-2xl font-bold mb-2 text-white">
                {costLoading ? '...' : emailMetrics.sent > 0 ? formatCost(123 / emailMetrics.sent) : '€0.00'}
              </div>
              <div className="text-xs" style={{ color: '#888888' }}>
                Total: {emailMetrics.sent.toLocaleString()} emails sent (Instantly)
              </div>
            </div>

            {/* OpenRouter Spend */}
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
              <div className="text-sm mb-2" style={{ color: '#cccccc' }}>OpenRouter Spend</div>
              <div className="text-2xl font-bold mb-2 text-white">
                {costLoading ? '...' : formatCost(costMetrics?.costBreakdown?.variable?.total || 0)}
              </div>
              <div className="text-xs" style={{ color: '#888888' }}>
                This month's token costs
              </div>
            </div>

            {/* Token Consumption */}
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
              <div className="text-sm mb-2" style={{ color: '#cccccc' }}>Token Consumption</div>
              <div className="text-2xl font-bold mb-2 text-white">
                {costLoading ? '...' : (costMetrics?.totalTokensUsed || 0).toLocaleString()}
              </div>
              <div className="text-xs" style={{ color: '#888888' }}>
                Total tokens used this month
              </div>
            </div>

            {/* Monthly Fixed Costs */}
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
              <div className="text-sm mb-2" style={{ color: '#cccccc' }}>Monthly Fixed Costs</div>
              <div className="text-2xl font-bold mb-2 text-white">
                €125.00
              </div>
              <div className="text-xs" style={{ color: '#888888' }}>
                Instantly: €75 • Google: €50
              </div>
            </div>
          </div>
        </div>

        {/* Campaigns Overview */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4" style={{ color: '#ffffff' }}>Campaigns Overview</h2>
          {loading ? (
            <div className="rounded-lg p-8 text-center" style={{ backgroundColor: '#1a1a1a', border: '1px solid #444444' }}>
              <div className="flex items-center justify-center space-x-3">
                <div className="w-5 h-5 border-2 border-gray-600 border-t-white rounded-full animate-spin"></div>
                <span style={{ color: '#888888' }}>Loading campaigns...</span>
              </div>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="rounded-lg p-8 text-center" style={{ backgroundColor: '#1a1a1a', border: '1px solid #444444' }}>
              <p className="text-base mb-4" style={{ color: '#888888' }}>
                No campaigns found. Create your first campaign to see analytics here.
              </p>
              <button
                onClick={() => setCurrentView('campaigns')}
                className="px-4 py-2 rounded-lg transition-all duration-200 hover:opacity-80"
                style={{ backgroundColor: '#0A2540', border: '1px solid #082030', color: '#5BB0FF' }}
              >
                Go to Campaigns
              </button>
            </div>
          ) : (
            <>
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
                {campaigns.slice(0, 5).map((campaign: any, index: number) => (
                  <tr 
                    key={index} 
                    className="transition-colors cursor-pointer"
                    style={{ borderTop: '1px solid #444444' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2a2a2a';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    onClick={() => setCurrentView('campaigns')}
                  >
                    <td className="p-4 text-sm text-white flex items-center">
                      <div 
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: getStatusColor(campaign.status || 'Draft') }}
                      />
                      {campaign.name}
                    </td>
                    <td className="p-4 text-sm" style={{ color: '#cccccc' }}>
                      {campaign.sent || campaign.emailsSent || 0}
                    </td>
                    <td className="p-4 text-sm" style={{ color: '#cccccc' }}>
                      {campaign.replies || 0}
                    </td>
                    <td className="p-4 text-sm" style={{ color: '#cccccc' }}>
                      {campaign.meetings || 0}
                    </td>
                    <td className="p-4 text-sm" style={{ color: campaign.rate && campaign.rate !== '0%' ? '#10b981' : '#cccccc' }}>
                      {campaign.rate || '0%'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
              {campaigns.length > 5 && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setCurrentView('campaigns')}
                    className="text-sm transition-all duration-200 hover:opacity-80"
                    style={{ color: '#5BB0FF' }}
                  >
                    View all {campaigns.length} campaigns →
                  </button>
                </div>
              )}
            </>
          )}
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