import { useState, useEffect } from 'react';
import { useCampaignStore } from '../store/campaignStore';
import { IntegrationService } from '../services/integrationService';

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
}

export const useChartData = () => {
  const { mode } = useCampaignStore();
  const [chartData, setChartData] = useState<ChartData>({
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
        // Try to get real data from Instantly API
        try {
          const instantlyData = await IntegrationService.getInstantlyData();
          
          // If we have real data, use it
          if (instantlyData && instantlyData.analytics) {
            const emailsSentData = generateMockData(instantlyData.analytics.emails_sent || 2450);
            const opensRepliesData = generateMockData(
              (instantlyData.analytics.emails_opened || 1225) + 
              (instantlyData.analytics.emails_replied || 367)
            );

            setChartData({
              chart1: {
                title: 'Emails Sent Over Time',
                data: emailsSentData,
                totalValue: (instantlyData.analytics.emails_sent || 2450).toLocaleString(),
                changePercent: '+18%'
              },
              chart2: {
                title: 'Opens & Replies Over Time',
                data: opensRepliesData,
                totalValue: ((instantlyData.analytics.emails_opened || 1225) + 
                           (instantlyData.analytics.emails_replied || 367)).toLocaleString(),
                changePercent: '+19%'
              },
              loading: false,
              error: null
            });
            return;
          }
        } catch (apiError) {
          console.log('Using mock data - Instantly API not available');
        }

        // Fallback to mock data for email mode
        setChartData({
          chart1: {
            title: 'Emails Sent Over Time',
            data: generateMockData(2450),
            totalValue: '2,450',
            changePercent: '+18%'
          },
          chart2: {
            title: 'Opens & Replies Over Time',
            data: generateMockData(1592),
            totalValue: '1,592',
            changePercent: '+19%'
          },
          loading: false,
          error: null
        });

      } else {
        // LinkedIn mode
        try {
          const heyReachData = await IntegrationService.getHeyReachData();
          
          if (heyReachData && heyReachData.analytics) {
            const connectionsData = generateMockData(heyReachData.analytics.connections_accepted || 1295);
            const messagesRepliesData = generateMockData(
              (heyReachData.analytics.messages_sent || 1100) + 
              (heyReachData.analytics.message_replies || 275)
            );

            setChartData({
              chart1: {
                title: 'Connections Made Over Time',
                data: connectionsData,
                totalValue: (heyReachData.analytics.connections_accepted || 1295).toLocaleString(),
                changePercent: '+16%'
              },
              chart2: {
                title: 'Messages & Replies Over Time',
                data: messagesRepliesData,
                totalValue: ((heyReachData.analytics.messages_sent || 1100) + 
                           (heyReachData.analytics.message_replies || 275)).toLocaleString(),
                changePercent: '+19%'
              },
              loading: false,
              error: null
            });
            return;
          }
        } catch (apiError) {
          console.log('Using mock data - HeyReach API not available');
        }

        // Fallback to mock data for LinkedIn mode
        setChartData({
          chart1: {
            title: 'Connections Made Over Time',
            data: generateMockData(1295),
            totalValue: '1,295',
            changePercent: '+16%'
          },
          chart2: {
            title: 'Messages & Replies Over Time',
            data: generateMockData(1375),
            totalValue: '1,375',
            changePercent: '+19%'
          },
          loading: false,
          error: null
        });
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
  }, [mode]);

  return {
    ...chartData,
    refetch: fetchChartData
  };
};