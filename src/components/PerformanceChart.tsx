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
    
    // Hide labels when there's minimal data (less than 3 days)
    if (data.length < 3) return [];
    
    const labelCount = 5; // Reduce to 5 labels for cleaner look
    const _step = Math.max(1, Math.floor(data.length / labelCount));
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
            {/* Background gradient */}
            <defs>
              <linearGradient id={`gradient-${title.replace(/\s+/g, '-')}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={color} stopOpacity="0.2"/>
                <stop offset="100%" stopColor={color} stopOpacity="0.02"/>
              </linearGradient>
              
              {/* Glow effect */}
              <filter id={`glow-${title.replace(/\s+/g, '-')}`}>
                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>
            
            {/* Subtle grid lines */}
            {[20, 40, 60, 80].map((y) => (
              <line
                key={y}
                x1="0"
                y1={y}
                x2="400"
                y2={y}
                stroke="#333333"
                strokeWidth="0.5"
                opacity="0.2"
                strokeDasharray="2,4"
              />
            ))}
            
            {/* Area fill */}
            {chartPath && (
              <path
                d={`${chartPath} L 380,100 L 20,100 Z`}
                fill={`url(#gradient-${title.replace(/\s+/g, '-')})`}
                opacity="0.8"
              />
            )}
            
            {/* Chart line with glow */}
            <path
              d={chartPath}
              stroke={color}
              strokeWidth="2"
              fill="none"
              filter={`url(#glow-${title.replace(/\s+/g, '-')})`}
              className="transition-all duration-300"
            />
            
            {/* Data points */}
            {data.length <= 10 && data.map((point, index) => {
              const width = 360;
              const height = 80;
              const padding = 20;
              const maxValue = Math.max(...data.map(d => d.value));
              const minValue = Math.min(...data.map(d => d.value));
              const range = maxValue - minValue || 1;
              
              const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
              const y = height - padding - ((point.value - minValue) / range) * (height - 2 * padding);
              
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="3"
                  fill={color}
                  opacity="0.8"
                  className="transition-all duration-200 hover:opacity-100"
                >
                  <animate
                    attributeName="r"
                    values="3;4;3"
                    dur="2s"
                    repeatCount="indefinite"
                    begin={`${index * 0.1}s`}
                  />
                </circle>
              );
            })}
          </svg>
        ) : (
          <div className="flex items-center justify-center h-full text-sm" style={{ color: '#666666' }}>
            No data available
          </div>
        )}
      </div>
      
      {xAxisLabels.length > 0 && (
        <div className="flex justify-between text-xs" style={{ color: '#777777' }}>
          {xAxisLabels.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
      )}
    </div>
  );
};

export default PerformanceChart;