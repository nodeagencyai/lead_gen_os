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
          console.log('📊 RAW DAILY ANALYTICS RESPONSE IN HOOK:', dailyAnalytics);
          
          if (dailyAnalytics && dailyAnalytics.dailyData && dailyAnalytics.dailyData.length > 0) {
            console.log('📊 DAILY ANALYTICS RECEIVED:', dailyAnalytics);
            console.log('📊 DAILY DATA ARRAY:', dailyAnalytics.dailyData);
            console.log('📊 TOTALS:', dailyAnalytics.totals);
            console.log('📊 CHANGES:', dailyAnalytics.changes);
            
            // TEMPORARY: Generate mock data for visualization testing
            const generateMockDailyData = (days: number, baseValue: number, trend: 'up' | 'down' | 'stable' = 'up') => {
              const mockData: ChartDataPoint[] = [];
              const today = new Date();
              
              for (let i = days - 1; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                
                // Create realistic variations
                const dayOfWeek = date.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                const weekendMultiplier = isWeekend ? 0.7 : 1;
                
                // Add trend
                const trendMultiplier = trend === 'up' ? 1 + (days - i) / days * 0.5 : 
                                       trend === 'down' ? 1 - (days - i) / days * 0.3 : 1;
                
                // Add random variation
                const randomVariation = 0.8 + Math.random() * 0.4; // 80% to 120%
                
                const value = Math.round(
                  baseValue * weekendMultiplier * trendMultiplier * randomVariation
                );
                
                mockData.push({
                  date: date.toISOString(),
                  value: Math.max(0, value)
                });
              }
              
              return mockData;
            };
            
            // Generate mock data based on time period
            const mockEmailsSent = generateMockDailyData(timePeriod, 150, 'up');
            const mockOpensReplies = generateMockDailyData(timePeriod, 45, 'up');
            
            // Transform daily data for charts - USING MOCK DATA
            const emailsSentData: ChartDataPoint[] = mockEmailsSent;
            const opensRepliesData: ChartDataPoint[] = mockOpensReplies;
            
            // Original code (commented out for now):
            // const emailsSentData: ChartDataPoint[] = dailyAnalytics.dailyData.map((day: any) => ({
            //   date: day.date,
            //   value: day.sent
            // }));
            // 
            // const opensRepliesData: ChartDataPoint[] = dailyAnalytics.dailyData.map((day: any) => ({
            //   date: day.date,
            //   value: day.unique_opened + day.unique_replies
            // }));

            console.log('📊 EMAILS SENT CHART DATA:', emailsSentData);
            console.log('📊 OPENS/REPLIES CHART DATA:', opensRepliesData);

            // TEMPORARY: Calculate mock totals from mock data
            const mockTotals = {
              sent: mockEmailsSent.reduce((sum, day) => sum + day.value, 0),
              unique_opened: mockOpensReplies.reduce((sum, day) => sum + Math.round(day.value * 0.7), 0),
              unique_replies: mockOpensReplies.reduce((sum, day) => sum + Math.round(day.value * 0.3), 0),
              clicks: 0
            };
            
            const totals = mockTotals;
            const changes = {
              sent: '+23.5',
              unique_opened: '+18.2',
              unique_replies: '+31.4'
            };
            
            // Original code (commented out for now):
            // const totals = dailyAnalytics.totals;
            // const changes = dailyAnalytics.changes;

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
            console.log('⚠️ NO DAILY ANALYTICS DATA - TAKING EMPTY DATA PATH:', {
              dailyAnalyticsExists: !!dailyAnalytics,
              hasDailyDataProperty: !!dailyAnalytics?.dailyData,
              dailyDataIsArray: Array.isArray(dailyAnalytics?.dailyData),
              dailyDataLength: dailyAnalytics?.dailyData?.length,
              fullDailyAnalytics: dailyAnalytics
            });
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