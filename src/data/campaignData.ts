import { CampaignMode } from '../store/campaignStore';

export interface MetricData {
  title: string;
  value: string;
  change: string;
  positive: boolean;
}

export interface EfficiencyMetricData {
  title: string;
  value: string;
  change: string;
  positive: boolean;
}

export interface CampaignData {
  name: string;
  leads: number;
  responses: number;
  conversions: number;
  rate: string;
}

export const getKeyMetrics = (mode: CampaignMode): MetricData[] => {
  if (mode === 'email') {
    return [
      {
        title: 'Emails Sent',
        value: '2,450',
        change: '+18%',
        positive: true
      },
      {
        title: 'Emails Opened',
        value: '1,225',
        change: '+12%',
        positive: true
      },
      {
        title: 'Email Replies',
        value: '367',
        change: '+25%',
        positive: true
      },
      {
        title: 'Meetings Booked',
        value: '89',
        change: '+15%',
        positive: true
      },
      {
        title: 'Bounce Rate',
        value: '2.1%',
        change: '-8%',
        positive: true
      }
    ];
  } else {
    return [
      {
        title: 'Connection Requests',
        value: '1,850',
        change: '+22%',
        positive: true
      },
      {
        title: 'Connections Accepted',
        value: '1,295',
        change: '+16%',
        positive: true
      },
      {
        title: 'Messages Sent',
        value: '1,100',
        change: '+20%',
        positive: true
      },
      {
        title: 'Message Replies',
        value: '275',
        change: '+18%',
        positive: true
      },
      {
        title: 'Meetings Booked',
        value: '67',
        change: '+12%',
        positive: true
      }
    ];
  }
};

export const getEfficiencyMetrics = (mode: CampaignMode, emailMetrics?: any, linkedinMetrics?: any): EfficiencyMetricData[] => {
  if (mode === 'email') {
    const sent = emailMetrics?.sent || 0;
    const opened = emailMetrics?.opened || 0;
    const replied = emailMetrics?.replied || 0;
    const meetings = emailMetrics?.meetings || 0;
    
    const openRate = sent > 0 ? ((opened / sent) * 100).toFixed(1) : '0';
    const replyRate = sent > 0 ? ((replied / sent) * 100).toFixed(1) : '0';
    
    return [
      {
        title: 'Open Rate',
        value: `${openRate}%`,
        change: '0%',
        positive: true
      },
      {
        title: 'Reply Rate',
        value: `${replyRate}%`,
        change: '0%',
        positive: true
      },
      {
        title: 'Cost per Email',
        value: '$0.00',
        change: '0%',
        positive: true
      },
      {
        title: 'Cost per Meeting',
        value: '$0.00',
        change: '0%',
        positive: true
      }
    ];
  } else {
    const connectionRequests = linkedinMetrics?.connectionRequests || 0;
    const connectionsAccepted = linkedinMetrics?.connectionsAccepted || 0;
    const messagesSent = linkedinMetrics?.messagesSent || 0;
    const messageReplies = linkedinMetrics?.messageReplies || 0;
    
    const acceptanceRate = connectionRequests > 0 ? ((connectionsAccepted / connectionRequests) * 100).toFixed(1) : '0';
    const responseRate = messagesSent > 0 ? ((messageReplies / messagesSent) * 100).toFixed(1) : '0';
    
    return [
      {
        title: 'Acceptance Rate',
        value: `${acceptanceRate}%`,
        change: '0%',
        positive: true
      },
      {
        title: 'Response Rate',
        value: `${responseRate}%`,
        change: '0%',
        positive: true
      },
      {
        title: 'Cost per Connection',
        value: '$0.00',
        change: '0%',
        positive: true
      },
      {
        title: 'Cost per Meeting',
        value: '$0.00',
        change: '0%',
        positive: true
      }
    ];
  }
};

export const getCampaigns = (mode: CampaignMode): CampaignData[] => {
  if (mode === 'email') {
    return [
      { name: 'Email Campaign Alpha', leads: 500, responses: 75, conversions: 15, rate: '15%' },
      { name: 'Email Campaign Beta', leads: 450, responses: 63, conversions: 12, rate: '14%' },
      { name: 'Email Campaign Gamma', leads: 400, responses: 56, conversions: 11, rate: '14%' },
      { name: 'Email Campaign Delta', leads: 350, responses: 49, conversions: 9, rate: '14%' },
      { name: 'Email Campaign Epsilon', leads: 300, responses: 42, conversions: 8, rate: '14%' }
    ];
  } else {
    return [
      { name: 'LinkedIn Campaign Alpha', leads: 300, responses: 75, conversions: 15, rate: '25%' },
      { name: 'LinkedIn Campaign Beta', leads: 280, responses: 63, conversions: 12, rate: '23%' },
      { name: 'LinkedIn Campaign Gamma', leads: 250, responses: 56, conversions: 11, rate: '22%' },
      { name: 'LinkedIn Campaign Delta', leads: 220, responses: 49, conversions: 9, rate: '22%' },
      { name: 'LinkedIn Campaign Epsilon', leads: 200, responses: 42, conversions: 8, rate: '21%' }
    ];
  }
};

export const getChartLabels = (mode: CampaignMode) => {
  if (mode === 'email') {
    return {
      chart1: {
        title: 'Emails Sent Over Time',
        value: '2,450',
        change: 'Last 30 Days +18%'
      },
      chart2: {
        title: 'Opens & Replies Over Time',
        value: '1,592',
        change: 'Last 30 Days +19%'
      }
    };
  } else {
    return {
      chart1: {
        title: 'Connections Made Over Time',
        value: '1,295',
        change: 'Last 30 Days +16%'
      },
      chart2: {
        title: 'Messages & Replies Over Time',
        value: '1,375',
        change: 'Last 30 Days +19%'
      }
    };
  }
};

export const getTableHeaders = (mode: CampaignMode) => {
  if (mode === 'email') {
    return ['Campaign Name', 'Emails Sent', 'Replies', 'Meetings', 'Reply Rate'];
  } else {
    return ['Campaign Name', 'Connections', 'Replies', 'Meetings', 'Response Rate'];
  }
};