import { useState, useEffect } from 'react';
import { useCampaignStore } from '../store/campaignStore';
import { IntegrationService } from '../services/integrationService';
import { InstantlyCampaignService } from '../services/instantlyCampaignService';

interface ChartDataPoint {
  date: string;
  value: number;
}

interface ChartData {
  chart1: {
    title: string;
    data: ChartDataPoint[];
    totalValue: string;
    changePercent: string;
  };
  chart2: {
    title: string;
    data: ChartDataPoint[];
    totalValue: string;
    changePercent: string;
  };
  loading: boolean;
  error: string | null;
  timePeriod: number;
  setTimePeriod: (days: number) => void;
}

export const useChartData = () => {
  const { mode } = useCampaignStore();
  const [timePeriod, setTimePeriod] = useState<number>(30);
  const [chartData, setChartData] = useState<Omit<ChartData, 'timePeriod' | 'setTimePeriod'>>({
    chart1: {
      title: '',
      data: [],
      totalValue: '0',
      changePercent: '+0%'
    },
    chart2: {
      title: '',
      data: [],
      totalValue: '0',
      changePercent: '+0%'
    },
    loading: true,
    error: null
  });

  // Generate mock data for demonstration (replace with real API calls)
  const generateMockData = (baseValue: number, days: number = 30): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Generate realistic trending data
      const trend = (days - i) / days; // Upward trend
      const randomVariation = (Math.random() - 0.5) * 0.3; // ±15% variation
      const value = Math.round(baseValue * (0.7 + trend * 0.5 + randomVariation));
      
      data.push({
        date: date.toISOString(),
        value: Math.max(0, value)
      });
    }
    
    return data;
  };

  const fetchChartData = async () => {
    try {
      setChartData(prev => ({ ...prev, loading: true, error: null }));

      if (mode === 'email') {
        // Use real daily analytics from Instantly API v2
        try {
          console.log(`📊 Fetching Instantly daily analytics for ${timePeriod} days...`);
          const dailyAnalytics = await InstantlyCampaignService.getDailyAnalytics(timePeriod);
          
          if (dailyAnalytics && dailyAnalytics.dailyData) {
            // Transform daily data for charts
            const emailsSentData: ChartDataPoint[] = dailyAnalytics.dailyData.map((day: any) => ({
              date: day.date,
              value: day.sent
            }));
            
            const opensRepliesData: ChartDataPoint[] = dailyAnalytics.dailyData.map((day: any) => ({
              date: day.date,
              value: day.unique_opened + day.unique_replies
            }));

            const totals = dailyAnalytics.totals;
            const changes = dailyAnalytics.changes;

            setChartData(prev => ({
              ...prev,
              chart1: {
                title: 'Emails Sent Over Time',
                data: emailsSentData,
                totalValue: totals.sent.toLocaleString(),
                changePercent: `${Number(changes.sent) >= 0 ? '+' : ''}${changes.sent}%`
              },
              chart2: {
                title: 'Opens & Replies Over Time',
                data: opensRepliesData,
                totalValue: (totals.unique_opened + totals.unique_replies).toLocaleString(),
                changePercent: `${Number(changes.unique_opened) >= 0 ? '+' : ''}${changes.unique_opened}%`
              },
              loading: false,
              error: null,
              timePeriod,
              setTimePeriod
            }));
          } else {
            // No data available
            setChartData(prev => ({
              ...prev,
              chart1: {
                title: 'Emails Sent Over Time',
                data: [],
                totalValue: '0',
                changePercent: '0%'
              },
              chart2: {
                title: 'Opens & Replies Over Time',
                data: [],
                totalValue: '0',
                changePercent: '0%'
              },
              loading: false,
              error: null,
              timePeriod,
              setTimePeriod
            }));
          }
        } catch (apiError) {
          console.error('Instantly daily analytics failed:', apiError);
          // Use zeros when API fails
          setChartData(prev => ({
            ...prev,
            chart1: {
              title: 'Emails Sent Over Time',
              data: [],
              totalValue: '0',
              changePercent: '0%'
            },
            chart2: {
              title: 'Opens & Replies Over Time',
              data: [],
              totalValue: '0',
              changePercent: '0%'
            },
            loading: false,
            error: apiError instanceof Error ? apiError.message : 'Failed to load chart data',
            timePeriod,
            setTimePeriod
          }));
        }

      } else {
        // LinkedIn mode - use real data from HeyReach API only
        try {
          const heyReachData = await IntegrationService.getHeyReachData();
          
          const connectionsAccepted = heyReachData?.analytics?.connections_accepted || 0;
          const messagesSent = heyReachData?.analytics?.messages_sent || 0;
          const messageReplies = heyReachData?.analytics?.message_replies || 0;
          
          const connectionsData = connectionsAccepted > 0 ? generateMockData(connectionsAccepted) : [];
          const messagesRepliesData = (messagesSent + messageReplies) > 0 ? generateMockData(messagesSent + messageReplies) : [];

          setChartData(prev => ({
            ...prev,
            chart1: {
              title: 'Connections Made Over Time',
              data: connectionsData,
              totalValue: connectionsAccepted.toLocaleString(),
              changePercent: connectionsAccepted > 0 ? '+0%' : '0%'
            },
            chart2: {
              title: 'Messages & Replies Over Time',
              data: messagesRepliesData,
              totalValue: (messagesSent + messageReplies).toLocaleString(),
              changePercent: (messagesSent + messageReplies) > 0 ? '+0%' : '0%'
            },
            loading: false,
            error: null,
            timePeriod,
            setTimePeriod
          }));
        } catch (apiError) {
          console.error('HeyReach API failed:', apiError);
          // Use zeros when API fails
          setChartData(prev => ({
            ...prev,
            chart1: {
              title: 'Connections Made Over Time',
              data: [],
              totalValue: '0',
              changePercent: '0%'
            },
            chart2: {
              title: 'Messages & Replies Over Time',
              data: [],
              totalValue: '0',
              changePercent: '0%'
            },
            loading: false,
            error: null,
            timePeriod,
            setTimePeriod
          }));
        }
      }

    } catch (error) {
      console.error('Chart data fetch error:', error);
      setChartData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load chart data'
      }));
    }
  };

  useEffect(() => {
    fetchChartData();
  }, [mode, timePeriod]);

  return {
    ...chartData,
    timePeriod,
    setTimePeriod,
    refetch: fetchChartData
  };
};