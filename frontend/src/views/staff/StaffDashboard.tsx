import React from 'react';
import { Layers, FileText, Users, Sliders, ArrowUpRight } from 'lucide-react';
import { StatCard, Badge } from '../../components/ui';
import type { DashboardStats, Subscription, Quotation } from '../../types';

interface StaffDashboardProps {
  stats: DashboardStats;
  subscriptions: Subscription[];
  quotations?: Quotation[];
  onSelectSubscription: (sub: Subscription) => void;
  onNavigate: (view: string) => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  stats,
  subscriptions,
  onSelectSubscription,
  onNavigate,
}) => {
  return (
    <div className="space-y-6">
      {/* Staff Operational Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-slate-900 rounded-2xl p-6 text-white shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-blue-300">
            Operations Console
          </span>
          <h2 className="text-2xl font-bold mt-1">Staff Service Workspace</h2>
          <p className="text-sm text-blue-200 mt-1">
            Day-to-day subscription customer handling, operations, and quotation approvals.
          </p>
        </div>

        <button
          onClick={() => onNavigate('subscriptions')}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-500 hover:bg-blue-400 text-white shadow-xs transition-colors flex items-center gap-1.5"
        >
          <Sliders className="w-3.5 h-3.5" />
          Manage Subscriptions
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Contracts"
          value={stats.activeSubscriptions}
          subtitle="Managed subscriptions"
          icon={Layers}
          color="emerald"
        />
        <StatCard
          title="Draft Quotes"
          value={stats.draftQuotations}
          subtitle="Pending customer confirmation"
          icon={FileText}
          color="sky"
        />
        <StatCard
          title="Paused Contracts"
          value={stats.pausedSubscriptions}
          subtitle="Customer operational pause"
          icon={Sliders}
          color="amber"
        />
        <StatCard
          title="Assigned Accounts"
          value={stats.totalCustomers}
          subtitle="Active client accounts"
          icon={Users}
          color="indigo"
        />
      </div>

      {/* Operational List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900">Subscriptions Requiring Attention</h3>
            <p className="text-xs text-slate-500 mt-0.5">Active or paused customer contracts</p>
          </div>
          <button
            onClick={() => onNavigate('subscriptions')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            All Subscriptions <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {subscriptions.slice(0, 5).map((sub) => (
                <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900">{sub.name}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{sub.partnerName}</td>
                  <td className="px-4 py-3 text-slate-600">{sub.planName}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {sub.startDate} → {sub.expiryDate}
                  </td>
                  <td className="px-4 py-3">
                    <Badge status={sub.isPaused ? 'paused' : sub.state} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => onSelectSubscription(sub)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

