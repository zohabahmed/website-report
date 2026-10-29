import React, { useState, useEffect } from 'react';
import {
  Globe,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Save,
  RotateCcw,
  Users,
} from 'lucide-react';
import { MaintenanceTask, TaskStatus, WordPressUser, WebsiteReport } from '../types';
import { CustomTaskModal } from '../components/CustomTaskModal';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { ProgressBar } from '../components/ProgressBar';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface CreateReportPageProps {
  existingReport?: WebsiteReport | null;
  onGenerateReport: (report: WebsiteReport) => void;
  onSaveReportSuccess?: (report: WebsiteReport) => void;
}

export const CreateReportPage: React.FC<CreateReportPageProps> = ({
  existingReport,
  onGenerateReport,
  onSaveReportSuccess,
}) => {
  const { showToast } = useToast();

  // Top single field: Website URL
  const [websiteUrl, setWebsiteUrl] = useState<string>('');
  const [urlError, setUrlError] = useState<string>('');

  // 9 Default Tasks
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [wordpressUsers, setWordpressUsers] = useState<WordPressUser[]>([]);

  // Expand notes per task
  const [expandedNotes, setExpandedNotes] = useState<{ [id: string]: boolean }>({});

  // Loading & Saving
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveToSheet, setSaveToSheet] = useState<boolean>(true);

  // Custom Task Modal
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [editingCustomTask, setEditingCustomTask] = useState<MaintenanceTask | null>(null);
  const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);

  // Users Drawer / Modal (optional)
  const [showUsersSection, setShowUsersSection] = useState(false);

  useEffect(() => {
    if (existingReport) {
      setWebsiteUrl(existingReport.websiteUrl);
      setTasks(existingReport.tasks || []);
      setWordpressUsers(existingReport.wordpressUsers || []);
    } else {
      loadDefaults();
    }
  }, [existingReport]);

  const loadDefaults = async () => {
    setLoading(true);
    try {
      const res = await api.getDefaultTasks();
      setTasks(res.tasks);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const validateUrl = (url: string) => {
    if (!url.trim()) {
      setUrlError('Please enter a website URL.');
      return false;
    }
    const pattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:\d+)?(\/.*)?$/i;
    if (!pattern.test(url.trim())) {
      setUrlError('Please enter a valid website URL (e.g. example.com or https://example.com).');
      return false;
    }
    setUrlError('');
    return true;
  };

  // Toggle Task Status (Done <-> Undone)
  const toggleTaskStatus = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const nextStatus: TaskStatus = t.status === 'Done' ? 'Undone' : 'Done';
          return { ...t, status: nextStatus };
        }
        return t;
      })
    );
  };

  // Update Task Notes
  const handleNotesChange = (id: string, notes: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, notes } : t))
    );
  };

  // Update Task Meta (PHP version, WP version, config changes)
  const handleMetaChange = (id: string, meta: any) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, meta } : t))
    );
  };

  const toggleNotesExpanded = (id: string) => {
    setExpandedNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Calculation
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'Done').length;
  const incompleteTasks = totalTasks - completedTasks;
  const completionPercentage =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  // Compile report
  const buildReportObject = async (): Promise<WebsiteReport> => {
    let cleanUrl = websiteUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    const today = new Date().toISOString().split('T')[0];
    const previewRes = await api.previewSummary(cleanUrl, today, tasks);

    let siteName = cleanUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
    if (siteName.includes('.')) {
      const part = siteName.split('.')[0];
      siteName = part.charAt(0).toUpperCase() + part.slice(1);
    }

    const now = new Date().toISOString();
    return {
      id: existingReport ? existingReport.id : `draft-${Math.random().toString(36).substring(2, 9)}`,
      websiteUrl: cleanUrl,
      websiteName: siteName,
      reportDate: today,
      preparedBy: 'DevOps / QA Auditor',
      totalTasks: previewRes.totalTasks,
      completedTasks: previewRes.completedTasks,
      incompleteTasks: previewRes.incompleteTasks,
      completionPercentage: previewRes.completionPercentage,
      tasks,
      wordpressUsers,
      executiveSummary: previewRes.executiveSummary,
      finalSummary: previewRes.finalSummary,
      createdAt: existingReport ? existingReport.createdAt : now,
      updatedAt: now,
    };
  };

  // Click "Create Report"
  const handleCreateReport = async () => {
    if (!validateUrl(websiteUrl)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      const report = await buildReportObject();
      onGenerateReport(report);
    } catch (err: any) {
      showToast('Error generating report: ' + err.message, 'error');
    }
  };

  // Save draft
  const handleSaveDraft = async () => {
    if (!validateUrl(websiteUrl)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSaving(true);
    try {
      const reportData = await buildReportObject();
      let saved: WebsiteReport;

      if (existingReport && !existingReport.id.startsWith('draft-')) {
        const res = await api.updateReport(existingReport.id, reportData);
        saved = res.report;
        showToast('Report updated in database.', 'success');
      } else {
        const res = await api.createReport({
          websiteUrl: reportData.websiteUrl,
          websiteName: reportData.websiteName,
          reportDate: reportData.reportDate,
          preparedBy: reportData.preparedBy,
          tasks: reportData.tasks,
          wordpressUsers: reportData.wordpressUsers,
          executiveSummary: reportData.executiveSummary,
          finalSummary: reportData.finalSummary,
        });
        saved = res.report;
        showToast('Report saved to database.', 'success');
      }

      if (onSaveReportSuccess) {
        onSaveReportSuccess(saved);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save report.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Add Custom Task
  const handleSaveCustomTask = (taskData: {
    name: string;
    description?: string;
    notes?: string;
    status: TaskStatus;
  }) => {
    if (editingCustomTask) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === editingCustomTask.id
            ? {
                ...t,
                name: taskData.name,
                description: taskData.description,
                notes: taskData.notes,
                status: taskData.status,
              }
            : t
        )
      );
      showToast('Custom task updated.', 'info');
    } else {
      const newTask: MaintenanceTask = {
        id: `custom-${Math.random().toString(36).substring(2, 9)}`,
        name: taskData.name,
        description: taskData.description,
        notes: taskData.notes,
        status: taskData.status,
        isCustom: true,
        orderIndex: tasks.length + 1,
      };
      setTasks((prev) => [...prev, newTask]);
      showToast('Custom task added.', 'success');
    }
    setEditingCustomTask(null);
  };

  const confirmDeleteCustomTask = () => {
    if (!deleteTaskId) return;
    setTasks((prev) => prev.filter((t) => t.id !== deleteTaskId));
    setDeleteTaskId(null);
    showToast('Custom task removed.', 'info');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      {/* 1. TOP SINGLE FIELD: WEBSITE URL */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xs text-slate-900">
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 mb-2 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-black" />
            Website URL
          </span>
          <span className="text-[11px] text-slate-500 font-semibold lowercase">
            required
          </span>
        </label>

        <div className="relative">
          <input
            type="text"
            value={websiteUrl}
            onChange={(e) => {
              setWebsiteUrl(e.target.value);
              if (urlError) validateUrl(e.target.value);
            }}
            placeholder="Enter website URL (e.g. example.com or https://mywebsite.com)"
            className={`w-full text-base sm:text-lg font-semibold px-4 py-3.5 bg-slate-50 text-slate-900 border rounded-xl outline-none transition-all placeholder:text-slate-400 placeholder:font-normal focus:bg-white ${
              urlError
                ? 'border-rose-500 focus:ring-2 focus:ring-rose-500'
                : 'border-slate-300 focus:border-black focus:ring-2 focus:ring-black/10'
            }`}
            autoFocus
          />
        </div>

        {urlError && (
          <p className="text-xs text-rose-600 mt-2 flex items-center gap-1.5 font-medium">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {urlError}
          </p>
        )}

        {/* Live Progress Bar under URL */}
        <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span>Progress:</span>
            <span className="font-bold text-slate-950">
              {completedTasks} of {totalTasks} Tasks Completed
            </span>
          </div>
          <span
            className={`font-bold ${
              completionPercentage === 100
                ? 'text-emerald-700'
                : completionPercentage > 0
                ? 'text-black'
                : 'text-slate-400'
            }`}
          >
            {completionPercentage}% Done
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar percentage={completionPercentage} heightClass="h-2" />
        </div>
      </div>

      {/* 2. THE 9 CHECKLIST FIELDS (SHOWN DIRECTLY) */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            Maintenance Checklist (Mark Done or Undone)
          </h2>
          <span className="text-xs text-slate-500 font-medium">
            Click toggle to switch status
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            Loading checklist...
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {tasks.map((task, idx) => {
              const isDone = task.status === 'Done';
              const hasNotes = Boolean(task.notes?.trim());
              const isExpanded = expandedNotes[task.id];

              return (
                <div
                  key={task.id}
                  className={`transition-colors ${
                    isDone ? 'bg-white hover:bg-slate-50/70' : 'bg-white hover:bg-slate-50/50'
                  }`}
                >
                  <div className="px-6 py-4 flex items-center justify-between gap-4">
                    {/* Task Title & Index */}
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <span className="text-xs font-bold text-slate-400 w-5">
                        {idx + 1}.
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="text-base font-semibold text-slate-900 block truncate">
                          {task.name}
                        </span>

                        {/* Clean Text Input for PHP Version (User types the version) */}
                        {task.id === 'task-php-version' && (
                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="text"
                              value={task.meta?.phpVersion || ''}
                              onChange={(e) => handleMetaChange(task.id, { ...task.meta, phpVersion: e.target.value })}
                              placeholder="Type PHP version (e.g. PHP 8.3)"
                              className="text-xs px-3 py-1.5 bg-slate-50 text-slate-900 border border-slate-300 rounded-lg outline-none focus:bg-white focus:border-black focus:ring-1 focus:ring-black w-60 placeholder:text-slate-400"
                            />
                            {task.meta?.phpVersion && (
                              <button
                                type="button"
                                onClick={() => handleMetaChange(task.id, { ...task.meta, phpVersion: '' })}
                                className="text-[11px] text-slate-400 hover:text-rose-600"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        )}

                        {/* Clean Text Input for WordPress Core Upgrade (User types the version) */}
                        {task.id === 'task-wp-core' && (
                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="text"
                              value={task.meta?.wpVersion || ''}
                              onChange={(e) => handleMetaChange(task.id, { ...task.meta, wpVersion: e.target.value })}
                              placeholder="Type WordPress version (e.g. 6.7.1)"
                              className="text-xs px-3 py-1.5 bg-slate-50 text-slate-900 border border-slate-300 rounded-lg outline-none focus:bg-white focus:border-black focus:ring-1 focus:ring-black w-60 placeholder:text-slate-400"
                            />
                            {task.meta?.wpVersion && (
                              <button
                                type="button"
                                onClick={() => handleMetaChange(task.id, { ...task.meta, wpVersion: '' })}
                                className="text-[11px] text-slate-400 hover:text-rose-600"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        )}

                        {task.notes && !isExpanded && (
                          <span className="text-xs text-slate-400 block truncate mt-1">
                            {task.notes}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Controls & Done/Undone Toggle Button */}
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      {/* Optional Expand Notes Button */}
                      <button
                        type="button"
                        onClick={() => toggleNotesExpanded(task.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 ${
                          hasNotes
                            ? 'bg-slate-800 text-blue-400 border-slate-700'
                            : 'bg-transparent text-slate-500 border-transparent hover:border-slate-700 hover:text-slate-400'
                        }`}
                        title="Add/Edit Notes"
                      >
                        <span>{hasNotes ? 'Notes' : '+ Note'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Custom task delete */}
                      {task.isCustom && (
                        <button
                          type="button"
                          onClick={() => setDeleteTaskId(task.id)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition-colors"
                          title="Delete Custom Task"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}

                      {/* Explicit DONE / UNDONE Toggle Button */}
                      <button
                        type="button"
                        onClick={() => toggleTaskStatus(task.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm border ${
                          isDone
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-emerald-900/30'
                            : 'bg-rose-600/90 hover:bg-rose-600 text-white border-rose-500/80 shadow-rose-900/30'
                        }`}
                      >
                        {isDone ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            Done
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4" />
                            Undone
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Notes / Details Field */}
                  {isExpanded && (
                    <div className="px-6 pb-4 pt-1 bg-slate-950/60 border-t border-slate-800/80 space-y-2">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Notes & Specifics for {task.name}:</span>
                      </div>
                      <input
                        type="text"
                        value={task.notes || ''}
                        onChange={(e) => handleNotesChange(task.id, e.target.value)}
                        placeholder={`e.g. Details about ${task.name}...`}
                        className="w-full text-xs px-3 py-2 bg-slate-900 text-slate-200 border border-slate-700 rounded-lg outline-none focus:border-blue-500"
                      />

                      {/* Quick version fields for PHP Version */}
                      {task.id === 'task-php-version' && (
                        <div className="flex items-center gap-2 pt-1 text-xs text-slate-400">
                          <span>PHP Version:</span>
                          {['PHP 8.2', 'PHP 8.3', 'PHP 8.1', 'PHP 8.4'].map((ver) => (
                            <button
                              key={ver}
                              type="button"
                              onClick={() => {
                                handleMetaChange(task.id, { phpVersion: ver });
                                if (!task.notes) handleNotesChange(task.id, ver);
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                            >
                              {ver}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Quick version field for WordPress Core Upgrade */}
                      {task.id === 'task-wp-core' && (
                        <div className="flex items-center gap-2 pt-1 text-xs text-slate-400">
                          <span>WordPress Version:</span>
                          {['6.7.1', '6.7', '6.6.2'].map((ver) => (
                            <button
                              key={ver}
                              type="button"
                              onClick={() => {
                                handleMetaChange(task.id, { wpVersion: ver });
                                if (!task.notes) handleNotesChange(task.id, `Updated to ${ver}`);
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                            >
                              {ver}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Quick helpers for WP-Hide */}
                      {task.id === 'task-wp-hide' && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-slate-400">
                          <span>Quick Tags:</span>
                          {['Login URL Obfuscated', 'wp-content/plugins Masked', 'XML-RPC Blocked', 'Core Footprints Hidden'].map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => {
                                const current = task.notes ? `${task.notes}, ${tag}` : tag;
                                handleNotesChange(task.id, current);
                              }}
                              className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 text-[11px]"
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add Custom Task Option & User Accounts (White & Black Theme) */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setEditingCustomTask(null);
              setIsCustomModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 hover:text-black text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-500" />
            <span>Add Custom Task</span>
          </button>

          <button
            type="button"
            onClick={() => setShowUsersSection(!showUsersSection)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-medium shadow-xs transition-all cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>Audited Users ({wordpressUsers.length})</span>
            {showUsersSection ? <ChevronUp className="w-3 h-3 text-slate-400" /> : <ChevronDown className="w-3 h-3 text-slate-400" />}
          </button>
        </div>

        {/* Optional WordPress Users Drawer (Clean Light Mode) */}
        {showUsersSection && (
          <div className="p-5 border-t border-slate-200 bg-slate-50/70 text-xs text-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900">Audited WordPress Accounts</span>
              <button
                type="button"
                onClick={() => {
                  const newUser: WordPressUser = {
                    id: Math.random().toString(36).substring(2, 9),
                    username: '',
                    email: '',
                    role: 'Administrator',
                    twoFactorStatus: 'Enabled',
                  };
                  setWordpressUsers([...wordpressUsers, newUser]);
                }}
                className="text-black hover:underline font-bold text-xs"
              >
                + Add User
              </button>
            </div>
            {wordpressUsers.length === 0 ? (
              <p className="text-slate-500 italic">No user accounts logged yet.</p>
            ) : (
              wordpressUsers.map((u, i) => (
                <div key={u.id || i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={u.username}
                    onChange={(e) => {
                      const copy = [...wordpressUsers];
                      copy[i].username = e.target.value;
                      setWordpressUsers(copy);
                    }}
                    placeholder="Username"
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 outline-none focus:border-black"
                  />
                  <input
                    type="email"
                    value={u.email}
                    onChange={(e) => {
                      const copy = [...wordpressUsers];
                      copy[i].email = e.target.value;
                      setWordpressUsers(copy);
                    }}
                    placeholder="Email"
                    className="flex-1 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 outline-none focus:border-black"
                  />
                  <select
                    value={u.role}
                    onChange={(e) => {
                      const copy = [...wordpressUsers];
                      copy[i].role = e.target.value as any;
                      setWordpressUsers(copy);
                    }}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 outline-none focus:border-black"
                  >
                    <option value="Administrator">Admin</option>
                    <option value="Editor">Editor</option>
                    <option value="Author">Author</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setWordpressUsers(wordpressUsers.filter((_, idx) => idx !== i))}
                    className="text-slate-400 hover:text-rose-600 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* 3. AT THE END: CREATE REPORT BUTTON */}
      <div className="space-y-3">
        {/* Save to Sheet Option Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={saveToSheet}
              onChange={(e) => setSaveToSheet(e.target.checked)}
              className="w-5 h-5 rounded-lg text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer accent-emerald-600"
            />
            <div>
              <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Save to Google Sheet</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">Live Sync</span>
              </div>
              <p className="text-xs text-slate-500">
                Automatically logs this audit as a new row in your connected Google Sheet.
              </p>
            </div>
          </label>
          <a
            href="https://docs.google.com/spreadsheets/d/14CCuvMZ0L-ue5nTuIfndTPMKo_0Tdn0Fa3PDlQyVLK0/edit?gid=0#gid=0"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1 self-start sm:self-auto bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors"
          >
            Open Sheet ↗
          </a>
        </div>

        <button
          type="button"
          onClick={handleCreateReport}
          className="w-full py-4 px-6 rounded-2xl bg-black hover:bg-slate-800 text-white font-extrabold text-base sm:text-lg shadow-lg shadow-black/10 transition-all hover:scale-[1.005] flex items-center justify-center gap-3 cursor-pointer"
        >
          <FileText className="w-6 h-6" />
          <span>
            {websiteUrl.trim()
              ? `Create Report for ${websiteUrl.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '')}`
              : 'Create Website Maintenance Report'}
          </span>
        </button>

        <div className="flex items-center justify-between px-2 text-xs text-slate-500">
          <button
            type="button"
            onClick={loadDefaults}
            className="hover:text-slate-700 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset to defaults
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={saving}
            className="hover:text-slate-700 flex items-center gap-1"
          >
            <Save className="w-3 h-3" /> {saving ? 'Saving...' : 'Save Draft to Database'}
          </button>
        </div>
      </div>

      {/* Custom Task Modal */}
      <CustomTaskModal
        isOpen={isCustomModalOpen}
        onClose={() => {
          setIsCustomModalOpen(false);
          setEditingCustomTask(null);
        }}
        onSave={handleSaveCustomTask}
        initialTask={editingCustomTask}
      />

      {/* Delete Custom Task Confirmation */}
      <ConfirmationModal
        isOpen={!!deleteTaskId}
        title="Delete Custom Task?"
        message="Are you sure you want to remove this custom task?"
        confirmLabel="Delete"
        isDestructive={true}
        onConfirm={confirmDeleteCustomTask}
        onCancel={() => setDeleteTaskId(null)}
      />
    </div>
  );
};
