import React from 'react';
import { Globe, ListTodo, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { ProgressBar } from './ProgressBar';

interface SummaryCardsProps {
  websiteUrl: string;
  totalTasks: number;
  completedTasks: number;
  incompleteTasks: number;
  completionPercentage: number;
  websiteName?: string;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({
  websiteUrl,
  totalTasks,
  completedTasks,
  incompleteTasks,
  completionPercentage,
  websiteName,
}) => {
  return (
    <div className="space-y-4">
      {/* Prominent Website Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-600/30 text-blue-400 rounded-lg border border-blue-500/30">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Target Website
            </span>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              {websiteUrl ? (
                <span className="break-all">{websiteUrl}</span>
              ) : (
                <span className="text-slate-500 italic">No URL specified</span>
              )}
            </h2>
            {websiteName && (
              <p className="text-xs text-slate-400 mt-0.5">
                Site Name: <span className="text-slate-200 font-medium">{websiteName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Mini progress tracker */}
        <div className="md:w-72 bg-slate-800/80 p-3 rounded-lg border border-slate-700/80">
          <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
            <span className="text-slate-300">Readiness Score</span>
            <span className="text-emerald-400 font-bold">{completionPercentage}%</span>
          </div>
          <ProgressBar percentage={completionPercentage} heightClass="h-2.5" />
        </div>
      </div>

      {/* 4 Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tasks */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-slate-100 text-slate-700 rounded-lg">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Total Tasks
            </p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{totalTasks}</p>
          </div>
        </div>

        {/* Completed Tasks */}
        <div className="bg-emerald-50/70 rounded-xl p-4 border border-emerald-200 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
              Completed
            </p>
            <p className="text-2xl font-bold text-emerald-800 mt-0.5">{completedTasks}</p>
          </div>
        </div>

        {/* Incomplete Tasks */}
        <div className="bg-rose-50/70 rounded-xl p-4 border border-rose-200 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-rose-100 text-rose-700 rounded-lg">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-rose-700 uppercase tracking-wide">
              Incomplete
            </p>
            <p className="text-2xl font-bold text-rose-800 mt-0.5">{incompleteTasks}</p>
          </div>
        </div>

        {/* Progress Percentage */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex items-center gap-3.5">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Progress
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">{completionPercentage}%</p>
          </div>
        </div>
      </div>
    </div>
  );
};
