import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Search } from 'lucide-react';
import LeadFinder from './components/LeadFinder.tsx';
import LeadsDatabase from './components/LeadsDatabase';
import CampaignsOverview from './components/CampaignsOverview';
import CampaignToggle from './components/CampaignToggle';
import { useCampaignStore } from './store/campaignStore';
import { getKeyMetrics, getEfficiencyMetrics, getCampaigns, getChartLabels, getTableHeaders } from './data/campaignData';

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'leadfinder' | 'campaigns' | 'leads'>('dashboard');
  const { mode } = useCampaignStore();

  const keyMetrics = getKeyMetrics(mode);
  const efficiencyMetrics = getEfficiencyMetrics(mode);
  const campaigns = getCampaigns(mode);
  const chartLabels = getChartLabels(mode);
  const tableHeaders = getTableHeaders(mode);

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
            {mode === 'email' ? 'Email Campaign Dashboard' : 'LinkedIn Campaign Dashboard'}
          </h1>
          <div className="text-sm px-3 py-1 rounded-full" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333', color: '#888888' }}>
            {mode === 'email' ? 'Apollo + Instantly' : 'Sales Navigator + HeyReach'}
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
            {/* Leads Scraped Chart */}
            <div 
              className="rounded-lg p-6 transition-all duration-200"
              style={{ 
                backgroundColor: '#1a1a1a', 
                border: '1px solid #444444' 
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#666666';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#444444';
              }}
            >
              <div className="mb-4">
                <div className="text-sm mb-2" style={{ color: '#cccccc' }}>{chartLabels.chart1.title}</div>
                <div className="text-2xl font-bold text-white">{chartLabels.chart1.value}</div>
                <div className="text-sm flex items-center" style={{ color: '#10b981' }}>
                  <TrendingUp className="w-4 h-4 mr-1" />
                  {chartLabels.chart1.change}
                </div>
              </div>
              <div className="h-32 mb-4">
                <ChartSVG className="w-full h-full" />
              </div>
              <div className="flex justify-between text-xs" style={{ color: '#777777' }}>
                <span>Day 1</span>
                <span>Day 5</span>
                <span>Day 10</span>
                <span>Day 15</span>
                <span>Day 20</span>
                <span>Day 25</span>
                <span>Day 30</span>
              </div>
            </div>

            {/* Replies & Meetings Chart */}
            <div 
              className="rounded-lg p-6 transition-all duration-200"
              style={{ 
                backgroundColor: '#1a1a1a', 
                border: '1px solid #444444' 
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#666666';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#444444';
              }}
            >
              <div className="mb-4">
                <div className="text-sm mb-2" style={{ color: '#cccccc' }}>{chartLabels.chart2.title}</div>
                <div className="text-2xl font-bold text-white">{chartLabels.chart2.value}</div>
                <div className="text-sm flex items-center" style={{ color: '#10b981' }}>
                  <TrendingUp className="w-4 h-4 mr-1" />
                  {chartLabels.chart2.change}
                </div>
              </div>
              <div className="h-32 mb-4">
                <ChartSVG className="w-full h-full" />
              </div>
              <div className="flex justify-between text-xs" style={{ color: '#777777' }}>
                <span>Day 1</span>
                <span>Day 5</span>
                <span>Day 10</span>
                <span>Day 15</span>
                <span>Day 20</span>
                <span>Day 25</span>
                <span>Day 30</span>
              </div>
            </div>
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
                  {tableHeaders.map((header, index) => (
                    <th key={index} className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign, index) => (
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
                    <td className="p-4 text-sm" style={{ color: '#cccccc' }}>{campaign.leads}</td>
                    <td className="p-4 text-sm" style={{ color: '#cccccc' }}>{campaign.responses}</td>
                    <td className="p-4 text-sm" style={{ color: '#cccccc' }}>{campaign.conversions}</td>
                    <td className="p-4 text-sm" style={{ color: '#cccccc' }}>{campaign.rate}</td>
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
    </div>
  );
}

export default App;