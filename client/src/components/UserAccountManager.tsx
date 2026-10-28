import React, { useState } from 'react';
import { UserCheck, Plus, Trash2, ShieldAlert, AlertCircle } from 'lucide-react';
import { WordPressUser, UserRole, TwoFactorStatus } from '../types';

interface UserAccountManagerProps {
  users: WordPressUser[];
  onChange: (users: WordPressUser[]) => void;
}

export const UserAccountManager: React.FC<UserAccountManagerProps> = ({ users, onChange }) => {
  const [emailErrors, setEmailErrors] = useState<{ [id: string]: string }>({});

  const validateEmail = (email: string) => {
    if (!email) return true; // empty is allowed while typing, but if entered, must be valid
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return pattern.test(email);
  };

  const addUser = () => {
    const newUser: WordPressUser = {
      id: Math.random().toString(36).substring(2, 9),
      username: '',
      email: '',
      role: 'Administrator',
      twoFactorStatus: 'Not Verified',
      notes: '',
    };
    onChange([...users, newUser]);
  };

  const removeUser = (id: string) => {
    onChange(users.filter((u) => u.id !== id));
    setEmailErrors((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const updateUser = (id: string, field: keyof WordPressUser, value: any) => {
    if (field === 'email') {
      if (value && !validateEmail(value)) {
        setEmailErrors((prev) => ({ ...prev, [id]: 'Please enter a valid email address.' }));
      } else {
        setEmailErrors((prev) => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
      }
    }

    onChange(
      users.map((u) => {
        if (u.id === id) {
          return { ...u, [field]: value };
        }
        return u;
      })
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-50 text-amber-600 rounded-lg border border-amber-200">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              WordPress User Accounts & Security Roles
            </h3>
            <p className="text-xs text-slate-500">
              Record active accounts, access levels, and 2FA status for the maintenance audit.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={addUser}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add WordPress User
        </button>
      </div>

      {/* Security notice */}
      <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
        <ShieldAlert className="w-4 h-4 text-slate-500 flex-shrink-0" />
        <span>
          <strong>Confidentiality Policy:</strong> Never record passwords, API tokens, or secrets. Only usernames, roles, and verification states are documented.
        </span>
      </div>

      {/* User list */}
      {users.length === 0 ? (
        <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
          <p className="text-xs text-slate-500 font-medium">
            No WordPress user accounts logged for this website.
          </p>
          <button
            type="button"
            onClick={addUser}
            className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            + Click here to add an account entry
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user, idx) => (
            <div
              key={user.id}
              className="p-3.5 bg-slate-50/70 border border-slate-200 rounded-lg space-y-3"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                {/* Username */}
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    WordPress Username *
                  </label>
                  <input
                    type="text"
                    value={user.username}
                    onChange={(e) => updateUser(user.id, 'username', e.target.value)}
                    placeholder="e.g. wp_admin"
                    className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* Email */}
                <div className="sm:col-span-4">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    onChange={(e) => updateUser(user.id, 'email', e.target.value)}
                    placeholder="e.g. admin@domain.com"
                    className={`w-full text-xs px-2.5 py-1.5 bg-white border rounded-md focus:ring-1 outline-none ${
                      emailErrors[user.id]
                        ? 'border-rose-400 focus:ring-rose-400'
                        : 'border-slate-300 focus:ring-blue-500'
                    }`}
                  />
                  {emailErrors[user.id] && (
                    <span className="text-[10px] text-rose-600 flex items-center gap-1 mt-0.5">
                      <AlertCircle className="w-3 h-3" />
                      {emailErrors[user.id]}
                    </span>
                  )}
                </div>

                {/* Role */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    User Role
                  </label>
                  <select
                    value={user.role}
                    onChange={(e) => updateUser(user.id, 'role', e.target.value as UserRole)}
                    className="w-full text-xs px-2 py-1.5 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Editor">Editor</option>
                    <option value="Author">Author</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                {/* 2FA Status */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    2FA Status
                  </label>
                  <select
                    value={user.twoFactorStatus}
                    onChange={(e) =>
                      updateUser(user.id, 'twoFactorStatus', e.target.value as TwoFactorStatus)
                    }
                    className={`w-full text-xs px-2 py-1.5 border rounded-md focus:ring-1 outline-none font-medium ${
                      user.twoFactorStatus === 'Enabled'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : user.twoFactorStatus === 'Disabled'
                        ? 'bg-rose-50 text-rose-800 border-rose-300'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    <option value="Enabled">Enabled</option>
                    <option value="Disabled">Disabled</option>
                    <option value="Not Verified">Not Verified</option>
                  </select>
                </div>

                {/* Delete button */}
                <div className="sm:col-span-1 pt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeUser(user.id)}
                    title="Remove user"
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <input
                  type="text"
                  value={user.notes || ''}
                  onChange={(e) => updateUser(user.id, 'notes', e.target.value)}
                  placeholder="Optional notes (e.g. Lead Developer, Staging Only, Needs Hardware Key)..."
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
