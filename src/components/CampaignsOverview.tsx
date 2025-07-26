import React, { useState } from 'react';
import { Plus, Download, Eye, Settings, MoreHorizontal } from 'lucide-react';
import { useCampaignStore } from '../store/campaignStore';
import CampaignToggle from './CampaignToggle';

interface Campaign {
  id: string;
  name: string;
  status: 'In progress' | 'Completed' | 'Ready' | 'Draft';
  statusColor: string;
  preparation: number;
  leadsReady: number;
  emailsSent: number;
  replies: number;
  meetings: number;
  template: string;
  platform: string;
}

interface CampaignsOverviewProps {
  onNavigate: (view: 'dashboard' | 'leadfinder' | 'campaigns' | 'leads') => void;
}

const CampaignsOverview: React.FC<CampaignsOverviewProps> = ({ onNavigate }) => {
  const { mode } = useCampaignStore();
  const [activeTab, setActiveTab] = useState('Campaigns');
  const [statusFilter, setStatusFilter] = useState('All');

  const emailCampaigns: Campaign[] = [
    {
      id: '1',
      name: 'Digital Marketing Agencies',
      status: 'In progress',
      statusColor: '#3b82f6',
      preparation: 90,
      leadsReady: 500,
      emailsSent: 450,
      replies: 45,
      meetings: 12,
      template: 'Marketing Agency Outreach',
      platform: 'Instantly'
    },
    {
      id: '2',
      name: 'Creative Agencies',
      status: 'Completed',
      statusColor: '#8b5cf6',
      preparation: 100,
      leadsReady: 200,
      emailsSent: 200,
      replies: 24,
      meetings: 8,
      template: 'Creative Agency Outreach',
      platform: 'Apollo'
    },
    {
      id: '3',
      name: 'Recruitment Agencies',
      status: 'Ready',
      statusColor: '#10b981',
      preparation: 100,
      leadsReady: 300,
      emailsSent: 0,
      replies: 0,
      meetings: 0,
      template: 'Recruitment Agency Outreach',
      platform: 'Lemlist'
    }
  ];

  const linkedinCampaigns: Campaign[] = [
    {
      id: '1',
      name: 'Tech Startup Founders',
      status: 'In progress',
      statusColor: '#3b82f6',
      preparation: 85,
      leadsReady: 400,
      emailsSent: 320,
      replies: 64,
      meetings: 18,
      template: 'Startup Founder Outreach',
      platform: 'HeyReach'
    },
    {
      id: '2',
      name: 'SaaS Decision Makers',
      status: 'Completed',
      statusColor: '#8b5cf6',
      preparation: 100,
      leadsReady: 250,
      emailsSent: 250,
      replies: 38,
      meetings: 12,
      template: 'SaaS Executive Outreach',
      platform: 'Sales Navigator'
    },
    {
      id: '3',
      name: 'E-commerce Owners',
      status: 'Ready',
      statusColor: '#10b981',
      preparation: 100,
      leadsReady: 180,
      emailsSent: 0,
      replies: 0,
      meetings: 0,
      template: 'E-commerce Owner Outreach',
      platform: 'LinkedIn Helper'
    }
  ];

  const campaigns = mode === 'email' ? emailCampaigns : linkedinCampaigns;
  const filteredCampaigns = statusFilter === 'All' ? campaigns : campaigns.filter(c => c.status === statusFilter);

  const statusOptions = ['All', 'Ready', 'Active', 'Completed', 'Draft'];

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
             style={{ color: '#ffffff' }}
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-white">
              Campaigns Overview
            </h1>
            <p className="text-base" style={{ color: '#ffffff' }}>
              {mode === 'email' 
                ? 'Prepare, preview, and organize your email campaigns'
                : 'Prepare, preview, and organize your LinkedIn campaigns'
              }
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button 
              className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-80"
              style={{ backgroundColor: '#333333', border: '1px solid #555555', color: '#ffffff' }}
            >
              <Download size={16} />
              <span>Export All</span>
            </button>
            <button 
              className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-80"
              style={{ backgroundColor: '#333333', border: '1px solid #555555', color: '#ffffff' }}
            >
              <Plus size={16} />
              <span>New Campaign</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center space-x-1 mb-6 rounded-lg p-1 w-fit" style={{ backgroundColor: '#333333', border: '1px solid #555555' }}>
          {['Campaigns', 'Templates', 'Analytics'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                activeTab === tab 
                  ? 'text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
              style={{
                backgroundColor: activeTab === tab ? '#555555' : 'transparent',
                border: activeTab === tab ? '1px solid #777777' : '1px solid transparent'
              }}
            >
              <span>{tab}</span>
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="flex items-center space-x-2 mb-8">
          {statusOptions.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                statusFilter === status 
                  ? 'text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
              style={{
                backgroundColor: statusFilter === status ? '#333333' : '#1a1a1a',
                border: statusFilter === status ? '1px solid #555555' : '1px solid #333333'
              }}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Campaign Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((campaign) => (
            <div 
              key={campaign.id}
              className="rounded-xl p-6 transition-all duration-200 hover:border-opacity-80"
              style={{ 
                backgroundColor: '#1a1a1a', 
                border: '1px solid #333333' 
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#555555';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#333333';
                e.currentTarget.style.transform = 'translateY(0px)';
              }}
            >
              {/* Campaign Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: campaign.statusColor }}
                  />
                  <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-1 rounded hover:bg-gray-700 transition-colors">
                    <Eye size={16} style={{ color: '#888888' }} />
                  </button>
                  <button className="p-1 rounded hover:bg-gray-700 transition-colors">
                    <Settings size={16} style={{ color: '#888888' }} />
                  </button>
                </div>
              </div>

              {/* Status */}
              <div className="mb-4">
                <span 
                  className="text-sm font-medium px-2 py-1 rounded"
                  style={{ 
                    backgroundColor: campaign.statusColor + '20',
                    color: campaign.statusColor 
                  }}
                >
                  {campaign.status}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm" style={{ color: '#cccccc' }}>Preparation</span>
                  <span className="text-sm font-medium text-white">{campaign.preparation}%</span>
                </div>
                <div className="w-full rounded-full h-2" style={{ backgroundColor: '#333333' }}>
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${campaign.preparation}%`,
                      backgroundColor: campaign.statusColor 
                    }}
                  />
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-2xl font-bold text-white">{campaign.leadsReady}</div>
                  <div className="text-sm" style={{ color: '#888888' }}>
                    {mode === 'email' ? 'Leads Ready' : 'Connections Ready'}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{campaign.emailsSent}</div>
                  <div className="text-sm" style={{ color: '#888888' }}>
                    {mode === 'email' ? 'Emails Sent' : 'Messages Sent'}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{campaign.replies}</div>
                  <div className="text-sm" style={{ color: '#888888' }}>Replies</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">{campaign.meetings}</div>
                  <div className="text-sm" style={{ color: '#888888' }}>Meetings</div>
                </div>
              </div>

              {/* Template & Platform */}
              <div className="space-y-3">
                <div 
                  className="flex items-center space-x-2 p-3 rounded-lg"
                  style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333' }}
                >
                  <span className="text-sm" style={{ color: '#888888' }}>Template</span>
                  <span className="text-sm text-white font-medium">{campaign.template}</span>
                </div>
                <div 
                  className="flex items-center space-x-2 p-3 rounded-lg"
                  style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333' }}
                >
                  <span className="text-sm" style={{ color: '#888888' }}>Platform</span>
                  <span className="text-sm text-white font-medium">{campaign.platform}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CampaignsOverview;