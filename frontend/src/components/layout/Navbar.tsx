import React from 'react';
import {
  RotateCcw,
  UserCheck,
  Building,
  KeyRound,
} from 'lucide-react';
import type { UserRole, User } from '../../types';

interface NavbarProps {
  title: string;
  role: UserRole;
  user: User | null;
  onRefresh: () => void;
  isLoading: boolean;
  onSwitchRole: (role: UserRole) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  title,
  role,
  user,
  onRefresh,
  isLoading,
  onSwitchRole,
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 shrink-0">
      {/* Title & context */}
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">{title}</h1>
        <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
          <Building className="w-3 h-3 text-slate-400" />
          {user?.companyName || 'SUBSCRIBO Test Org'}
        </span>
      </div>

      {/* Right Actions: Fast Role Switcher & Refresh */}
      <div className="flex items-center gap-3">
        {/* Quick Role Tester Pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 flex items-center gap-1">
            <KeyRound className="w-3 h-3" />
            Switch:
          </span>
          <button
            onClick={() => onSwitchRole('admin')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              role === 'admin'
                ? 'bg-white text-purple-700 shadow-xs border border-purple-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => onSwitchRole('staff')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              role === 'staff'
                ? 'bg-white text-blue-700 shadow-xs border border-blue-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Staff
          </button>
          <button
            onClick={() => onSwitchRole('customer')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              role === 'customer'
                ? 'bg-white text-emerald-700 shadow-xs border border-emerald-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Customer
          </button>
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          title="Refresh Data from Odoo"
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
        >
          <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
        </button>

        {/* User Pill */}
        <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
            <UserCheck className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-left text-xs leading-tight">
            <p className="font-semibold text-slate-800">{user?.name || 'User'}</p>
            <p className="text-[10px] text-slate-400 capitalize">{role} Role</p>
          </div>
        </div>
      </div>
    </header>
  );
};

