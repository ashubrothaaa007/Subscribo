import React from 'react';
import {
  LayoutDashboard,
  Layers,
  FileText,
  Users,
  ShieldCheck,
  Receipt,
  PackageCheck,
  LogOut,
  Sparkles,
  Zap,
  Repeat,
  Sliders,
  UserCircle,
} from 'lucide-react';
import type { UserRole, User } from '../../types';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

interface SidebarProps {
  currentRole: UserRole;
  activeView: string;
  onNavigate: (view: string) => void;
  currentUser: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentRole,
  activeView,
  onNavigate,
  currentUser,
  onLogout,
}) => {
  const getNavItems = (): NavItem[] => {
    if (currentRole === 'admin') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'subscriptions', label: 'Subscriptions', icon: Layers },
        { id: 'billing-dashboard', label: 'Billing & Recurring', icon: Receipt },
        { id: 'invoices', label: 'All Invoices', icon: FileText },
        { id: 'upcoming-billing', label: 'Upcoming Schedule', icon: Repeat },
        { id: 'plans', label: 'Plans Catalog', icon: Sparkles },
        { id: 'products', label: 'Products & Add-ons', icon: PackageCheck },
        { id: 'quotations', label: 'Quotations', icon: FileText },
        { id: 'customers', label: 'Customers', icon: Users },
        { id: 'staff', label: 'Staff Management', icon: ShieldCheck },
      ];
    } else if (currentRole === 'staff') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'subscriptions', label: 'Subscriptions', icon: Layers },
        { id: 'invoices', label: 'Subscription Invoices', icon: Receipt },
        { id: 'customers', label: 'Customers', icon: Users },
        { id: 'quotations', label: 'Quotations', icon: FileText },
        { id: 'operations', label: 'Operations & Audits', icon: Sliders },
      ];
    } else {
      // Customer
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'subscriptions', label: 'My Subscriptions', icon: Layers },
        { id: 'invoices', label: 'My Invoices & Billing', icon: Receipt },
        { id: 'plans', label: 'Plan Details', icon: Zap },
        { id: 'addons', label: 'Add-ons Service', icon: PackageCheck },
        { id: 'renewals', label: 'Renewals', icon: Repeat },
        { id: 'quotations', label: 'Quotations', icon: FileText },
        { id: 'profile', label: 'My Profile', icon: UserCircle },
      ];
    }
  };

  const navItems = getNavItems();

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-purple-500/20 text-purple-300 border border-purple-500/30">Admin</span>;
      case 'staff':
        return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-blue-500/20 text-blue-300 border border-blue-500/30">Staff</span>;
      case 'customer':
        return <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Customer</span>;
    }
  };

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/25">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-lg tracking-tight text-white">SUBSCRIBO</span>
            </div>
            <span className="text-[10px] font-medium tracking-wide text-indigo-400 block -mt-0.5">SaaS Enterprise</span>
          </div>
        </div>
        {getRoleBadge(currentRole)}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-800 text-indigo-300 border border-slate-700">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Backend Status indicator */}
      <div className="p-3 mx-3 mb-2 rounded-lg bg-slate-800/60 border border-slate-800 text-xs">
        <div className="flex items-center justify-between text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Backend Online
          </span>
          <span className="text-[10px] font-mono text-slate-400">Odoo 19</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1 truncate">
          DB: <span className="font-mono text-slate-300">test_20261031</span>
        </p>
      </div>

      {/* User Footer & Logout */}
      <div className="p-3 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-xs uppercase shrink-0">
            {currentUser?.name ? currentUser.name.charAt(0) : 'U'}
          </div>
          <div className="truncate">
            <p className="text-xs font-semibold text-white truncate">
              {currentUser?.name || 'User'}
            </p>
            <p className="text-[10px] text-slate-400 truncate">
              {currentUser?.email || currentUser?.login || 'signed in'}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          title="Sign Out"
          className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};

