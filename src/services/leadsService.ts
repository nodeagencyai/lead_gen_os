import { supabase } from '../lib/supabase';

export interface ApolloLead {
  id?: number;
  full_name?: string;
  title?: string;
  company?: string;
  city?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  website?: string;
  industry?: string;
  company_size?: string;
  location?: string;
  created_at?: string;
  [key: string]: any;
}

export interface LinkedInLead {
  id?: number;
  full_name?: string;
  title?: string;
  company?: string;
  city?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  website?: string;
  industry?: string;
  company_size?: string;
  location?: string;
  created_at?: string;
  [key: string]: any;
}

export class LeadsService {
  static async getApolloLeads(searchTerm?: string): Promise<ApolloLead[]> {
    try {
      let query = supabase
        .from('Apollo')
        .select('*')
        .order('id', { ascending: false });

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching Apollo leads:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch Apollo leads:', error);
      throw error;
    }
  }

  static async getLinkedInLeads(searchTerm?: string): Promise<LinkedInLead[]> {
    try {
      let query = supabase
        .from('LinkedIn')
        .select('*')
        .order('id', { ascending: false });

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%,title.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching LinkedIn leads:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to fetch LinkedIn leads:', error);
      throw error;
    }
  }

  static async getApolloLeadById(id: number): Promise<ApolloLead | null> {
    try {
      const { data, error } = await supabase
        .from('Apollo')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching Apollo lead:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to fetch Apollo lead:', error);
      throw error;
    }
  }

  static async getLinkedInLeadById(id: number): Promise<LinkedInLead | null> {
    try {
      const { data, error } = await supabase
        .from('LinkedIn')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching LinkedIn lead:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Failed to fetch LinkedIn lead:', error);
      throw error;
    }
  }

  static subscribeToApolloUpdates(callback: (lead: ApolloLead) => void) {
    return supabase
      .channel('apollo-leads')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'Apollo'
      }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          callback(payload.new as ApolloLead);
        }
      })
      .subscribe();
  }

  static subscribeToLinkedInUpdates(callback: (lead: LinkedInLead) => void) {
    return supabase
      .channel('linkedin-leads')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'LinkedIn'
      }, (payload) => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          callback(payload.new as LinkedInLead);
        }
      })
      .subscribe();
  }
}