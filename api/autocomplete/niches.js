import { createClient } from '@supabase/supabase-js';

// Check for required environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

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

  const { source = 'linkedin', query = '' } = req.query;

  try {
    // Common niche suggestions if query is provided but no database results
    const commonNiches = [
      'marketing-agencies',
      'saas-b2b',
      'ecommerce-shopify',
      'healthcare-tech',
      'fintech-startup',
      'real-estate',
      'education-tech',
      'manufacturing',
      'local-business',
      'enterprise-software',
      'consulting',
      'legal-services',
      'accounting',
      'construction',
      'hospitality',
      'retail',
      'non-profit',
      'government',
      'automotive',
      'logistics'
    ];

    let suggestions = [];

    try {
      // Try to fetch from database first
      const { data, error } = await supabase
        .from(source)
        .select('niche')
        .not('niche', 'is', null)
        .ilike('niche', `%${query}%`)
        .order('niche')
        .limit(20);

      if (error) {
        console.warn('Database query failed, using common suggestions:', error);
      } else {
        suggestions = [...new Set(data?.map(item => item.niche) || [])];
      }
    } catch (dbError) {
      console.warn('Database not available, using common suggestions');
    }

    // If no database results or database unavailable, use common suggestions
    if (suggestions.length === 0 && query) {
      suggestions = commonNiches.filter(niche => 
        niche.toLowerCase().includes(query.toLowerCase())
      );
    } else if (suggestions.length === 0) {
      suggestions = commonNiches.slice(0, 10); // Return top 10 if no query
    }

    return res.status(200).json({ 
      suggestions: suggestions.slice(0, 20) // Limit to 20 results
    });
  } catch (error) {
    console.error('Error getting niche suggestions:', error);
    
    // Fallback to common niches
    const fallbackSuggestions = [
      'marketing-agencies',
      'saas-b2b',
      'ecommerce-shopify',
      'healthcare-tech',
      'fintech-startup'
    ];

    return res.status(200).json({ 
      suggestions: fallbackSuggestions
    });
  }
}