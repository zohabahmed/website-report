import React, { useState } from 'react';
import { ShieldCheck, PlusCircle, History, FileSpreadsheet, Download, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface NavbarProps {
  currentTab: 'create' | 'history' | 'preview';
  onNavigate: (tab: 'create' | 'history') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onNavigate }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [exportingExcel, setExportingExcel] = useState(false);

  const handleDownloadMasterExcel = async () => {
    setExportingExcel(true);
    try {
      await api.downloadMasterExcel();
      showToast('Master Excel report downloaded successfully.', 'success');
    } catch (err: any) {
      showToast('Excel export failed: ' + err.message, 'error');
    } finally {
      setExportingExcel(false);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 text-slate-900 sticky top-0 z-40 shadow-xs no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            onClick={() => onNavigate('create')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-lg bg-black flex items-center justify-center text-white shadow-xs group-hover:bg-slate-800 transition-colors">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-slate-950 block leading-tight">
                wds-wp-report
              </span>
              <span className="text-xs text-slate-500 font-semibold tracking-wider uppercase">
                WordPress Upgrade & QA Reporter
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1.5">
            <button
              onClick={() => onNavigate('create')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
                currentTab === 'create'
                  ? 'bg-black text-white shadow-xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-black border border-slate-200 bg-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              New Report
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[10px] text-slate-900 font-bold uppercase tracking-wider">
                Auditor
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
