import React from 'react';

// Radial Completion Gauge
export const CompletionGaugeChart: React.FC<{
  percentage: number;
  label?: string;
  size?: number;
}> = ({ percentage, label = 'Tỷ lệ hoàn thành', size = 160 }) => {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, percentage)) / 100) * circumference;

  let color = '#2563eb'; // Blue
  if (percentage >= 85) color = '#10b981'; // Emerald
  else if (percentage < 60) color = '#f43f5e'; // Rose

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e2e8f0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Foreground progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold tracking-tight text-slate-800">{percentage}%</span>
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{percentage >= 80 ? 'Tốt' : percentage >= 60 ? 'Đạt' : 'Cần chú ý'}</span>
        </div>
      </div>
      {label && <span className="mt-2 text-xs font-medium text-slate-600 text-center">{label}</span>}
    </div>
  );
};

// Trend Line Chart
export const TrendLineChart: React.FC<{
  points: { label: string; score: number | null }[];
  height?: number;
}> = ({ points, height = 180 }) => {
  const validPoints = points.filter((p) => p.score !== null);
  if (validPoints.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center bg-slate-50 rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
        Chưa có dữ liệu điểm đánh giá
      </div>
    );
  }

  const padding = 28;
  const width = 360;
  const maxScore = 10;
  const minScore = 0;

  const getX = (index: number) => {
    if (points.length <= 1) return width / 2;
    return padding + (index * (width - 2 * padding)) / (points.length - 1);
  };

  const getY = (score: number) => {
    return height - padding - ((score - minScore) / (maxScore - minScore)) * (height - 2 * padding);
  };

  // Build SVG path
  const pathD = points.reduce((acc, point, index) => {
    if (point.score === null) return acc;
    const x = getX(index);
    const y = getY(point.score);
    if (acc === '') return `M ${x} ${y}`;
    return `${acc} L ${x} ${y}`;
  }, '');

  return (
    <div className="w-full">
      <svg className="w-full overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        {/* Horizontal grid lines */}
        {[0, 2.5, 5, 7.5, 10].map((val) => {
          const y = getY(val);
          return (
            <g key={val}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
              <text x={padding - 6} y={y + 3} textAnchor="end" className="text-[10px] fill-slate-400 font-mono">
                {val}
              </text>
            </g>
          );
        })}

        {/* Path line */}
        {pathD && <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

        {/* Point circles */}
        {points.map((p, idx) => {
          if (p.score === null) return null;
          const x = getX(idx);
          const y = getY(p.score);
          return (
            <g key={idx} className="group cursor-pointer">
              <circle cx={x} cy={y} r="5" fill="#ffffff" stroke="#2563eb" strokeWidth="2.5" />
              <text x={x} y={y - 8} textAnchor="middle" className="text-[11px] font-bold fill-blue-700 font-mono">
                {p.score}
              </text>
              <text x={x} y={height - 8} textAnchor="middle" className="text-[10px] fill-slate-500 font-medium">
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Class Comparison Bar Chart
export const ClassComparisonBarChart: React.FC<{
  data: { className: string; completionRate: number; averageScore: number | null }[];
  height?: number;
}> = ({ data, height = 200 }) => {
  const barWidth = 32;
  const paddingX = 40;
  const width = Math.max(380, data.length * 80 + paddingX * 2);

  return (
    <div className="w-full overflow-x-auto">
      <svg className="w-full min-w-[360px]" viewBox={`0 0 ${width} ${height}`}>
        {/* Y Axis Reference Lines */}
        {[0, 25, 50, 75, 100].map((pct) => {
          const y = height - 35 - (pct / 100) * (height - 60);
          return (
            <g key={pct}>
              <line x1={35} y1={y} x2={width - 20} y2={y} stroke="#f1f5f9" strokeDasharray="2 2" />
              <text x={28} y={y + 3} textAnchor="end" className="text-[9px] fill-slate-400 font-mono">
                {pct}%
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((item, idx) => {
          const x = 50 + idx * 80;
          const barHeight = (item.completionRate / 100) * (height - 60);
          const y = height - 35 - barHeight;

          return (
            <g key={item.className}>
              {/* Bar background */}
              <rect
                x={x}
                y={height - 35 - (height - 60)}
                width={barWidth}
                height={height - 60}
                rx="4"
                fill="#f8fafc"
              />
              {/* Active Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="4"
                fill={item.completionRate >= 80 ? '#3b82f6' : item.completionRate >= 60 ? '#60a5fa' : '#f87171'}
                className="transition-all duration-500 ease-out"
              />
              {/* Value Label */}
              <text
                x={x + barWidth / 2}
                y={y - 5}
                textAnchor="middle"
                className="text-[10px] font-bold fill-slate-700"
              >
                {item.completionRate}%
              </text>
              {/* Class Name Label */}
              <text
                x={x + barWidth / 2}
                y={height - 15}
                textAnchor="middle"
                className="text-[11px] font-semibold fill-slate-700"
              >
                {item.className}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// Stacked Status Distribution Bar
export const StatusDistributionBar: React.FC<{
  counts: {
    completed: number;
    late: number;
    submitted: number;
    notStarted: number;
    needsRevision: number;
    exempt: number;
  };
}> = ({ counts }) => {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (total === 0) return <div className="text-xs text-slate-400">Không có dữ liệu bài nộp</div>;

  const items = [
    { label: 'Hoàn thành', count: counts.completed, color: 'bg-emerald-500', text: 'text-emerald-700' },
    { label: 'Nộp muộn', count: counts.late, color: 'bg-amber-500', text: 'text-amber-700' },
    { label: 'Chờ chấm', count: counts.submitted, color: 'bg-blue-500', text: 'text-blue-700' },
    { label: 'Cần sửa', count: counts.needsRevision, color: 'bg-orange-500', text: 'text-orange-700' },
    { label: 'Chưa nộp', count: counts.notStarted, color: 'bg-rose-500', text: 'text-rose-700' },
    { label: 'Miễn', count: counts.exempt, color: 'bg-slate-300', text: 'text-slate-600' },
  ];

  return (
    <div className="w-full space-y-2">
      {/* Progress track */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
        {items.map((it, idx) => {
          if (it.count === 0) return null;
          const widthPct = (it.count / total) * 100;
          return (
            <div
              key={idx}
              style={{ width: `${widthPct}%` }}
              className={`${it.color} transition-all duration-500 hover:opacity-90`}
              title={`${it.label}: ${it.count} (${widthPct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        {items.map((it, idx) => {
          if (it.count === 0) return null;
          return (
            <div key={idx} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm ${it.color}`} />
              <span className="text-slate-600">{it.label}:</span>
              <span className="font-semibold text-slate-900">{it.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
