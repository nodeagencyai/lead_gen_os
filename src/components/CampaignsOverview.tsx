import React from 'react';
import { useCampaignStore } from '../store/campaignStore';
import EmailCampaignsOverview from './EmailCampaignsOverview';
import LinkedInCampaignsOverview from './LinkedInCampaignsOverview';

interface CampaignsOverviewProps {
  onNavigate: (view: 'dashboard' | 'leadfinder' | 'campaigns' | 'leads' | 'integrations' | 'monitoring') => void;
}

const CampaignsOverview: React.FC<CampaignsOverviewProps> = ({ onNavigate }) => {
  const { mode } = useCampaignStore();

  // Render completely separate components based on mode to prevent data contamination
  if (mode === 'email') {
    return <EmailCampaignsOverview onNavigate={onNavigate} />;
  } else {
    return <LinkedInCampaignsOverview onNavigate={onNavigate} />;
  }
};

export default CampaignsOverview;