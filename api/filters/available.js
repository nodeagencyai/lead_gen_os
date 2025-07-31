import { createClient } from '@supabase/supabase-js';

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(
  supabaseUrl || 'https://efpwtvlgnftlabmliguf.supabase.co',
  supabaseKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVmcHd0dmxnbmZ0bGFibWxpZ3VmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Mzc4NjI2NywiZXhwIjoyMDY5MzYyMjY3fQ.jd7hbkp38CxkW05eSDcyJMwkidkE4REqxzqb7Fa1U9c'
);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { source = 'linkedin' } = req.query;

  try {
    // Fetch unique niches
    let uniqueNiches = [];
    try {
      const { data: niches, error: nichesError } = await supabase
        .from(source)
        .select('niche')
        .not('niche', 'is', null)
        .order('niche');

      if (nichesError) {
        console.warn('Error fetching niches:', nichesError);
      } else {
        uniqueNiches = [...new Set(niches?.map(n => n.niche) || [])];
      }
    } catch (nichesErr) {
      console.warn('Could not fetch niches, table may not have niche column yet');
    }

    // Fetch unique tags
    let uniqueTags = [];
    try {
      const { data: allLeads, error: tagsError } = await supabase
        .from(source)
        .select('tags')
        .not('tags', 'is', null);

      if (tagsError) {
        console.warn('Error fetching tags:', tagsError);
      } else {
        const tagSet = new Set();
        allLeads?.forEach(lead => {
          if (lead.tags && Array.isArray(lead.tags)) {
            lead.tags.forEach(tag => {
              if (tag && typeof tag === 'string') {
                tagSet.add(tag.trim());
              }
            });
          }
        });
        uniqueTags = Array.from(tagSet).sort();
      }
    } catch (tagsErr) {
      console.warn('Could not fetch tags, table may not have tags column yet');
    }

    return res.status(200).json({
      niches: uniqueNiches,
      tags: uniqueTags
    });
  } catch (error) {
    console.error('Error fetching filter options:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch filter options',
      details: error.message,
      niches: [],
      tags: []
    });
  }
}