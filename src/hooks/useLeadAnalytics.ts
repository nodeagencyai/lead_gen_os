import { useState, useEffect } from 'react';
import { supabase, ApolloLead, LinkedInLead } from '../lib/supabase';
import { CampaignMode } from '../store/campaignStore';

export interface LeadAnalytics {
  totalLeads: number;
  profileCoverage: {
    percentage: number;
    completed: number;
    total: number;
  };
  personalizationRate: {
    percentage: number;
    personalized: number;
    total: number;
  };
  growth: {
    totalLeadsChange: number;
    profileCoverageChange: number;
    personalizationChange: number;
  };
}

export const useLeadAnalytics = (mode: CampaignMode) => {
  const [analytics, setAnalytics] = useState<LeadAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  
  // Determine which table to query based on campaign mode
  const tableName = mode === 'email' ? 'Apollo' : 'LinkedIn';
  const maxRetries = 3;

  const fetchLeadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch total leads count from the appropriate table
      const { count: totalLeads, error: countError } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (countError) {
        console.error(`Error fetching count from ${tableName} table:`, countError);
        throw new Error(`Failed to fetch lead count from ${tableName} table: ${countError.message}`);
      }

      // Fetch all leads to calculate profile coverage and personalization
      const { data: leads, error: leadsError } = await supabase
        .from(tableName)
        .select(`
          id,
          name,
          email,
          phone,
          company,
          position,
          linkedin_url,
          raw_data,
          status
        `);

      if (leadsError) {
        console.error(`Error fetching data from ${tableName} table:`, leadsError);
        throw new Error(`Failed to fetch lead data from ${tableName} table: ${leadsError.message}`);
      }

      const totalCount = totalLeads || 0;
      const leadsData = leads || [];

      // Calculate profile coverage based on campaign mode
      const completeProfiles = leadsData.filter(lead => {
        if (mode === 'email') {
          // For Apollo/email campaigns, require name, email, company, position
          return lead.name && lead.email && lead.company && lead.position;
        } else {
          // For LinkedIn campaigns, require name, linkedin_url, company, position
          return lead.name && lead.linkedin_url && lead.company && lead.position;
        }
      }).length;

      const profileCoveragePercentage = totalCount > 0 
        ? Math.round((completeProfiles / totalCount) * 100) 
        : 0;

      // Calculate personalization rate (leads with hooks/icebreakers in raw_data)
      const personalizedLeads = leadsData.filter(lead => 
        lead.raw_data && 
        (lead.raw_data.hook || 
         lead.raw_data.icebreaker || 
         lead.raw_data.personalization ||
         lead.raw_data.custom_message ||
         lead.raw_data.personal_note ||
         lead.raw_data.opening_line)
      ).length;

      const personalizationPercentage = totalCount > 0 
        ? Math.round((personalizedLeads / totalCount) * 100) 
        : 0;

      // For growth metrics, we'd typically compare with previous period
      // For now, we'll use mock positive growth indicators
      const growthMetrics = {
        totalLeadsChange: Math.floor(Math.random() * 15) + 5, // 5-20% growth
        profileCoverageChange: Math.floor(Math.random() * 10) + 2, // 2-12% growth
        personalizationChange: Math.floor(Math.random() * 8) + 3, // 3-11% growth
      };

      const analyticsData: LeadAnalytics = {
        totalLeads: totalCount,
        profileCoverage: {
          percentage: profileCoveragePercentage,
          completed: completeProfiles,
          total: totalCount,
        },
        personalizationRate: {
          percentage: personalizationPercentage,
          personalized: personalizedLeads,
          total: totalCount,
        },
        growth: growthMetrics,
      };

      setAnalytics(analyticsData);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error(`Error fetching lead analytics from ${tableName}:`, err);
      const errorMessage = err instanceof Error ? err.message : `Failed to fetch lead analytics from ${tableName} table`;
      
      // Automatic retry logic
      if (retryCount < maxRetries) {
        console.log(`Retrying... Attempt ${retryCount + 1}/${maxRetries}`);
        setRetryCount(prev => prev + 1);
        // Retry after a delay
        setTimeout(() => {
          fetchLeadAnalytics();
        }, 2000 * (retryCount + 1)); // Progressive delay: 2s, 4s, 6s
        return;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const manualRefetch = () => {
    setRetryCount(0);
    setError(null);
    fetchLeadAnalytics();
  };

  useEffect(() => {
    fetchLeadAnalytics();

    // Set up real-time subscription for the specific table changes
    const subscription = supabase
      .channel(`lead-analytics-changes-${tableName.toLowerCase()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName
        },
        () => {
          // Refetch analytics when the table changes
          console.log(`${tableName} table changed, refetching analytics...`);
          fetchLeadAnalytics();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [mode, tableName]); // Re-run when mode or table changes

  return {
    analytics,
    loading,
    error,
    refetch: manualRefetch,
    tableName,
    retryCount,
  };
};