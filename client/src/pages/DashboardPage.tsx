import React, { useState, useEffect } from 'react';
import {
  PlusCircle,
  Search,
  Globe,
  FileCheck2,
  Calendar,
  Clock,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Eye,
  Filter,
} from 'lucide-react';
import { WebsiteReport } from '../types';
import { api } from '../services/api';
import { ProgressBar } from '../components/ProgressBar';
import { useToast } from '../context/ToastContext';

interface DashboardPageProps {
  onCreateNew: () => void;
  onViewReport: (report: WebsiteReport) => void;
  onEditReport: (report: WebsiteReport) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onCreateNew,
  onViewReport,
  onEditReport,
}) => {
  const { showToast } = useToast();
  const [reports, setReports] = useState<WebsiteReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'in_progress'>('all');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await api.getReports(search);
      setReports(data.reports);
    } catch (err: any) {
      showToast('Failed to load dashboard reports: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [search]);

  // Statistics
  const totalReports = reports.length;
  const uniqueWebsites = new Set(
    reports.map((r) => r.websiteUrl.toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, ''))
  ).size;

  const averageCompletion =
    totalReports === 0
      ? 0
      : Math.round(reports.reduce((acc, r) => acc + r.completionPercentage, 0) / totalReports);

  // Filtered reports
  const displayReports = reports.filter((r) => {
    if (filterStatus === 'completed') return r.completionPercentage === 100;
    if (filterStatus === 'in_progress') return r.completionPercentage < 100;
    return true;
  });

  // Recently created (sorted by createdAt)
  const recentlyCreated = [...displayReports]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Recently updated (sorted by updatedAt)
  const recentlyUpdated = [...displayReports]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Welcome & Action Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div>
          <span className="px-3 py-1 bg-blue-600/30 text-blue-400 rounded-full text-xs font-semibold tracking-wider uppercase border border-blue-500/30">
            Maintenance Operations Hub
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 text-white">
            Website Maintenance & Upgrade Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Record WordPress updates, security configurations, Elastic Email verification, and technical QA checks to generate professional client reports.
          </p>
        </div>

        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] flex-shrink-0"
        >
          <PlusCircle className="w-5 h-5" />
          Create New Report
        </button>
      </div>

      {/* Overview Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reports */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Saved Reports
            </span>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{totalReports}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <FileCheck2 className="w-6 h-6" />
          </div>
        </div>

        {/* Websites Tracked */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Websites Tracked
            </span>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{uniqueWebsites}</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Globe className="w-6 h-6" />
          </div>
        </div>

        {/* Average Readiness */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Average Completion
            </span>
            <p className="text-3xl font-extrabold text-slate-900 mt-1">{averageCompletion}%</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Action Callout */}
        <div className="bg-gradient-to-br from-blue-700 to-indigo-800 rounded-xl p-5 text-white shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-blue-200 font-semibold">
              Fast Workflow
            </span>
            <p className="text-sm font-bold mt-0.5">Generate Instant Report</p>
          </div>
          <button
            type="button"
            onClick={onCreateNew}
            className="mt-3 text-xs font-bold text-white bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg flex items-center justify-between transition-colors"
          >
            <span>Start Fresh Checklist</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reports by website URL, website name, or client..."
            className="w-full text-xs pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filterStatus === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
              }`}
            >
              All ({totalReports})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('completed')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filterStatus === 'completed'
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              100% Done
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('in_progress')}
              className={`px-3 py-1 rounded-md transition-colors ${
                filterStatus === 'in_progress'
                  ? 'bg-white text-rose-800 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              In Progress
            </button>
          </div>
        </div>
      </div>

      {/* Dual Columns: Recently Created vs Recently Updated */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recently Created Reports */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Recently Created Reports</span>
            </div>
            <span className="text-xs text-slate-400 font-medium">By initial date</span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading reports...</div>
          ) : recentlyCreated.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No reports created yet.{' '}
              <button onClick={onCreateNew} className="text-blue-600 font-bold hover:underline">
                Create one now
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentlyCreated.map((report) => (
                <div
                  key={`created-${report.id}`}
                  className="p-3.5 rounded-xl border border-slate-200/80 hover:border-blue-300 hover:shadow-xs transition-all bg-slate-50/50 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {report.websiteUrl}
                      </span>
                      {report.completionPercentage === 100 ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> 100%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                          {report.completionPercentage}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                      <span>{report.websiteName}</span>
                      <span>•</span>
                      <span>{report.reportDate}</span>
                      <span>•</span>
                      <span>{report.completedTasks}/{report.totalTasks} Done</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onViewReport(report)}
                      title="View Report Preview"
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditReport(report)}
                      title="Edit Report"
                      className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recently Updated Reports */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Clock className="w-4 h-4 text-emerald-600" />
              <span>Recently Updated Reports</span>
            </div>
            <span className="text-xs text-slate-400 font-medium">By last modified</span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading reports...</div>
          ) : recentlyUpdated.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No updated reports yet.
            </div>
          ) : (
            <div className="space-y-3">
              {recentlyUpdated.map((report) => (
                <div
                  key={`updated-${report.id}`}
                  className="p-3.5 rounded-xl border border-slate-200/80 hover:border-emerald-300 hover:shadow-xs transition-all bg-slate-50/50 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {report.websiteUrl}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        Updated {new Date(report.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mt-1.5 w-44">
                      <ProgressBar percentage={report.completionPercentage} heightClass="h-1.5" />
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onViewReport(report)}
                      title="View Report Preview"
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onEditReport(report)}
                      title="Edit Report"
                      className="text-xs font-semibold px-2.5 py-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
