import { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import type { AutomationJob } from '../lib/supabase';

export const useAutomation = (campaignId?: string) => {
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
  }, [campaignId]);

  const loadJobs = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getAutomationJobs(campaignId);
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const startLeadScraping = async (config: {
    type: 'apollo' | 'linkedin';
    url: string;
    limit: number;
  }) => {
    if (!campaignId) throw new Error('Campaign ID required');
    
    try {
      const job = await ApiService.triggerLeadScraping(campaignId, config);
      setJobs(prev => [job, ...prev]);
      
      // Subscribe to job updates
      const subscription = ApiService.subscribeToJobUpdates(job.id, (updatedJob) => {
        setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
      });

      return { job, subscription };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scraping');
      throw err;
    }
  };

  const startEmailCampaign = async (leadIds: string[]) => {
    if (!campaignId) throw new Error('Campaign ID required');
    
    try {
      const job = await ApiService.triggerEmailCampaign(campaignId, leadIds);
      setJobs(prev => [job, ...prev]);
      
      const subscription = ApiService.subscribeToJobUpdates(job.id, (updatedJob) => {
        setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
      });

      return { job, subscription };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start email campaign');
      throw err;
    }
  };

  return {
    jobs,
    loading,
    error,
    startLeadScraping,
    startEmailCampaign,
    refetch: loadJobs
  };
};