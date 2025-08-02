/**
 * Status Filter Component for Campaign Overview
 * Provides filtering by campaign status with counts
 */

import React from 'react';
import { CampaignFilter } from '../hooks/useInstantlyCampaignData';

interface StatusFilterProps {
  filter: CampaignFilter;
  setFilter: (filter: CampaignFilter) => void;
  stats: {
    total: number;
    draft: number;
    running: number;
    paused: number;
    stopped: number;
    completed: number;
  };
  loading: boolean;
}

const StatusFilter: React.FC<StatusFilterProps> = ({ 
  filter, 
  setFilter, 
  stats, 
  loading 
}) => {
  const filterOptions: Array<{ key: CampaignFilter; label: string; count: number }> = [
    { key: 'All', label: 'All', count: stats.total },
    { key: 'Draft', label: 'Draft', count: stats.draft },
    { key: 'Running', label: 'Running', count: stats.running },
    { key: 'Paused', label: 'Paused', count: stats.paused },
    { key: 'Stopped', label: 'Stopped', count: stats.stopped },
    { key: 'Completed', label: 'Completed', count: stats.completed }
  ];

  return (
    <div className="flex items-center space-x-2 mb-8 flex-wrap">
      {filterOptions.map(option => (
        <button
          key={option.key}
          onClick={() => setFilter(option.key)}
          disabled={loading}
          className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center space-x-2 ${
            filter === option.key 
              ? 'text-white' 
              : 'text-gray-400 hover:text-white'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{
            backgroundColor: filter === option.key ? '#333333' : '#1a1a1a',
            border: filter === option.key ? '1px solid #555555' : '1px solid #333333'
          }}
        >
          <span>{option.label}</span>
          <span className="text-xs opacity-60">({option.count})</span>
        </button>
      ))}
    </div>
  );
};

export default StatusFilter;