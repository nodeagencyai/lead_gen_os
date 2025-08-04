/**
 * Test suite for LeadsDatabase filter functionality
 * Verifies that all filters work correctly
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the campaign store
jest.mock('../../store/campaignStore', () => ({
  useCampaignStore: jest.fn(() => ({
    mode: 'email',
    setMode: jest.fn(),
  })),
}));

// Mock the leads service
jest.mock('../../services/leadsService', () => ({
  LeadsService: {
    getLeads: jest.fn(),
    getApolloLeads: jest.fn(),
    getLinkedInLeads: jest.fn(),
  },
}));

import LeadsDatabase from '../LeadsDatabase';
import { LeadsService } from '../../services/leadsService';

const mockLeadsService = LeadsService as jest.Mocked<typeof LeadsService>;

const sampleLeads = [
  {
    id: 1,
    full_name: 'John Doe',
    title: 'CEO',
    company: 'Tech Corp',
    email: 'john@techcorp.com',
    niche: 'SaaS',
    tags: ['enterprise', 'b2b'],
    created_at: '2024-01-15T10:00:00Z',
    instantly_synced: true,
    selected: false,
  },
  {
    id: 2,
    full_name: 'Jane Smith',
    title: 'CTO',
    company: 'AI Startup',
    email: 'jane@ai-startup.com',
    niche: 'AI',
    tags: ['startup', 'tech'],
    created_at: '2024-01-20T15:30:00Z',
    instantly_synced: false,
    selected: false,
  },
  {
    id: 3,
    full_name: 'Bob Johnson',
    title: 'Marketing Director',
    company: 'Digital Agency',
    email: 'bob@digitalagency.com',
    niche: 'Marketing',
    tags: ['agency', 'marketing'],
    created_at: '2024-01-10T09:15:00Z',
    instantly_synced: true,
    selected: false,
  },
];

describe('LeadsDatabase Filters', () => {
  const mockOnNavigate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockLeadsService.getApolloLeads.mockResolvedValue(sampleLeads);
    mockLeadsService.getLinkedInLeads.mockResolvedValue([]);
  });

  it('renders filter button and opens filter panel', async () => {
    render(<LeadsDatabase onNavigate={mockOnNavigate} />);

    // Wait for leads to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Find and click the filters button
    const filtersButton = screen.getByText('Filters');
    expect(filtersButton).toBeInTheDocument();

    fireEvent.click(filtersButton);

    // Check if filter panel appears
    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g., SaaS, Fintech...')).toBeInTheDocument();
    });
  });

  it('filters leads by search term', async () => {
    render(<LeadsDatabase onNavigate={mockOnNavigate} />);

    // Wait for leads to load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    // Search for "John"
    const searchInput = screen.getByPlaceholderText('Search leads...');
    await userEvent.type(searchInput, 'John');

    // Should show only John Doe
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
    });
  });

  it('filters leads by niche', async () => {
    render(<LeadsDatabase onNavigate={mockOnNavigate} />);

    // Wait for leads to load and open filters
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);

    // Wait for filter panel and filter by SaaS niche
    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g., SaaS, Fintech...')).toBeInTheDocument();
    });

    const nicheInput = screen.getByPlaceholderText('e.g., SaaS, Fintech...');
    await userEvent.type(nicheInput, 'SaaS');

    // Should show only John Doe (SaaS niche)
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
    });
  });

  it('filters leads by tags', async () => {
    render(<LeadsDatabase onNavigate={mockOnNavigate} />);

    // Wait for leads to load and open filters
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);

    // Wait for filter panel and filter by tag
    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g., enterprise, b2b...')).toBeInTheDocument();
    });

    const tagInput = screen.getByPlaceholderText('e.g., enterprise, b2b...');
    await userEvent.type(tagInput, 'startup');

    // Should show only Jane Smith (has startup tag)
    await waitFor(() => {
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
    });
  });

  it('filters leads by sync status', async () => {
    render(<LeadsDatabase onNavigate={mockOnNavigate} />);

    // Wait for leads to load and open filters
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);

    // Wait for filter panel and click "Synced Only"
    await waitFor(() => {
      expect(screen.getByText('Synced Only')).toBeInTheDocument();
    });

    const syncedButton = screen.getByText('Synced Only');
    fireEvent.click(syncedButton);

    // Should show only synced leads (John Doe and Bob Johnson)
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });
  });

  it('shows correct lead count with filters', async () => {
    render(<LeadsDatabase onNavigate={mockOnNavigate} />);

    // Wait for leads to load
    await waitFor(() => {
      expect(screen.getByText('3 leads • 0 selected')).toBeInTheDocument();
    });

    // Apply search filter
    const searchInput = screen.getByPlaceholderText('Search leads...');
    await userEvent.type(searchInput, 'John');

    // Should show filtered count
    await waitFor(() => {
      expect(screen.getByText('1 leads • 0 selected')).toBeInTheDocument();
    });
  });

  it('resets filters when clear button is clicked', async () => {
    render(<LeadsDatabase onNavigate={mockOnNavigate} />);

    // Wait for leads to load and open filters
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);

    // Apply niche filter
    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g., SaaS, Fintech...')).toBeInTheDocument();
    });

    const nicheInput = screen.getByPlaceholderText('e.g., SaaS, Fintech...');
    await userEvent.type(nicheInput, 'SaaS');

    // Verify filter is applied
    await waitFor(() => {
      expect(screen.getByText('1 leads match your filters')).toBeInTheDocument();
    });

    // Click clear filters
    const clearButton = screen.getByText('Clear Filters');
    fireEvent.click(clearButton);

    // Should show all leads again
    await waitFor(() => {
      expect(screen.getByText('3 leads match your filters')).toBeInTheDocument();
    });
  });

  it('combines multiple filters correctly', async () => {
    render(<LeadsDatabase onNavigate={mockOnNavigate} />);

    // Wait for leads to load and open filters
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);

    // Apply both niche and search filters
    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g., SaaS, Fintech...')).toBeInTheDocument();
    });

    // Search for "John" AND filter by SaaS
    const searchInput = screen.getByPlaceholderText('Search leads...');
    await userEvent.type(searchInput, 'Tech');

    const nicheInput = screen.getByPlaceholderText('e.g., SaaS, Fintech...');
    await userEvent.type(nicheInput, 'SaaS');

    // Should show only John Doe (matches both "Tech" in company and "SaaS" niche)
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
    });
  });
});