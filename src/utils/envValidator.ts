/**
 * Environment Variable Validation Utility
 * 🚨 SECURITY: Validates all required environment variables are present
 */

export interface RequiredEnvVars {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  VITE_SUPABASE_SERVICE_KEY: string;
  VITE_INSTANTLY_API_KEY: string;
  VITE_HEYREACH_API_KEY: string;
  VITE_N8N_AUTH_TOKEN: string;
  VITE_N8N_APOLLO_WEBHOOK: string;
  VITE_N8N_LINKEDIN_WEBHOOK: string;
  VITE_N8N_EMAIL_WEBHOOK: string;
  VITE_N8N_LINKEDIN_OUTREACH_WEBHOOK: string;
}

export interface ValidationResult {
  isValid: boolean;
  missing: string[];
  errors: string[];
}

/**
 * Validates all required environment variables
 */
export function validateEnvironmentVariables(): ValidationResult {
  const required: (keyof RequiredEnvVars)[] = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_SUPABASE_SERVICE_KEY',
    'VITE_INSTANTLY_API_KEY',
    'VITE_HEYREACH_API_KEY',
    'VITE_N8N_AUTH_TOKEN',
    'VITE_N8N_APOLLO_WEBHOOK',
    'VITE_N8N_LINKEDIN_WEBHOOK',
    'VITE_N8N_EMAIL_WEBHOOK',
    'VITE_N8N_LINKEDIN_OUTREACH_WEBHOOK'
  ];

  const missing: string[] = [];
  const errors: string[] = [];

  // Check for missing variables
  for (const key of required) {
    const value = import.meta.env[key];
    if (!value || value.trim() === '' || value.includes('your_') || value.includes('_here')) {
      missing.push(key);
    }
  }

  // Validate URL formats
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl && (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co'))) {
    errors.push('VITE_SUPABASE_URL must be a valid Supabase URL (https://your-project.supabase.co)');
  }

  // Validate webhook URLs
  const webhookKeys = [
    'VITE_N8N_APOLLO_WEBHOOK',
    'VITE_N8N_LINKEDIN_WEBHOOK',
    'VITE_N8N_EMAIL_WEBHOOK',
    'VITE_N8N_LINKEDIN_OUTREACH_WEBHOOK'
  ];

  for (const key of webhookKeys) {
    const value = import.meta.env[key];
    if (value && (!value.startsWith('https://') || !value.includes('/webhook/'))) {
      errors.push(`${key} must be a valid webhook URL (https://your-n8n-instance.com/webhook/...)`);
    }
  }

  return {
    isValid: missing.length === 0 && errors.length === 0,
    missing,
    errors
  };
}

/**
 * Throws detailed error if environment variables are invalid
 */
export function assertValidEnvironment(): void {
  const validation = validateEnvironmentVariables();
  
  if (!validation.isValid) {
    const errorMessages = [
      '🚨 CRITICAL: Environment Configuration Error',
      '',
      'The following issues were found:'
    ];

    if (validation.missing.length > 0) {
      errorMessages.push('');
      errorMessages.push('❌ Missing required environment variables:');
      validation.missing.forEach(key => {
        errorMessages.push(`   - ${key}`);
      });
    }

    if (validation.errors.length > 0) {
      errorMessages.push('');
      errorMessages.push('❌ Invalid environment variable formats:');
      validation.errors.forEach(error => {
        errorMessages.push(`   - ${error}`);
      });
    }

    errorMessages.push('');
    errorMessages.push('🔧 To fix this:');
    errorMessages.push('1. Copy .env.example to .env: cp .env.example .env');
    errorMessages.push('2. Replace all placeholder values with your actual credentials');
    errorMessages.push('3. Restart your development server: npm run dev');
    errorMessages.push('');
    errorMessages.push('🚨 NEVER commit actual API keys to Git!');

    throw new Error(errorMessages.join('\n'));
  }
}

/**
 * Gets environment variable with fallback and validation
 */
export function getRequiredEnvVar(key: keyof RequiredEnvVars, fallback?: string): string {
  const value = import.meta.env[key] || fallback;
  
  if (!value || value.trim() === '' || value.includes('your_') || value.includes('_here')) {
    throw new Error(`🚨 Environment variable ${key} is missing or contains placeholder value. Please check your .env file.`);
  }
  
  return value;
}

/**
 * Development helper to log environment status
 */
export function logEnvironmentStatus(): void {
  if (import.meta.env.DEV) {
    const validation = validateEnvironmentVariables();
    
    if (validation.isValid) {
      console.log('✅ Environment variables validated successfully');
    } else {
      console.warn('⚠️ Environment validation issues found:', validation);
    }
  }
}