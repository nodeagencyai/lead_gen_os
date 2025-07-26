import { useState, useEffect } from 'react';
import { ApiService } from '../services/api';
import type { Lead } from '../lib/supabase';

export const useLeads = (filters?: {
  campaign_id?: string;
  status?: string;
  search?: string;
}) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeads();
  }, [filters]);

  useEffect(() => {
    // Subscribe to real-time lead updates
    const subscription = ApiService.subscribeToLeadUpdates((updatedLead) => {
      setLeads(prev => {
        const existingIndex = prev.findIndex(l => l.id === updatedLead.id);
        if (existingIndex >= 0) {
          // Update existing lead
          const newLeads = [...prev];
          newLeads[existingIndex] = updatedLead;
          return newLeads;
        } else {
          // Add new lead
          return [updatedLead, ...prev];
        }
      });
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getLeads(filters);
      setLeads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId: string, status: Lead['status']) => {
    try {
      const updatedLead = await ApiService.updateLeadStatus(leadId, status);
      setLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));
      return updatedLead;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update lead');
      throw err;
    }
  };

  const createLead = async (leadData: Partial<Lead>) => {
    try {
      const newLead = await ApiService.createLead(leadData);
      setLeads(prev => [newLead, ...prev]);
      return newLead;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create lead');
      throw err;
    }
  };

  return {
    leads,
    loading,
    error,
    updateLeadStatus,
    createLead,
    refetch: loadLeads
  };
};