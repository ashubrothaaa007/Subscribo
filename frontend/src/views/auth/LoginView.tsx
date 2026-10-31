import React, { useState } from 'react';
import { Layers, Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import type { UserRole } from '../../types';

interface LoginViewProps {
  onLogin: (login: string, pass: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, isLoading, error }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password);
  };

  const handleQuickLogin = (role: UserRole) => {
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin');
      onLogin('admin', 'admin');
    } else if (role === 'staff') {
      setUsername('staff@example.com');
      setPassword('StaffPassword1!');
      onLogin('staff@example.com', 'StaffPassword1!');
    } else {
      setUsername('portal.customer@example.com');
      setPassword('CustomerPassword1!');
      onLogin('portal.customer@example.com', 'CustomerPassword1!');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/25 mx-auto mb-4 border border-indigo-400/20">
          <Layers className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white">SUBSCRIBO</h1>
        <p className="mt-1 text-xs uppercase tracking-widest text-indigo-400 font-semibold">
          Independent SaaS Cloud Portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-slate-800/10">
          <form className="space-y-4" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700">Username / Email</label>
              <div className="mt-1 relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin or email..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Password</label>
              <div className="mt-1 relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isLoading ? (
                'Signing In...'
              ) : (
                <>
                  <span>Sign In to SaaS Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Role Logins */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center mb-3">
              One-Click Role Switcher Demo Logins
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin')}
                className="py-2 px-1 text-[11px] font-semibold rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors text-center"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('staff')}
                className="py-2 px-1 text-[11px] font-semibold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors text-center"
              >
                Staff
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin('customer')}
                className="py-2 px-1 text-[11px] font-semibold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors text-center"
              >
                Customer
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-slate-500 text-[11px] mt-6">
          Connected to isolated Odoo backend: <span className="font-mono text-slate-400">127.0.0.1:8099</span>
        </p>
      </div>
    </div>
  );
};

