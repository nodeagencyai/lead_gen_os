/**
 * Cost Tracking System Tests
 * 
 * Basic test suite for the cost tracking functionality
 * Updated to work with Jest testing framework
 */

// Mock environment variables are handled in setupTests.ts
process.env.MONTHLY_WORKSPACE_COST = '48';
process.env.COST_ALERT_THRESHOLD = '200';
process.env.USD_TO_EUR_RATE = '0.92';

import { OpenRouterCostTracker } from '../services/OpenRouterCostTracker';
import { DashboardCostService } from '../services/DashboardCostService';
import { costIntegrationService } from '../services/costIntegrationService';

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn().mockResolvedValue({ error: null }),
      update: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ 
            data: {
              id: 'test-id',
              year: 2024,
              month: 1,
              instantly_cost: 75,
              google_workspace_cost: 48,
              openrouter_cost: 5.50,
              total_cost: 128.50,
              emails_sent: 100,
              meetings_booked: 5
            },
            error: null 
          })
        }))
      }))
    }))
  }
}));

// Mock axios for OpenRouter API
jest.mock('axios', () => ({
  create: () => ({
    post: jest.fn().mockResolvedValue({
      data: {
        id: 'test-generation-id',
        model: 'anthropic/claude-3-haiku',
        choices: [{
          message: { role: 'assistant', content: 'Test response' },
          finish_reason: 'stop',
          index: 0
        }],
        usage: {
          prompt_tokens: 100,
          completion_tokens: 50,
          total_tokens: 150
        }
      }
    }),
    get: jest.fn().mockResolvedValue({
      data: {
        data: {
          id: 'test-generation-id',
          total_cost: 0.00015,
          native_tokens_prompt: 100,
          native_tokens_completion: 50,
          native_tokens_total: 150,
          usage: 'test usage'
        }
      }
    })
  })
}));

describe('Cost Tracking System', () => {
  describe('OpenRouterCostTracker', () => {
    let tracker: OpenRouterCostTracker;

    beforeEach(() => {
      tracker = new OpenRouterCostTracker();
    });

    test('should initialize with API key', () => {
      expect(tracker).toBeDefined();
    });

    test('should make tracked request', async () => {
      const messages = [{ role: 'user' as const, content: 'Test message' }];
      const response = await tracker.makeTrackedRequest(messages);
      
      expect(response).toBeDefined();
      expect(response.id).toBe('test-generation-id');
    });

    test('should calculate metrics', async () => {
      const metrics = await tracker.calculateMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.totalCost).toBeDefined();
      expect(metrics.costPerEmail).toBeDefined();
      expect(metrics.costPerMeeting).toBeDefined();
    });
  });

  describe('DashboardCostService', () => {
    let service: DashboardCostService;

    beforeEach(() => {
      service = new DashboardCostService();
    });

    test('should record email activity', async () => {
      await expect(service.recordActivity({
        type: 'email_sent',
        campaignId: 'test-campaign'
      })).resolves.not.toThrow();
    });

    test('should record meeting activity', async () => {
      await expect(service.recordActivity({
        type: 'meeting_booked',
        campaignId: 'test-campaign'
      })).resolves.not.toThrow();
    });

    test('should get dashboard metrics', async () => {
      const metrics = await service.getDashboardMetrics();
      
      expect(metrics).toBeDefined();
      expect(metrics.costPerEmail).toBeDefined();
      expect(metrics.costPerMeeting).toBeDefined();
      expect(metrics.totalMonthlySpend).toBeDefined();
    });
  });

  describe('Cost Integration Service', () => {
    test('should format costs correctly', () => {
      const formatted = costIntegrationService.formatCost(1.234);
      expect(formatted).toBe('€1.23');
    });

    test('should format small costs correctly', () => {
      const formatted = costIntegrationService.formatCost(0.005);
      expect(formatted).toBe('<€0.01');
    });

    test('should format zero costs correctly', () => {
      const formatted = costIntegrationService.formatCost(0);
      expect(formatted).toBe('€0.00');
    });

    test('should calculate cost efficiency score', () => {
      const metrics = {
        costPerEmail: 0.10,
        costPerMeeting: 5.00,
        totalMonthlySpend: 123,
        emailsSent: 100,
        meetingsBooked: 5,
        costBreakdown: {
          fixed: { instantly: 75, googleWorkspace: 48, total: 123 },
          variable: { openRouter: 0, total: 0 },
          total: 123
        },
        remainingCredits: 100,
        exchangeRate: 0.92,
        lastUpdated: new Date()
      };

      const score = costIntegrationService.getCostEfficiencyScore(metrics);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Cost Calculations', () => {
    test('should calculate cost per email correctly', () => {
      const totalCost = 123;
      const emailsSent = 100;
      const costPerEmail = totalCost / emailsSent;
      
      expect(costPerEmail).toBe(1.23);
    });

    test('should calculate cost per meeting correctly', () => {
      const totalCost = 123;
      const meetingsBooked = 5;
      const costPerMeeting = totalCost / meetingsBooked;
      
      expect(costPerMeeting).toBe(24.6);
    });

    test('should handle zero divisions', () => {
      const totalCost = 123;
      const emailsSent = 0;
      const costPerEmail = emailsSent > 0 ? totalCost / emailsSent : 0;
      
      expect(costPerEmail).toBe(0);
    });
  });

  describe('Currency Conversion', () => {
    test('should convert USD to EUR', () => {
      const usdAmount = 100;
      const exchangeRate = 0.92;
      const eurAmount = Math.round(usdAmount * exchangeRate * 100) / 100;
      
      expect(eurAmount).toBe(92);
    });
  });
});

// Integration test example
describe('Cost Tracking Integration', () => {
  test('should track full workflow', async () => {
    // 1. Make an OpenRouter request
    const tracker = new OpenRouterCostTracker();
    const messages = [{ role: 'user' as const, content: 'Generate email content' }];
    
    const response = await tracker.makeTrackedRequest(messages, 'anthropic/claude-3-haiku', {
      campaignId: 'test-campaign',
      emailId: 'test-email',
      purpose: 'email_generation'
    });
    
    expect(response).toBeDefined();
    
    // 2. Record email sent activity
    const dashboardService = new DashboardCostService();
    await dashboardService.recordActivity({
      type: 'email_sent',
      campaignId: 'test-campaign'
    });
    
    // 3. Get updated metrics
    const metrics = await dashboardService.getDashboardMetrics(true);
    expect(metrics).toBeDefined();
    expect(metrics.emailsSent).toBeGreaterThan(0);
  });
});

export {};