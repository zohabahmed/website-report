import React, { useState, useEffect } from 'react';
import {
  Search,
  Calendar,
  Eye,
  Edit3,
  Copy,
  Trash2,
  Download,
  PlusCircle,
  ArrowUpDown,
  Globe,
  FileSpreadsheet,
  ExternalLink,
} from 'lucide-react';
import { WebsiteReport } from '../types';
import { api } from '../services/api';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ProgressBar } from '../components/ProgressBar';
import { exportReportToPdf } from '../services/clientPdf';
import { useToast } from '../context/ToastContext';

interface ReportHistoryPageProps {
  onViewReport: (report: WebsiteReport) => void;
  onEditReport: (report: WebsiteReport) => void;
  onCreateNew: () => void;
}

export const ReportHistoryPage: React.FC<ReportHistoryPageProps> = ({
  onViewReport,
  onEditReport,
  onCreateNew,
}) => {
  const { showToast } = useToast();
  const [reports, setReports] = useState<WebsiteReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at'>('created_at');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [exportingExcel, setExportingExcel] = useState<boolean>(false);

  // Delete modal state
  const [reportToDelete, setReportToDelete] = useState<WebsiteReport | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  const handleExportExcel = async (month?: string) => {
    setExportingExcel(true);
    try {
      await api.downloadMasterExcel(month);
      showToast('Master Excel report exported successfully.', 'success');
    } catch (err: any) {
      showToast('Excel export failed: ' + err.message, 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await api.getReports(search, sortBy, sortOrder);
      setReports(data.reports);
    } catch (err: any) {
      showToast('Failed to load reports: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [search, sortBy, sortOrder]);

  // Duplicate report action
  const handleDuplicate = async (report: WebsiteReport) => {
    try {
      const res = await api.duplicateReport(report.id);
      showToast(`Duplicated report for ${report.websiteUrl}.`, 'success');
      fetchReports();
    } catch (err: any) {
      showToast('Failed to duplicate: ' + err.message, 'error');
    }
  };

  // Confirm delete action
  const confirmDelete = async () => {
    if (!reportToDelete) return;
    setDeleting(true);
    try {
      await api.deleteReport(reportToDelete.id);
      showToast(`Deleted report for ${reportToDelete.websiteUrl}.`, 'info');
      setReportToDelete(null);
      fetchReports();
    } catch (err: any) {
      showToast('Failed to delete report: ' + err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Quick download PDF from history
  const handleDownload = async (report: WebsiteReport) => {
    try {
      try {
        const safeUrl = report.websiteUrl.replace(/^https?:\/\//i, '').replace(/[^a-zA-Z0-9_-]/g, '_');
        await api.downloadPdf(report.id, `report-${safeUrl}-${report.reportDate}.pdf`);
        showToast('PDF downloaded.', 'success');
      } catch {
        exportReportToPdf(report);
        showToast('PDF exported.', 'success');
      }
    } catch (err: any) {
      showToast('PDF export failed: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Saved Reports & Audit History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            View past maintenance records, edit saved audits, duplicate prior reports, or export Excel workbooks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Open Live Google Sheet Button */}
          <a
            href="https://docs.google.com/spreadsheets/d/14CCuvMZ0L-ue5nTuIfndTPMKo_0Tdn0Fa3PDlQyVLK0/edit?gid=0#gid=0"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <span>Open Google Sheet</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </a>

          {/* Download Monthly Excel Button */}
          <button
            type="button"
            onClick={() => handleExportExcel(selectedMonth)}
            disabled={exportingExcel}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold shadow-xs transition-all disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exportingExcel ? 'Exporting...' : 'Export Excel (.xlsx)'}
          </button>

          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all hover:scale-[1.01]"
          >
            <PlusCircle className="w-4 h-4" />
            New Report
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by website URL, website name, or client name..."
            className="w-full text-xs pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>Sort by:</span>
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none font-medium text-slate-700"
          >
            <option value="created_at">Creation Date</option>
            <option value="updated_at">Last Modified Date</option>
          </select>

          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 font-semibold text-slate-700 transition-colors"
          >
            {sortOrder === 'desc' ? 'Newest First ↓' : 'Oldest First ↑'}
          </button>
        </div>
      </div>

      {/* Reports Table / Card List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">Loading saved reports...</div>
        ) : reports.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Globe className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700">No reports found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {search
                ? `No reports matched your search query "${search}". Try searching for another URL.`
                : 'No website maintenance reports have been recorded yet.'}
            </p>
            <button
              type="button"
              onClick={onCreateNew}
              className="mt-2 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
            >
              + Create your first maintenance report
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3.5 px-4">Website & Target</th>
                  <th className="py-3.5 px-3">Report Date</th>
                  <th className="py-3.5 px-3">Created / Modified</th>
                  <th className="py-3.5 px-4 w-48">Progress & Tasks</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {reports.map((report, idx) => (
                  <tr
                    key={report.id}
                    className={`hover:bg-blue-50/40 transition-colors ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                    }`}
                  >
                    {/* Website */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-700 border border-slate-200">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-xs hover:text-blue-600 cursor-pointer" onClick={() => onViewReport(report)}>
                            {report.websiteUrl}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {report.websiteName} {report.clientName ? `• ${report.clientName}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Report Date */}
                    <td className="py-3.5 px-3 font-semibold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        {report.reportDate}
                      </span>
                    </td>

                    {/* Created vs Modified */}
                    <td className="py-3.5 px-3 text-[11px] text-slate-500 space-y-0.5">
                      <div>
                        Created: <span className="text-slate-700 font-medium">{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="text-slate-400">
                        Modified: <span className="text-slate-600">{new Date(report.updatedAt).toLocaleDateString()}</span>
                      </div>
                    </td>

                    {/* Progress */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-slate-800">
                            {report.completedTasks} / {report.totalTasks} Done
                          </span>
                          <span
                            className={`font-bold ${
                              report.completionPercentage === 100
                                ? 'text-emerald-600'
                                : 'text-blue-600'
                            }`}
                          >
                            {report.completionPercentage}%
                          </span>
                        </div>
                        <ProgressBar percentage={report.completionPercentage} heightClass="h-2" />
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        {/* View Preview */}
                        <button
                          type="button"
                          onClick={() => onViewReport(report)}
                          title="View Report Preview"
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Edit Report */}
                        <button
                          type="button"
                          onClick={() => onEditReport(report)}
                          title="Edit Report Checklist"
                          className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Duplicate */}
                        <button
                          type="button"
                          onClick={() => handleDuplicate(report)}
                          title="Duplicate as New Report"
                          className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>

                        {/* Download PDF */}
                        <button
                          type="button"
                          onClick={() => handleDownload(report)}
                          title="Download PDF"
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Download Excel */}
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await api.downloadReportExcel(report.id);
                              showToast(`Exported ${report.websiteUrl} to Excel.`, 'success');
                            } catch (e: any) {
                              showToast('Excel download failed: ' + e.message, 'error');
                            }
                          }}
                          title="Download Excel Spreadsheet (.xlsx)"
                          className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <FileSpreadsheet className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          onClick={() => setReportToDelete(report)}
                          title="Delete Report"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!reportToDelete}
        title="Delete Maintenance Report?"
        message={`Are you sure you want to permanently delete the report for "${reportToDelete?.websiteUrl}" dated ${reportToDelete?.reportDate}? This action cannot be undone.`}
        confirmLabel={deleting ? 'Deleting...' : 'Delete Permanently'}
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setReportToDelete(null)}
      />
    </div>
  );
};
