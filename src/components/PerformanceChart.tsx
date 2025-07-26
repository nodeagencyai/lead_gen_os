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
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  title,
  data,
  totalValue,
  changePercent,
  isPositive,
  color = '#888888'
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
    return `Day ${date.getDate()}`;
  };

  // Generate x-axis labels from data
  const xAxisLabels = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    const labelCount = 7;
    const step = Math.max(1, Math.floor(data.length / (labelCount - 1)));
    const labels = [];
    
    for (let i = 0; i < data.length; i += step) {
      if (labels.length < labelCount) {
        labels.push(formatDate(data[i].date));
      }
    }
    
    // Ensure we always show the last data point
    if (labels.length > 0 && data.length > 1) {
      labels[labels.length - 1] = formatDate(data[data.length - 1].date);
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
          Last 30 Days {changePercent}
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
            
            {/* Data points */}
            {data.map((point, index) => {
              const maxValue = Math.max(...data.map(d => d.value));
              const minValue = Math.min(...data.map(d => d.value));
              const range = maxValue - minValue || 1;
              const x = 20 + (index / (data.length - 1)) * 360;
              const y = 80 - ((point.value - minValue) / range) * 60;
              
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="3"
                  fill={color}
                  className="opacity-70 hover:opacity-100 transition-opacity"
                >
                  <title>{`${formatDate(point.date)}: ${point.value}`}</title>
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
      
      <div className="flex justify-between text-xs" style={{ color: '#777777' }}>
        {xAxisLabels.map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
    </div>
  );
};

export default PerformanceChart;