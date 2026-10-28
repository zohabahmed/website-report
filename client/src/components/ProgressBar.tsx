import React from 'react';

interface ProgressBarProps {
  percentage: number;
  heightClass?: string;
  showLabel?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  percentage,
  heightClass = 'h-3',
  showLabel = false,
}) => {
  const safePercentage = Math.min(100, Math.max(0, isNaN(percentage) ? 0 : percentage));

  // Determine color based on completion
  let barColor = 'bg-rose-500';
  if (safePercentage === 100) {
    barColor = 'bg-emerald-500';
  } else if (safePercentage >= 70) {
    barColor = 'bg-teal-500';
  } else if (safePercentage >= 40) {
    barColor = 'bg-blue-500';
  } else if (safePercentage > 0) {
    barColor = 'bg-amber-500';
  }

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1 text-xs font-semibold text-slate-700">
          <span>Overall Maintenance Progress</span>
          <span className="font-bold">{safePercentage}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-200 rounded-full overflow-hidden ${heightClass} shadow-inner`}>
        <div
          className={`${barColor} ${heightClass} rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${safePercentage}%` }}
        />
      </div>
    </div>
  );
};
