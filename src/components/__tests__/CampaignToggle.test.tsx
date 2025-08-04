/**
 * Test suite for CampaignToggle component
 * Tests the dual-mode switching functionality
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CampaignToggle from '../CampaignToggle';

// Mock the campaign store
jest.mock('../../store/campaignStore', () => ({
  useCampaignStore: jest.fn(),
}));

import { useCampaignStore } from '../../store/campaignStore';

const mockUseCampaignStore = useCampaignStore as jest.MockedFunction<typeof useCampaignStore>;

describe('CampaignToggle', () => {
  const mockSetMode = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCampaignStore.mockReturnValue({
      mode: 'email',
      setMode: mockSetMode,
    });
  });

  it('renders email and linkedin toggle buttons', () => {
    render(<CampaignToggle />);
    
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
  });

  it('shows email as active when mode is email', () => {
    mockUseCampaignStore.mockReturnValue({
      mode: 'email',
      setMode: mockSetMode,
    });

    render(<CampaignToggle />);
    
    const emailButton = screen.getByText('Email').closest('button');
    const linkedinButton = screen.getByText('LinkedIn').closest('button');
    
    expect(emailButton).toHaveStyle('background-color: white');
    expect(linkedinButton).not.toHaveStyle('background-color: white');
  });

  it('shows linkedin as active when mode is linkedin', () => {
    mockUseCampaignStore.mockReturnValue({
      mode: 'linkedin',
      setMode: mockSetMode,
    });

    render(<CampaignToggle />);
    
    const emailButton = screen.getByText('Email').closest('button');
    const linkedinButton = screen.getByText('LinkedIn').closest('button');
    
    expect(linkedinButton).toHaveStyle('background-color: white');
    expect(emailButton).not.toHaveStyle('background-color: white');
  });

  it('calls setMode when switching to linkedin', () => {
    render(<CampaignToggle />);
    
    const linkedinButton = screen.getByText('LinkedIn');
    fireEvent.click(linkedinButton);
    
    expect(mockSetMode).toHaveBeenCalledWith('linkedin');
  });

  it('calls setMode when switching to email', () => {
    mockUseCampaignStore.mockReturnValue({
      mode: 'linkedin',
      setMode: mockSetMode,
    });

    render(<CampaignToggle />);
    
    const emailButton = screen.getByText('Email');
    fireEvent.click(emailButton);
    
    expect(mockSetMode).toHaveBeenCalledWith('email');
  });
});