// api/webhooks/api-usage.js - Track API usage and costs
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
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
    endpoint,
    method = 'POST',
    request_data,
    response_status,
    response_data,
    prompt_tokens,
    completion_tokens,
    duration_ms,
    execution_id,
    lead_id,
    workflow_name,
    node_name
  } = req.body;

  // Validate required fields
  if (!api_service || !model_name) {
    return res.status(400).json({ 
      error: 'Missing required fields: api_service, model_name' 
    });
  }

  try {
    // Get pricing for the model
    const pricing = MODEL_PRICING[model_name] || MODEL_PRICING[`${api_service}/${model_name}`];
    
    // Calculate token counts if not provided
    let calculatedPromptTokens = prompt_tokens;
    let calculatedCompletionTokens = completion_tokens;

    if (!prompt_tokens && request_data) {
      // Rough estimation: ~4 characters per token
      const promptText = extractTextFromRequest(request_data);
      calculatedPromptTokens = Math.ceil(promptText.length / 4);
    }

    if (!completion_tokens && response_data) {
      const completionText = extractTextFromResponse(response_data);
      calculatedCompletionTokens = Math.ceil(completionText.length / 4);
    }

    // Prepare usage record
    const usageRecord = {
      api_service,
      model_name,
      endpoint,
      method,
      request_data: sanitizeData(request_data),
      response_status: response_status || 200,
      response_data: sanitizeData(response_data),
      prompt_tokens: calculatedPromptTokens,
      completion_tokens: calculatedCompletionTokens,
      duration_ms,
      execution_id,
      lead_id,
      workflow_name,
      node_name,
      called_at: new Date()
    };

    // Add pricing if available
    if (pricing) {
      usageRecord.cost_per_1k_prompt_tokens = pricing.prompt;
      usageRecord.cost_per_1k_completion_tokens = pricing.completion;
    }

    // Insert usage record
    const { data, error } = await supabase
      .from('api_usage')
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

    // Calculate and return cost information
    const totalTokens = (calculatedPromptTokens || 0) + (calculatedCompletionTokens || 0);
    const estimatedCost = pricing ? 
      ((calculatedPromptTokens || 0) / 1000 * pricing.prompt) + 
      ((calculatedCompletionTokens || 0) / 1000 * pricing.completion) : 0;

    return res.status(200).json({
      success: true,
      data: {
        id: data.id,
        api_service,
        model_name,
        tokens: {
          prompt: calculatedPromptTokens,
          completion: calculatedCompletionTokens,
          total: totalTokens
        },
        cost: {
          estimated: estimatedCost,
          currency: 'USD',
          per_1k_prompt: pricing?.prompt,
          per_1k_completion: pricing?.completion
        },
        duration_ms,
        recorded_at: data.called_at
      }
    });

  } catch (error) {
    console.error('Error processing API usage:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

function extractTextFromRequest(requestData) {
  if (!requestData) return '';
  
  try {
    const data = typeof requestData === 'string' ? JSON.parse(requestData) : requestData;
    
    // Common patterns for different APIs
    if (data.messages) {
      return data.messages.map(m => m.content || '').join(' ');
    }
    if (data.prompt) {
      return data.prompt;
    }
    if (data.input) {
      return data.input;
    }
    if (data.query) {
      return data.query;
    }
    
    return JSON.stringify(data);
  } catch (e) {
    return String(requestData);
  }
}

function extractTextFromResponse(responseData) {
  if (!responseData) return '';
  
  try {
    const data = typeof responseData === 'string' ? JSON.parse(responseData) : responseData;
    
    // Common patterns for different APIs
    if (data.choices && data.choices[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    if (data.content) {
      return Array.isArray(data.content) ? 
        data.content.map(c => c.text || '').join(' ') : 
        data.content;
    }
    if (data.text) {
      return data.text;
    }
    if (data.output) {
      return data.output;
    }
    if (data.response) {
      return data.response;
    }
    
    return JSON.stringify(data);
  } catch (e) {
    return String(responseData);
  }
}

function sanitizeData(data) {
  if (!data) return null;
  
  try {
    const sanitized = typeof data === 'string' ? JSON.parse(data) : { ...data };
    
    // Remove potentially sensitive information
    const sensitiveKeys = [
      'api_key', 'apikey', 'token', 'password', 'secret', 
      'authorization', 'auth', 'key', 'credentials'
    ];
    
    function removeSensitiveData(obj) {
      if (typeof obj !== 'object' || obj === null) return obj;
      
      if (Array.isArray(obj)) {
        return obj.map(removeSensitiveData);
      }
      
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        const keyLower = key.toLowerCase();
        if (sensitiveKeys.some(sk => keyLower.includes(sk))) {
          cleaned[key] = '[REDACTED]';
        } else {
          cleaned[key] = removeSensitiveData(value);
        }
      }
      return cleaned;
    }
    
    return removeSensitiveData(sanitized);
  } catch (e) {
    // If parsing fails, return truncated string
    const str = String(data);
    return str.length > 1000 ? str.substring(0, 1000) + '...' : str;
  }
}