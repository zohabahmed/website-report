import React from 'react';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Trash2,
  Edit2,
  Server,
  Layers,
  Code,
  Shield,
  Users,
  Mail,
  CheckSquare,
  EyeOff,
} from 'lucide-react';
import { MaintenanceTask, TaskStatus } from '../types';

interface TaskItemProps {
  task: MaintenanceTask;
  index: number;
  totalTasks: number;
  onStatusChange: (id: string, newStatus: TaskStatus) => void;
  onNotesChange: (id: string, notes: string) => void;
  onMetaChange?: (id: string, meta: any) => void;
  onEditCustom?: (task: MaintenanceTask) => void;
  onDeleteCustom?: (id: string) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  index,
  totalTasks,
  onStatusChange,
  onNotesChange,
  onMetaChange,
  onEditCustom,
  onDeleteCustom,
  onMoveUp,
  onMoveDown,
}) => {
  const isDone = task.status === 'Done';

  const toggleStatus = () => {
    onStatusChange(task.id, isDone ? 'Undone' : 'Done');
  };

  const getTaskIcon = () => {
    switch (task.id) {
      case 'task-plugin-upgrade':
        return <Layers className="w-5 h-5 text-indigo-500" />;
      case 'task-theme-upgrade':
        return <Layers className="w-5 h-5 text-purple-500" />;
      case 'task-wp-config':
        return <Code className="w-5 h-5 text-cyan-600" />;
      case 'task-php-version':
        return <Server className="w-5 h-5 text-sky-600" />;
      case 'task-2fa':
        return <Shield className="w-5 h-5 text-emerald-600" />;
      case 'task-user-accounts':
        return <Users className="w-5 h-5 text-amber-600" />;
      case 'task-elastic-email':
        return <Mail className="w-5 h-5 text-blue-600" />;
      case 'task-qa':
        return <CheckSquare className="w-5 h-5 text-teal-600" />;
      case 'task-wp-core':
        return <Server className="w-5 h-5 text-blue-700" />;
      case 'task-wp-hide':
        return <EyeOff className="w-5 h-5 text-purple-600" />;
      default:
        return <Layers className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden shadow-sm ${
        isDone
          ? 'bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-200/50'
          : 'bg-rose-50/30 border-rose-300 ring-1 ring-rose-200/40'
      }`}
    >
      {/* Task Header Bar */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/60">
        <div className="flex items-start gap-3.5 flex-1">
          {/* Status Indicator Icon */}
          <div className="mt-0.5">
            {isDone ? (
              <span title="Completed">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 animate-in fade-in" />
              </span>
            ) : (
              <span title="Incomplete">
                <XCircle className="w-6 h-6 text-rose-600 animate-in fade-in" />
              </span>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
              <div className="p-1 bg-white rounded border border-slate-200/80 shadow-xs">
                {getTaskIcon()}
              </div>
              <h3 className="text-base font-bold text-slate-900">{task.name}</h3>

              {/* Status Badge */}
              {isDone ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Done
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Undone
                </span>
              )}

              {task.isCustom && (
                <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-200 text-slate-700 rounded-md">
                  Custom Task
                </span>
              )}
            </div>

            {task.description && (
              <p className="text-xs text-slate-600 mt-1">{task.description}</p>
            )}
          </div>
        </div>

        {/* Action Controls & Explicit Toggle Button */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {/* Custom Task Reorder & Edit controls */}
          {task.isCustom && (
            <div className="flex items-center gap-1 mr-2 border-r border-slate-200 pr-2">
              <button
                type="button"
                onClick={() => onMoveUp && onMoveUp(index)}
                disabled={index === 0}
                title="Move Up"
                className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 rounded hover:bg-slate-200/60"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => onMoveDown && onMoveDown(index)}
                disabled={index === totalTasks - 1}
                title="Move Down"
                className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 rounded hover:bg-slate-200/60"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              {onEditCustom && (
                <button
                  type="button"
                  onClick={() => onEditCustom(task)}
                  title="Edit Custom Task"
                  className="p-1.5 text-slate-500 hover:text-blue-600 rounded hover:bg-blue-50"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
              {onDeleteCustom && (
                <button
                  type="button"
                  onClick={() => onDeleteCustom(task.id)}
                  title="Delete Custom Task"
                  className="p-1.5 text-slate-500 hover:text-rose-600 rounded hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Explicit Status Toggle Button */}
          <button
            type="button"
            onClick={toggleStatus}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 border ${
              isDone
                ? 'bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border-slate-300 hover:border-rose-300'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-emerald-600/20'
            }`}
          >
            {isDone ? (
              <>
                <XCircle className="w-3.5 h-3.5 text-rose-500" />
                Mark as Undone
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mark as Done
              </>
            )}
          </button>
        </div>
      </div>

      {/* Task Body / Form Fields */}
      <div className="p-4 sm:p-5 space-y-3.5 bg-white/70">
        {/* Specific Field for Task 3: WP-Config Code */}
        {task.id === 'task-wp-config' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Configuration Changes Applied to wp-config.php
            </label>
            <input
              type="text"
              value={task.meta?.configChanges || ''}
              onChange={(e) =>
                onMetaChange &&
                onMetaChange(task.id, {
                  ...task.meta,
                  configChanges: e.target.value,
                })
              }
              placeholder="e.g. WP_DEBUG (false), DISALLOW_FILE_EDIT (true), WP_MEMORY_LIMIT (256M)"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
            />
          </div>
        )}

        {/* Specific Field for Task 4: PHP Version */}
        {task.id === 'task-php-version' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Server PHP Runtime Version
              </label>
              <div className="flex gap-2">
                <select
                  value={['PHP 8.4', 'PHP 8.3', 'PHP 8.2', 'PHP 8.1', 'PHP 8.0', 'PHP 7.4'].includes(task.meta?.phpVersion || '') ? task.meta?.phpVersion : (task.meta?.phpVersion ? 'custom' : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== 'custom') {
                      onMetaChange && onMetaChange(task.id, { ...task.meta, phpVersion: val });
                    }
                  }}
                  className="text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="">Select Version...</option>
                  <option value="PHP 8.4">PHP 8.4 (Latest)</option>
                  <option value="PHP 8.3">PHP 8.3 (Stable)</option>
                  <option value="PHP 8.2">PHP 8.2</option>
                  <option value="PHP 8.1">PHP 8.1</option>
                  <option value="PHP 8.0">PHP 8.0</option>
                  <option value="PHP 7.4">PHP 7.4 (Legacy)</option>
                  <option value="custom">Manual Entry...</option>
                </select>
                <input
                  type="text"
                  value={task.meta?.phpVersion || ''}
                  onChange={(e) =>
                    onMetaChange &&
                    onMetaChange(task.id, {
                      ...task.meta,
                      phpVersion: e.target.value,
                    })
                  }
                  placeholder="Or enter manually (e.g. PHP 8.3)"
                  className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
              </div>
            </div>
            <div className="text-xs text-slate-500 self-center mt-2 sm:mt-0 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              Note: Leave empty if unverified, or select/enter the PHP runtime version.
            </div>
          </div>
        )}

        {/* Specific Field for Task 7: Elastic Email */}
        {task.id === 'task-elastic-email' && (
          <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Security Protocol:</strong> Document SMTP delivery host, SPF/DKIM verification, and test result notes. Do not store SMTP passwords or API keys in the report.
            </div>
          </div>
        )}

        {/* Specific Field for Task 8: Website QA */}
        {task.id === 'task-qa' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Quality Assurance Verification Checklist
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {[
                { key: 'accessibility', label: 'Website Accessibility' },
                { key: 'navigation', label: 'Navigation & Links' },
                { key: 'forms', label: 'Forms & Submissions' },
                { key: 'responsive', label: 'Responsive Design' },
                { key: 'performance', label: 'Page Load & Performance' },
                { key: 'criticalFunctions', label: 'Critical Functionality' },
              ].map((item) => {
                const isChecked = !!(task.meta?.qaChecks as any)?.[item.key];
                return (
                  <label
                    key={item.key}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                      isChecked
                        ? 'bg-teal-50 border-teal-300 text-teal-900 font-medium'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const newQa = {
                          ...(task.meta?.qaChecks || {
                            accessibility: false,
                            navigation: false,
                            forms: false,
                            responsive: false,
                            performance: false,
                            criticalFunctions: false,
                          }),
                          [item.key]: e.target.checked,
                        };
                        onMetaChange &&
                          onMetaChange(task.id, {
                            ...task.meta,
                            qaChecks: newQa,
                          });
                      }}
                      className="rounded text-teal-600 focus:ring-teal-500 w-3.5 h-3.5 border-slate-300"
                    />
                    <span>{item.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Specific Field for Task 9: WordPress Core Upgrade */}
        {task.id === 'task-wp-core' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WordPress Core Version
              </label>
              <div className="flex gap-2">
                <select
                  value={['6.7.1', '6.7.0', '6.6.2', '6.6.1', '6.5.5'].includes(task.meta?.wpVersion || '') ? task.meta?.wpVersion : (task.meta?.wpVersion ? 'custom' : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val !== 'custom') {
                      onMetaChange && onMetaChange(task.id, { ...task.meta, wpVersion: val });
                    }
                  }}
                  className="text-xs px-2.5 py-2 border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="">Select Version...</option>
                  <option value="6.7.1">WordPress 6.7.1 (Latest)</option>
                  <option value="6.7.0">WordPress 6.7.0</option>
                  <option value="6.6.2">WordPress 6.6.2 (Stable)</option>
                  <option value="6.6.1">WordPress 6.6.1</option>
                  <option value="6.5.5">WordPress 6.5.5</option>
                  <option value="custom">Manual Entry...</option>
                </select>
                <input
                  type="text"
                  value={task.meta?.wpVersion || ''}
                  onChange={(e) =>
                    onMetaChange &&
                    onMetaChange(task.id, {
                      ...task.meta,
                      wpVersion: e.target.value,
                    })
                  }
                  placeholder="Or enter manually (e.g. 6.7.1)"
                  className="flex-1 text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                />
              </div>
            </div>
            <div className="text-xs text-slate-500 self-center mt-2 sm:mt-0 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              Note: Select or type the WordPress core version after reviewing updates.
            </div>
          </div>
        )}

        {/* General Notes Field */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
            <span>Maintenance Notes & Observations</span>
            <span className="text-[11px] text-slate-400 font-normal">Optional details</span>
          </label>
          <textarea
            value={task.notes || ''}
            onChange={(e) => onNotesChange(task.id, e.target.value)}
            rows={2}
            placeholder={`Add notes for ${task.name} (e.g. versions updated, configuration tested, warnings)...`}
            className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white resize-y"
          />
        </div>
      </div>
    </div>
  );
};
