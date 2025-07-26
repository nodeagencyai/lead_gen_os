import React from 'react';
import { Mail, MessageCircle } from 'lucide-react';
import { useCampaignStore, CampaignMode } from '../store/campaignStore';

const CampaignToggle: React.FC = () => {
  const { mode, setMode } = useCampaignStore();

  const handleToggle = (newMode: CampaignMode) => {
    setMode(newMode);
  };

  return (
    <div className="flex items-center space-x-1 rounded-lg p-1" style={{ backgroundColor: '#0f0f0f', border: '1px solid #333333' }}>
      <button
        onClick={() => handleToggle('email')}
        className={`flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-md transition-all duration-300 ${
          mode === 'email' 
            ? 'text-white shadow-lg' 
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
        style={{
          backgroundColor: mode === 'email' ? '#333333' : 'transparent',
          border: mode === 'email' ? '1px solid #555555' : '1px solid transparent'
        }}
      >
        <Mail size={16} />
        <span>Email Campaign</span>
      </button>
      <button
        onClick={() => handleToggle('linkedin')}
        className={`flex items-center space-x-2 px-4 py-2 text-sm font-semibold rounded-md transition-all duration-300 ${
          mode === 'linkedin' 
            ? 'text-white shadow-lg' 
            : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
        style={{
          backgroundColor: mode === 'linkedin' ? '#333333' : 'transparent',
          border: mode === 'linkedin' ? '1px solid #555555' : '1px solid transparent'
        }}
      >
        <MessageCircle size={16} />
        <span>LinkedIn Campaign</span>
      </button>
    </div>
  );
};

export default CampaignToggle;