import React, { useState } from 'react';
import { ShieldCheck, Lock, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('admin@maintenance.com');
  const [password, setPassword] = useState('admin123456');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      showToast('Successfully signed in.', 'success');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDefaultAdmin = () => {
    setEmail('admin@maintenance.com');
    setPassword('admin123456');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Website Maintenance & Upgrade
        </h2>
        <p className="mt-2 text-xs sm:text-sm text-slate-400">
          Professional reporting system for WordPress security, core updates & QA
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl sm:px-10 border border-slate-100">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Email Address
              </label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="admin@maintenance.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Dashboard'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Credentials Box */}
          <div className="mt-6 pt-5 border-t border-slate-100 bg-slate-50 p-3 rounded-xl border">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" /> Default Cloudways Credentials
              </span>
              <button
                type="button"
                onClick={fillDefaultAdmin}
                className="text-blue-600 font-semibold hover:underline"
              >
                Auto Fill
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Email: <span className="font-mono text-slate-800">admin@maintenance.com</span>
              <br />
              Password: <span className="font-mono text-slate-800">admin123456</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
