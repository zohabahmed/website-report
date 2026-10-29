import React, { useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Edit3,
  Save,
  Copy,
  PlusCircle,
  Globe,
  Calendar,
  User,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Building,
  Check,
  FileSpreadsheet,
} from 'lucide-react';
import { WebsiteReport } from '../types';
import { exportReportToPdf } from '../services/clientPdf';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface ReportPreviewViewProps {
  report: WebsiteReport;
  onEdit: () => void;
  onSave?: (report: WebsiteReport) => Promise<void>;
  onCreateNew: () => void;
  isSaved?: boolean;
}

export const ReportPreviewView: React.FC<ReportPreviewViewProps> = ({
  report,
  onEdit,
  onSave,
  onCreateNew,
  isSaved = true,
}) => {
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savingToSheet, setSavingToSheet] = useState(false);
  const [sheetNotice, setSheetNotice] = useState<string | null>(null);

  const handleSaveToSheet = async () => {
    setSavingToSheet(true);
    setSheetNotice(null);
    try {
      await fetch('https://script.google.com/macros/s/AKfycbzA8RxyLB0yMUWGjCjbAdK63CN3SNwuH8B-zWR2O6z9VKb2i3duAoNtRE4huVegV8Bu/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
        mode: 'no-cors'
      });
      setSheetNotice('Audit successfully saved to connected Google Sheet!');
      showToast('Saved to Google Sheet successfully!', 'success');
    } catch (err: any) {
      showToast('Could not push to Google Sheet: ' + err.message, 'error');
    } finally {
      setSavingToSheet(false);
    }
  };

  // Download Single Report Excel
  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    try {
      if (report.id && !report.id.startsWith('draft-')) {
        await api.downloadReportExcel(report.id);
        showToast('Report exported to Excel (.xlsx) successfully.', 'success');
      } else {
        await api.downloadMasterExcel();
        showToast('Master Excel sheet downloaded.', 'success');
      }
    } catch (err: any) {
      showToast('Excel download failed: ' + err.message, 'error');
    } finally {
      setDownloadingExcel(false);
    }
  };

  // 1. Download PDF (tries server PDF first, falls back smoothly to client-side jsPDF)
  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      if (report.id && !report.id.startsWith('draft-')) {
        try {
          const safeUrl = report.websiteUrl.replace(/^https?:\/\//i, '').replace(/[^a-zA-Z0-9_-]/g, '_');
          await api.downloadPdf(report.id, `report-${safeUrl}-${report.reportDate}.pdf`);
          showToast('PDF downloaded successfully.', 'success');
          return;
        } catch (serverErr) {
          console.warn('Server PDF generation failed, falling back to client PDF:', serverErr);
        }
      }
      // Client-side fallback
      exportReportToPdf(report);
      showToast('PDF exported successfully.', 'success');
    } catch (err: any) {
      console.error('PDF error:', err);
      showToast('Failed to export PDF: ' + err.message, 'error');
    } finally {
      setDownloading(false);
    }
  };

  // 2. Print Report
  const handlePrint = () => {
    window.print();
  };

  // 3. Save Report
  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave(report);
      showToast('Report saved successfully to database.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save report.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 4. Copy Report Text
  const handleCopyText = async () => {
    try {
      let text = `======================================================\n`;
      text += `WEBSITE MAINTENANCE & UPGRADE REPORT\n`;
      text += `======================================================\n\n`;
      text += `Website URL:  ${report.websiteUrl}\n`;
      if (report.websiteName) text += `Website Name: ${report.websiteName}\n`;
      if (report.clientName)  text += `Client Name:  ${report.clientName}\n`;
      text += `Report Date:  ${report.reportDate}\n`;
      if (report.preparedBy)  text += `Prepared By:  ${report.preparedBy}\n`;
      text += `\nPROGRESS SUMMARY:\n`;
      text += `Total Tasks:      ${report.totalTasks}\n`;
      text += `Completed:        ${report.completedTasks}\n`;
      text += `Incomplete:       ${report.incompleteTasks}\n`;
      text += `Completion Rate:  ${report.completionPercentage}%\n\n`;
      text += `EXECUTIVE SUMMARY:\n${report.executiveSummary}\n\n`;
      text += `DETAILED TASK CHECKLIST:\n`;
      report.tasks.forEach((t, i) => {
        const parts: string[] = [];
        if (t.meta?.phpVersion && t.meta.phpVersion.trim()) {
          parts.push(`PHP: ${t.meta.phpVersion.trim()}`);
        }
        if (t.meta?.wpVersion && t.meta.wpVersion.trim()) {
          parts.push(`WP: ${t.meta.wpVersion.trim()}`);
        }
        if (t.meta?.configChanges && t.meta.configChanges.trim()) {
          parts.push(`Config: ${t.meta.configChanges.trim()}`);
        }
        if (t.notes && t.notes.trim()) {
          parts.push(t.notes.trim());
        }
        const details = parts.length > 0 ? parts.join(' — ') : '-';
        text += `${i + 1}. [${t.status === 'Done' ? 'DONE' : 'UNDONE'}] ${t.name} - ${details}\n`;
      });

      if (report.wordpressUsers && report.wordpressUsers.length > 0) {
        text += `\nWORDPRESS USER ACCOUNTS AUDITED:\n`;
        report.wordpressUsers.forEach((u) => {
          text += `- User: ${u.username} (${u.email}) | Role: ${u.role} | 2FA: ${u.twoFactorStatus}${u.notes ? ' | Notes: ' + u.notes : ''}\n`;
        });
      }

      text += `\nFINAL SUMMARY & STATUS:\n${report.finalSummary}\n\n`;
      text += `Generated on ${new Date().toLocaleDateString()} via Website Maintenance & Upgrade Reporting Tool\n`;

      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast('Report text copied to clipboard.', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Failed to copy to clipboard.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Toolbar (Hidden during print) */}
      <div className="no-print bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <FileText className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Report Preview & Export</h2>
            <p className="text-xs text-slate-500">
              Review formatting, export PDF, print, or copy report contents.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Edit */}
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Report
          </button>

          {/* Copy Report Text */}
          <button
            type="button"
            onClick={handleCopyText}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Text'}
          </button>

          {/* Print */}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>

          {/* Download PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {downloading ? 'Exporting PDF...' : 'Download PDF'}
          </button>

          {/* Save to Google Sheet Button */}
          <button
            type="button"
            onClick={handleSaveToSheet}
            disabled={savingToSheet}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
            title="Push this audit report directly to your connected Google Sheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
            <span>{savingToSheet ? 'Saving to Sheet...' : (sheetNotice ? '✓ Saved to Sheet' : 'Save to Sheet')}</span>
          </button>

          {/* Open Google Sheet */}
          <a href="https://docs.google.com/spreadsheets/d/14CCuvMZ0L-ue5nTuIfndTPMKo_0Tdn0Fa3PDlQyVLK0/edit?gid=0#gid=0" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold shadow-xs transition-colors"><FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" /><span>Open Sheet ↗</span></a>

          {/* Download Excel */}
          <button
            type="button"
            onClick={handleDownloadExcel}
            disabled={downloadingExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {downloadingExcel ? 'Exporting Excel...' : 'Download Excel'}
          </button>

          {/* Save Report (if unsaved) */}
          {onSave && !isSaved && (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save to Database'}
            </button>
          )}

          {/* Create New */}
          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors ml-1"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New Report
          </button>
        </div>
      </div>

      {/* Google Sheet Sync Notification Banner */}
      {sheetNotice && (
        <div className="no-print bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl p-3.5 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{sheetNotice}</span>
          </div>
          <div className="flex items-center gap-3">
            <a href="https://docs.google.com/spreadsheets/d/14CCuvMZ0L-ue5nTuIfndTPMKo_0Tdn0Fa3PDlQyVLK0/edit?gid=0#gid=0" target="_blank" rel="noopener noreferrer" className="font-bold underline text-emerald-800 hover:text-emerald-950">
              Open Google Sheet ↗
            </a>
            <button onClick={() => setSheetNotice(null)} className="text-emerald-600 hover:text-emerald-900 font-bold ml-2">✕</button>
          </div>
        </div>
      )}

      {/* Complete Report Document Sheet */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 sm:p-10 max-w-5xl mx-auto space-y-8 print:p-0 print:border-none print:shadow-none">
        {/* A. Report Header */}
        <div className="border-b border-slate-200 pb-6 space-y-5">
          <div className="bg-slate-900 text-white p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 print:bg-slate-900 print:text-white">
            <div>
              <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
                <ShieldCheck className="w-4 h-4" />
                Website Technical Audit & Status
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Website Maintenance & Upgrade Report
              </h1>
              <p className="text-xs text-slate-300 mt-1">
                Formal operational log and security evaluation for production web property.
              </p>
            </div>

            <div className="bg-slate-800/90 border border-slate-700 px-4 py-3 rounded-lg text-right">
              <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-semibold">
                Report Date
              </span>
              <span className="text-base font-bold text-white flex items-center gap-1.5 justify-end">
                <Calendar className="w-4 h-4 text-blue-400" />
                {report.reportDate}
              </span>
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-blue-600" /> Website URL
              </span>
              <p className="text-sm font-bold text-slate-900 mt-1 break-all">
                {report.websiteUrl}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <Building className="w-3.5 h-3.5 text-slate-500" /> Website Name
              </span>
              <p className="text-sm font-bold text-slate-800 mt-1">
                {report.websiteName || 'N/A'}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-500" /> Client Name
              </span>
              <p className="text-sm font-bold text-slate-800 mt-1">
                {report.clientName || 'N/A'}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-500" /> Prepared By
              </span>
              <p className="text-sm font-bold text-slate-800 mt-1">
                {report.preparedBy || 'Engineering Team'}
              </p>
            </div>
          </div>
        </div>

        {/* B. Executive Summary */}
        <div className="space-y-2.5">
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            Executive Summary
          </h2>
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 text-sm text-slate-700 leading-relaxed shadow-xs">
            {report.executiveSummary}
          </div>
        </div>

        {/* C. Task Summary Metrics */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            Maintenance Task Summary
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Total Tasks
              </span>
              <span className="text-2xl font-extrabold text-slate-900 block mt-0.5">
                {report.totalTasks}
              </span>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 block">
                Completed
              </span>
              <span className="text-2xl font-extrabold text-emerald-700 block mt-0.5">
                {report.completedTasks}
              </span>
            </div>

            <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3.5 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-800 block">
                Incomplete
              </span>
              <span className="text-2xl font-extrabold text-rose-700 block mt-0.5">
                {report.incompleteTasks}
              </span>
            </div>

            <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-800 block">
                Completion Rate
              </span>
              <span className="text-2xl font-extrabold text-blue-700 block mt-0.5">
                {report.completionPercentage}%
              </span>
            </div>
          </div>
        </div>

        {/* D. Detailed Task Report Table */}
        <div className="space-y-3">
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            Detailed Task Report
          </h2>

          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-3 w-12 text-center">No.</th>
                  <th className="py-3 px-4 w-52">Task Name</th>
                  <th className="py-3 px-3 w-28 text-center">Status</th>
                  <th className="py-3 px-4">Configuration / Notes / Version</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {report.tasks.map((task, idx) => {
                  const isDone = task.status === 'Done';
                  const parts: string[] = [];
                  if (task.meta?.phpVersion && task.meta.phpVersion.trim()) {
                    parts.push(`PHP Runtime: ${task.meta.phpVersion.trim()}`);
                  }
                  if (task.meta?.wpVersion && task.meta.wpVersion.trim()) {
                    parts.push(`WordPress Version: ${task.meta.wpVersion.trim()}`);
                  }
                  if (task.meta?.configChanges && task.meta.configChanges.trim()) {
                    parts.push(`Config Changes: ${task.meta.configChanges.trim()}`);
                  }
                  if (task.notes && task.notes.trim()) {
                    parts.push(task.notes.trim());
                  }
                  const details = parts.length > 0 ? parts.join(' — ') : '-';

                  return (
                    <tr
                      key={task.id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}
                    >
                      <td className="py-3 px-3 text-center text-slate-400 font-semibold">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-800">
                        {task.name}
                        {task.isCustom && (
                          <span className="ml-1.5 px-1.5 py-0.5 text-[9px] bg-slate-100 text-slate-600 rounded">
                            Custom
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {isDone ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            Done
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <AlertTriangle className="w-3 h-3" />
                            Undone
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 leading-relaxed">
                        {details}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* E. WordPress User Information */}
        {report.wordpressUsers && report.wordpressUsers.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              WordPress User Information & 2FA Status
            </h2>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800 text-white uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="py-2.5 px-4">Username</th>
                    <th className="py-2.5 px-4">Email Address</th>
                    <th className="py-2.5 px-4">Role</th>
                    <th className="py-2.5 px-4">2FA Status</th>
                    <th className="py-2.5 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {report.wordpressUsers.map((u, i) => (
                    <tr key={u.id || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="py-2.5 px-4 font-bold text-slate-800">{u.username}</td>
                      <td className="py-2.5 px-4 text-slate-700">{u.email}</td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-700">
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`font-semibold ${
                            u.twoFactorStatus === 'Enabled'
                              ? 'text-emerald-700'
                              : u.twoFactorStatus === 'Disabled'
                              ? 'text-rose-700'
                              : 'text-slate-500'
                          }`}
                        >
                          {u.twoFactorStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">{u.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Report Footer */}
        <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Report ID: <span className="font-mono text-slate-700">{report.id}</span>
          </div>
          <div>
            Generated via Website Maintenance & Upgrade Reporting Tool | Confidential
          </div>
        </div>
      </div>
    </div>
  );
};


