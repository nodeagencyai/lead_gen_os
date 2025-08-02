import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';

interface ChartDataPoint {
  date: string;
  value: number;
}

interface PerformanceChartProps {
  title: string;
  data: ChartDataPoint[];
  totalValue: string;
  changePercent: string;
  isPositive: boolean;
  color?: string;
  timePeriod?: number;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  title,
  data,
  totalValue,
  changePercent,
  isPositive,
  color = '#888888',
  timePeriod = 30
}) => {
  const chartPath = useMemo(() => {
    if (!data || data.length === 0) return '';

    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const range = maxValue - minValue || 1;

    const width = 360;
    const height = 80;
    const padding = 20;

    const points = data.map((point, index) => {
      const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((point.value - minValue) / range) * (height - 2 * padding);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  }, [data]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Generate x-axis labels from data
  const xAxisLabels = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const labelCount = 5; // Reduce to 5 labels for cleaner look
    const step = Math.max(1, Math.floor(data.length / labelCount));
    const labels = [];
    
    // Always show first date
    labels.push(formatDate(data[0].date));
    
    // Show evenly spaced dates in between
    for (let i = 1; i < labelCount - 1; i++) {
      const index = Math.floor((i / (labelCount - 1)) * (data.length - 1));
      labels.push(formatDate(data[index].date));
    }
    
    // Always show last date
    if (data.length > 1) {
      labels.push(formatDate(data[data.length - 1].date));
    }

    return labels;
  }, [data]);

  return (
    <div 
      className="rounded-lg p-6 transition-all duration-200"
      style={{ 
        backgroundColor: '#1a1a1a', 
        border: '1px solid #444444' 
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#666666';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#444444';
      }}
    >
      <div className="mb-4">
        <div className="text-sm mb-2" style={{ color: '#cccccc' }}>{title}</div>
        <div className="text-2xl font-bold text-white">{totalValue}</div>
        <div className="text-sm flex items-center" style={{ color: isPositive ? '#10b981' : '#ef4444' }}>
          <TrendingUp className="w-4 h-4 mr-1" />
          Last {timePeriod} Days {changePercent}
        </div>
      </div>
      
      <div className="h-32 mb-4 relative">
        {data && data.length > 0 ? (
          <svg className="w-full h-full" viewBox="0 0 400 100" fill="none">
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#333333" strokeWidth="0.5" opacity="0.3"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Chart line */}
            <path
              d={chartPath}
              stroke={color}
              strokeWidth="2"
              fill="none"
              className="transition-all duration-300"
            />
          </svg>
        ) : (
          <div className="flex items-center justify-center h-full text-sm" style={{ color: '#666666' }}>
            No data available
          </div>
        )}
      </div>
      
      <div className="flex justify-between text-xs" style={{ color: '#777777' }}>
        {xAxisLabels.map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
    </div>
  );
};

export default PerformanceChart;