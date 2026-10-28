import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { CreateReportPage } from './pages/CreateReportPage';
import { ReportHistoryPage } from './pages/ReportHistoryPage';
import { ReportPreviewView } from './components/ReportPreviewView';
import { WebsiteReport } from './types';
import { api } from './services/api';
import { useToast } from './context/ToastContext';

export function AppContent() {
  const { showToast } = useToast();

  const [currentTab, setCurrentTab] = useState<'create' | 'history' | 'preview'>('create');
  const [editingReport, setEditingReport] = useState<WebsiteReport | null>(null);
  const [previewReport, setPreviewReport] = useState<WebsiteReport | null>(null);

  // Navigation Handlers
  const handleNavigate = (tab: 'create' | 'history') => {
    if (tab === 'create') {
      setEditingReport(null);
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartCreateNew = () => {
    setEditingReport(null);
    setCurrentTab('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEditReport = (report: WebsiteReport) => {
    setEditingReport(report);
    setCurrentTab('create');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewReport = (report: WebsiteReport) => {
    setPreviewReport(report);
    setCurrentTab('preview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGeneratedReport = (report: WebsiteReport) => {
    setPreviewReport(report);
    setCurrentTab('preview');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSavePreviewReport = async (report: WebsiteReport) => {
    if (report.id && !report.id.startsWith('draft-')) {
      const res = await api.updateReport(report.id, report);
      setPreviewReport(res.report);
      showToast('Report updated in database.', 'success');
    } else {
      const res = await api.createReport({
        websiteUrl: report.websiteUrl,
        websiteName: report.websiteName,
        clientName: report.clientName,
        reportDate: report.reportDate,
        preparedBy: report.preparedBy,
        tasks: report.tasks,
        wordpressUsers: report.wordpressUsers,
        executiveSummary: report.executiveSummary,
        finalSummary: report.finalSummary,
      });
      setPreviewReport(res.report);
      showToast('Report saved to database.', 'success');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar currentTab={currentTab} onNavigate={handleNavigate} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'create' && (
          <CreateReportPage
            existingReport={editingReport}
            onGenerateReport={handleGeneratedReport}
            onSaveReportSuccess={(saved) => {
              setEditingReport(saved);
            }}
          />
        )}

        {currentTab === 'preview' && previewReport && (
          <ReportPreviewView
            report={previewReport}
            onEdit={() => {
              setEditingReport(previewReport);
              setCurrentTab('create');
            }}
            onSave={handleSavePreviewReport}
            onCreateNew={handleStartCreateNew}
            isSaved={!previewReport.id.startsWith('draft-')}
          />
        )}

        {currentTab === 'history' && (
          <ReportHistoryPage
            onViewReport={handleViewReport}
            onEditReport={handleEditReport}
            onCreateNew={handleStartCreateNew}
          />
        )}
      </main>

      {/* Global Footer (hidden during print) */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 no-print mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Website Maintenance & Upgrade Reporting System &copy; {new Date().getFullYear()}
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>WordPress Technical Reporting</span>
            <span>•</span>
            <span>Cloudways Ready</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
