import React, { useState, useEffect } from 'react';
import { X, PlusCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { MaintenanceTask, TaskStatus } from '../types';

interface CustomTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: {
    name: string;
    description?: string;
    notes?: string;
    status: TaskStatus;
  }) => void;
  initialTask?: MaintenanceTask | null;
}

export const CustomTaskModal: React.FC<CustomTaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTask,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<TaskStatus>('Undone');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialTask) {
      setName(initialTask.name);
      setDescription(initialTask.description || '');
      setNotes(initialTask.notes || '');
      setStatus(initialTask.status);
    } else {
      setName('');
      setDescription('');
      setNotes('');
      setStatus('Undone');
    }
    setError('');
  }, [initialTask, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Task Name is required.');
      return;
    }
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      notes: notes.trim() || undefined,
      status,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <PlusCircle className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold">
              {initialTask ? 'Edit Custom Maintenance Task' : 'Add Custom Maintenance Task'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Task Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Task Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Off-site S3 Cloud Backup, CDN Purge, SSL Check"
              className="w-full text-sm px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Task Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief explanation of the task scope or requirements"
              className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Initial Notes / Details (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="e.g. S3 snapshot size: 1.2 GB, SHA-256 verified"
              className="w-full text-xs px-3.5 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Task Status
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setStatus('Undone')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                  status === 'Undone'
                    ? 'bg-rose-50 border-rose-300 text-rose-800 ring-2 ring-rose-300'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Undone (Incomplete)
              </button>

              <button
                type="button"
                onClick={() => setStatus('Done')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-bold transition-all ${
                  status === 'Done'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 ring-2 ring-emerald-300'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Done (Completed)
              </button>
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors"
            >
              {initialTask ? 'Update Task' : 'Add Task to Checklist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
