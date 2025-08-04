import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// OpenRouter model pricing (cost per 1k tokens)
const MODEL_PRICING = {
  'perplexity/sonar-pro': { prompt: 0.003, completion: 0.015 },
  'anthropic/claude-3.5-sonnet': { prompt: 0.003, completion: 0.015 },
  'anthropic/claude-3-opus': { prompt: 0.015, completion: 0.075 },
  'anthropic/claude-3-haiku': { prompt: 0.00025, completion: 0.00125 },
  'openai/gpt-4-turbo': { prompt: 0.01, completion: 0.03 },
  'openai/gpt-4o': { prompt: 0.005, completion: 0.015 },
  'openai/gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
  'meta-llama/llama-3.1-70b-instruct': { prompt: 0.0009, completion: 0.0009 },
  'mistralai/mixtral-8x7b-instruct': { prompt: 0.00024, completion: 0.00024 },
  'google/gemini-pro': { prompt: 0.00025, completion: 0.0005 }
};

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    api_service,
    model_name,
    prompt_tokens,
    completion_tokens,
    workflow_name,
    lead_id,
    node_name,
    endpoint = '/chat/completions',
    duration_ms,
    response_status = 200
  } = req.body;

  // Validate required fields
  if (!api_service || !model_name) {
    return res.status(400).json({
      error: 'Missing required fields: api_service, model_name'
    });
  }

  // Validate numeric fields
  const promptTokens = parseInt(prompt_tokens) || 0;
  const completionTokens = parseInt(completion_tokens) || 0;
  const totalTokens = promptTokens + completionTokens;

  if (totalTokens === 0) {
    return res.status(400).json({
      error: 'Either prompt_tokens or completion_tokens must be provided and greater than 0'
    });
  }

  try {
    // Get pricing for the model
    const pricing = MODEL_PRICING[model_name] || MODEL_PRICING[`${api_service}/${model_name}`];

    // Calculate costs
    let promptCost = 0;
    let completionCost = 0;
    let totalCost = 0;

    if (pricing) {
      promptCost = (promptTokens / 1000) * pricing.prompt;
      completionCost = (completionTokens / 1000) * pricing.completion;
      totalCost = promptCost + completionCost;
    }

    // Prepare usage record
    const usageRecord = {
      api_service,
      model_name,
      endpoint,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
      prompt_cost: promptCost,
      completion_cost: completionCost,
      total_cost: totalCost,
      workflow_name,
      lead_id: lead_id || null,
      node_name: node_name || null,
      duration_ms: duration_ms || null,
      response_status: response_status,
      called_at: new Date()
    };

    // Add pricing metadata if available
    if (pricing) {
      usageRecord.cost_per_1k_prompt_tokens = pricing.prompt;
      usageRecord.cost_per_1k_completion_tokens = pricing.completion;
    }

    // Insert usage record
    const { data, error } = await supabase
      .from('api_usage_tracking')
      .insert(usageRecord)
      .select()
      .single();

    if (error) {
      console.error('Error inserting API usage record:', error);
      return res.status(500).json({
        error: 'Failed to record API usage',
        details: error.message
      });
    }

    console.log(`✅ Recorded API usage: ${model_name} - ${totalTokens} tokens - $${totalCost.toFixed(6)}`);

    // Update monthly cost tracking
    await updateMonthlyCosts(api_service, totalCost);

    res.status(200).json({
      success: true,
      data: {
        id: data.id,
        api_service,
        model_name,
        tokens: {
          prompt: promptTokens,
          completion: completionTokens,
          total: totalTokens
        },
        cost: {
          prompt: promptCost,
          completion: completionCost,
          total: totalCost,
          currency: 'USD'
        },
        pricing: pricing ? {
          prompt_per_1k: pricing.prompt,
          completion_per_1k: pricing.completion
        } : null,
        recorded_at: data.called_at
      }
    });

  } catch (e) {
    console.error('Error processing API usage:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Update monthly cost aggregates
async function updateMonthlyCosts(apiService, cost) {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    const { error } = await supabase
      .from('monthly_api_costs')
      .upsert({
        api_service: apiService,
        month: currentMonth,
        total_cost: cost,
        updated_at: new Date()
      }, {
        onConflict: 'api_service,month',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Error updating monthly costs:', error);
    }
  } catch (e) {
    console.error('Error in updateMonthlyCosts:', e);
  }
}

// Helper function to estimate tokens from text (rough approximation)
function estimateTokens(text) {
  if (!text) return 0;
  // Rough estimation: ~4 characters per token for English text
  return Math.ceil(text.length / 4);
}

// Export helper for external use
export { estimateTokens };