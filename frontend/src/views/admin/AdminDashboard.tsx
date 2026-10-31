import React from 'react';
import {
  Layers,
  Sparkles,
  FileText,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { StatCard, Badge } from '../../components/ui';
import type { DashboardStats, Subscription, Quotation } from '../../types';

interface AdminDashboardProps {
  stats: DashboardStats;
  subscriptions: Subscription[];
  quotations: Quotation[];
  onSelectSubscription: (sub: Subscription) => void;
  onNavigate: (view: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats,
  subscriptions,
  quotations,
  onSelectSubscription,
  onNavigate,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-indigo-300">
            System Control & Overview
          </span>
          <h2 className="text-2xl font-bold mt-1">SUBSCRIBO SaaS Administration</h2>
          <p className="text-sm text-indigo-200 mt-1">
            Real-time synchronization with Odoo 19 Community backend database.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('plans')}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white backdrop-blur-xs transition-colors border border-white/10 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Manage Plans
          </button>
          <button
            onClick={() => onNavigate('subscriptions')}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-500 hover:bg-indigo-400 text-white shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            View All Subscriptions
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Contracts"
          value={stats.activeSubscriptions}
          subtitle={`Out of ${stats.totalSubscriptions} total contracts`}
          icon={Layers}
          color="emerald"
          trend={{ value: '100% Retained', isPositive: true }}
        />
        <StatCard
          title="Monthly Recurring (MRV)"
          value={`₹ ${stats.monthlyRecurringValue.toLocaleString()}`}
          subtitle="Sum of active contracted plans"
          icon={TrendingUp}
          color="indigo"
        />
        <StatCard
          title="Pending Quotations"
          value={stats.draftQuotations}
          subtitle="Awaiting customer approval"
          icon={FileText}
          color="sky"
        />
        <StatCard
          title="Paused Subscriptions"
          value={stats.pausedSubscriptions}
          subtitle="Customer operational hold"
          icon={AlertTriangle}
          color="amber"
        />
      </div>

      {/* Main Grid: Recent Subscriptions & Recent Quotations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Subscriptions Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Recent Subscriptions</h3>
              <p className="text-xs text-slate-500 mt-0.5">Live contracts currently active in the database</p>
            </div>
            <button
              onClick={() => onNavigate('subscriptions')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">Reference</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Plan</th>
                  <th className="px-5 py-3">Total</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {subscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                      No subscription records found.
                    </td>
                  </tr>
                ) : (
                  subscriptions.slice(0, 5).map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-slate-900 font-mono">
                        {sub.name}
                      </td>
                      <td className="px-5 py-3.5 font-medium">{sub.partnerName}</td>
                      <td className="px-5 py-3.5 text-slate-600">{sub.planName}</td>
                      <td className="px-5 py-3.5 font-mono font-medium text-slate-900">
                        {sub.currency} {sub.amountTotal.toLocaleString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge status={sub.isPaused ? 'paused' : sub.state} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => onSelectSubscription(sub)}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Recent Quotations */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-semibold text-slate-900">Pending Quotations</h3>
              <p className="text-xs text-slate-500 mt-0.5">Pre-subscription sale orders</p>
            </div>
            <button
              onClick={() => onNavigate('quotations')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              All Quotes
            </button>
          </div>

          <div className="space-y-3">
            {quotations.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No quotations available.</p>
            ) : (
              quotations.slice(0, 4).map((q) => (
                <div key={q.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-semibold text-slate-800 block">{q.name}</span>
                    <span className="text-[11px] text-slate-500 block truncate max-w-[140px]">{q.partnerName}</span>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{q.currency} {q.amountTotal.toLocaleString()}</span>
                  </div>
                  <Badge status={q.state} />
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => onNavigate('quotations')}
              className="w-full py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors text-center"
            >
              Open Quotations Manager
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

