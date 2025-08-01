// Service to check lead sync status across platforms
export interface SyncStatus {
  email: string;
  instantly: {
    synced: boolean;
    campaign?: {
      id: string;
      name: string;
    };
    error?: string;
  };
  heyreach: {
    synced: boolean;
    campaign?: {
      id: string;
      name: string;
    };
    error?: string;
  };
  overallSynced: boolean;
}

export class SyncService {
  private static cache = new Map<string, SyncStatus>();
  private static cacheTimeout = 5 * 60 * 1000; // 5 minutes cache

  static async checkLeadSync(email: string, leadId?: number, leadSource?: string): Promise<SyncStatus> {
    // Check cache first
    const cached = this.cache.get(email);
    if (cached) {
      return cached;
    }

    // Check both platforms in parallel
    const [instantlyResult, heyreachResult] = await Promise.all([
      this.checkInstantly(email, leadId, leadSource),
      this.checkHeyReach(email)
    ]);

    const syncStatus: SyncStatus = {
      email,
      instantly: instantlyResult,
      heyreach: heyreachResult,
      overallSynced: instantlyResult.synced || heyreachResult.synced
    };

    // Cache the result
    this.cache.set(email, syncStatus);
    setTimeout(() => {
      this.cache.delete(email);
    }, this.cacheTimeout);

    return syncStatus;
  }

  static async checkInstantly(email: string, leadId?: number, leadSource?: string): Promise<SyncStatus['instantly']> {
    try {
      // Use the new database-based endpoint for more reliable sync status
      const response = await fetch('/api/instantly/check-lead-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, leadId, leadSource })
      });

      if (!response.ok) {
        return { synced: false, error: 'Failed to check status' };
      }

      const data = await response.json();
      return {
        synced: data.synced || false,
        campaign: data.campaign,
        error: data.error
      };
    } catch (error) {
      console.error('Error checking Instantly sync:', error);
      return { synced: false, error: 'Network error' };
    }
  }

  static async checkHeyReach(email: string): Promise<SyncStatus['heyreach']> {
    try {
      const response = await fetch('/api/heyreach/check-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        return { synced: false, error: 'Failed to check status' };
      }

      const data = await response.json();
      return {
        synced: data.synced || false,
        campaign: data.campaign,
        error: data.error
      };
    } catch (error) {
      console.error('Error checking HeyReach sync:', error);
      return { synced: false, error: 'Network error' };
    }
  }

  static async checkMultipleLeads(
    leads: Array<{ email: string; id?: number; source?: string }> | string[]
  ): Promise<Map<string, SyncStatus>> {
    const results = new Map<string, SyncStatus>();
    
    // Process in batches to avoid overwhelming the APIs
    const batchSize = 10;
    for (let i = 0; i < leads.length; i += batchSize) {
      const batch = leads.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(lead => {
          if (typeof lead === 'string') {
            return this.checkLeadSync(lead);
          } else {
            return this.checkLeadSync(lead.email, lead.id, lead.source);
          }
        })
      );
      
      batchResults.forEach(result => {
        results.set(result.email, result);
      });
    }
    
    return results;
  }

  static clearCache() {
    this.cache.clear();
  }
}