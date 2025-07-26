import React, { useState } from 'react';
import { Search, Filter, Download, ChevronDown, MoreHorizontal } from 'lucide-react';
import { useCampaignStore } from '../store/campaignStore';
import CampaignToggle from './CampaignToggle';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  source: string;
  status: 'New' | 'Contacted' | 'Qualified' | 'Converted';
  statusColor: string;
  dateAdded: string;
  selected: boolean;
}

interface LeadsDatabaseProps {
  onNavigate: (view: 'dashboard' | 'leadfinder' | 'campaigns' | 'leads') => void;
}

const LeadsDatabase: React.FC<LeadsDatabaseProps> = ({ onNavigate }) => {
  const { mode } = useCampaignStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const emailLeads: Lead[] = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@techcorp.com',
      phone: '+1 (555) 123-4567',
      company: 'TechCorp Solutions',
      position: 'Marketing Director',
      source: 'Apollo',
      status: 'New',
      statusColor: '#3b82f6',
      dateAdded: '2024-01-15',
      selected: false
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.j@innovate.io',
      phone: '+1 (555) 234-5678',
      company: 'Innovate Digital',
      position: 'CEO',
      source: 'Website',
      status: 'Contacted',
      statusColor: '#f59e0b',
      dateAdded: '2024-01-14',
      selected: false
    },
    {
      id: '3',
      name: 'Michael Chen',
      email: 'mchen@growthagency.com',
      phone: '+1 (555) 345-6789',
      company: 'Growth Agency Pro',
      position: 'Head of Sales',
      source: 'Apollo',
      status: 'Qualified',
      statusColor: '#8b5cf6',
      dateAdded: '2024-01-13',
      selected: false
    },
    {
      id: '4',
      name: 'Emily Rodriguez',
      email: 'emily@marketplus.com',
      phone: '+1 (555) 456-7890',
      company: 'MarketPlus Inc',
      position: 'VP Marketing',
      source: 'Website',
      status: 'Converted',
      statusColor: '#10b981',
      dateAdded: '2024-01-12',
      selected: false
    },
    {
      id: '5',
      name: 'David Wilson',
      email: 'dwilson@scalestartup.com',
      phone: '+1 (555) 567-8901',
      company: 'Scale Startup',
      position: 'Founder',
      source: 'Apollo',
      status: 'New',
      statusColor: '#3b82f6',
      dateAdded: '2024-01-11',
      selected: false
    }
  ];

  const linkedinLeads: Lead[] = [
    {
      id: '1',
      name: 'Alex Thompson',
      email: 'alex.thompson@techstartup.com',
      phone: '+1 (555) 987-6543',
      company: 'Tech Startup Inc',
      position: 'CTO',
      source: 'LinkedIn',
      status: 'New',
      statusColor: '#3b82f6',
      dateAdded: '2024-01-15',
      selected: false
    },
    {
      id: '2',
      name: 'Jessica Martinez',
      email: 'j.martinez@saascompany.io',
      phone: '+1 (555) 876-5432',
      company: 'SaaS Company',
      position: 'VP of Sales',
      source: 'Sales Navigator',
      status: 'Contacted',
      statusColor: '#f59e0b',
      dateAdded: '2024-01-14',
      selected: false
    },
    {
      id: '3',
      name: 'Robert Kim',
      email: 'robert@digitalagency.com',
      phone: '+1 (555) 765-4321',
      company: 'Digital Agency',
      position: 'Creative Director',
      source: 'LinkedIn',
      status: 'Qualified',
      statusColor: '#8b5cf6',
      dateAdded: '2024-01-13',
      selected: false
    },
    {
      id: '4',
      name: 'Lisa Chang',
      email: 'lisa.chang@ecommerce.com',
      phone: '+1 (555) 654-3210',
      company: 'E-commerce Solutions',
      position: 'Marketing Manager',
      source: 'Sales Navigator',
      status: 'Converted',
      statusColor: '#10b981',
      dateAdded: '2024-01-12',
      selected: false
    },
    {
      id: '5',
      name: 'Mark Davis',
      email: 'mark@consultingfirm.com',
      phone: '+1 (555) 543-2109',
      company: 'Consulting Firm',
      position: 'Senior Partner',
      source: 'LinkedIn',
      status: 'New',
      statusColor: '#3b82f6',
      dateAdded: '2024-01-11',
      selected: false
    }
  ];

  const leads = mode === 'email' ? emailLeads : linkedinLeads;

  const filteredLeads = leads.filter(lead =>
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(filteredLeads.map(lead => lead.id));
    } else {
      setSelectedLeads([]);
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    if (checked) {
      setSelectedLeads([...selectedLeads, leadId]);
    } else {
      setSelectedLeads(selectedLeads.filter(id => id !== leadId));
    }
  };

  const isAllSelected = filteredLeads.length > 0 && selectedLeads.length === filteredLeads.length;
  const isIndeterminate = selectedLeads.length > 0 && selectedLeads.length < filteredLeads.length;

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
              style={{ color: '#ffffff' }}
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
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#ffffff' }}>
              Leads Database
            </h1>
            <div className="text-sm" style={{ color: '#888888' }}>
              {filteredLeads.length} of {leads.length} leads • {selectedLeads.length} selected
            </div>
          </div>
        </div>

        {/* Search and Actions Bar */}
        <div className="flex items-center justify-between mb-6">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#888888' }} />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-300"
              style={{
                backgroundColor: '#1a1a1a',
                border: '1px solid #333333',
                color: '#ffffff'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#555555';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#333333';
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-80"
                style={{ backgroundColor: '#333333', border: '1px solid #555555', color: '#ffffff' }}
              >
                <Filter size={16} />
                <span>Filters</span>
                <ChevronDown size={16} />
              </button>
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowExport(!showExport)}
                className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:opacity-80"
                style={{ backgroundColor: '#333333', border: '1px solid #555555', color: '#ffffff' }}
              >
                <Download size={16} />
                <span>Export</span>
                <ChevronDown size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Leads Table */}
        <div className="rounded-lg overflow-hidden" style={{ backgroundColor: '#1a1a1a', border: '1px solid #333333' }}>
          <table className="w-full">
            <thead style={{ backgroundColor: '#1a1a1a', borderBottom: '1px solid #333333' }}>
              <tr>
                <th className="text-left p-4 w-12">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Name</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Email</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Phone</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Company</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Position</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Source</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Status</th>
                <th className="text-left p-4 text-sm font-medium" style={{ color: '#999999' }}>Date Added</th>
                <th className="text-left p-4 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead, index) => (
                <tr 
                  key={lead.id} 
                  className="transition-colors"
                  style={{ borderTop: index > 0 ? '1px solid #333333' : 'none' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#2a2a2a';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={(e) => handleSelectLead(lead.id, e.target.checked)}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="p-4 text-sm" style={{ color: '#ffffff' }}>{lead.name}</td>
                  <td className="p-4 text-sm" style={{ color: '#cccccc' }}>{lead.email}</td>
                  <td className="p-4 text-sm" style={{ color: '#cccccc' }}>{lead.phone}</td>
                  <td className="p-4 text-sm" style={{ color: '#cccccc' }}>{lead.company}</td>
                  <td className="p-4 text-sm" style={{ color: '#cccccc' }}>{lead.position}</td>
                  <td className="p-4 text-sm" style={{ color: '#cccccc' }}>{lead.source}</td>
                  <td className="p-4">
                    <span
                      className="text-xs font-medium px-2 py-1 rounded-full"
                      style={{ 
                        backgroundColor: lead.statusColor + '20',
                        color: lead.statusColor 
                      }}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm" style={{ color: '#cccccc' }}>{lead.dateAdded}</td>
                  <td className="p-4">
                    <button className="p-1 rounded hover:bg-gray-700 transition-colors">
                      <MoreHorizontal size={16} style={{ color: '#888888' }} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Stats */}
        <div className="mt-6 text-center text-sm" style={{ color: '#777777' }}>
          Showing {filteredLeads.length} leads • {selectedLeads.length} selected
        </div>
      </div>
    </div>
  );
};

export default LeadsDatabase;