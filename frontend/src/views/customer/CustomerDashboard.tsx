import React from 'react';
import {
  Layers,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '../../components/ui';
import type { Subscription, Quotation, User } from '../../types';

interface CustomerDashboardProps {
  user: User | null;
  subscriptions: Subscription[];
  quotations: Quotation[];
  onSelectSubscription: (sub: Subscription) => void;
  onNavigate: (view: string) => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  user,
  subscriptions,
  quotations,
  onSelectSubscription,
  onNavigate,
}) => {
  const activeSub = subscriptions.find((s) => s.state === 'active') || subscriptions[0];
  const pendingQuotes = quotations.filter((q) => q.state === 'draft' || q.state === 'sent');

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-indigo-400">
            Customer Self-Service Hub
          </span>
          <h2 className="text-2xl font-bold mt-1">Welcome, {user?.name || 'Valued Customer'}</h2>
          <p className="text-sm text-slate-300 mt-1">
            Manage your cloud subscription plans, requested add-ons, and contract renewals.
          </p>
        </div>

        <button
          onClick={() => onNavigate('subscriptions')}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-500 hover:bg-indigo-400 text-white shadow-xs transition-colors flex items-center gap-1.5"
        >
          <Layers className="w-3.5 h-3.5" />
          View Subscriptions
        </button>
      </div>

      {/* Active Plan Spotlight Card */}
      {activeSub ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-slate-100">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Current Active Contract</span>
              <div className="flex items-center gap-2 mt-0.5">
                <h3 className="text-lg font-bold text-slate-900">{activeSub.planName}</h3>
                <span className="font-mono text-xs text-slate-400 font-semibold">({activeSub.name})</span>
              </div>
            </div>
            <Badge status={activeSub.isPaused ? 'paused' : activeSub.state} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <span className="text-slate-400 block mb-1">Contract Validity</span>
              <p className="font-semibold text-slate-800 text-sm">
                {activeSub.startDate} <span className="text-slate-400 mx-1">→</span> {activeSub.expiryDate}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <span className="text-slate-400 block mb-1">Total Recurring Value</span>
              <p className="font-bold text-indigo-600 text-lg font-mono">
                {activeSub.currency} {activeSub.amountTotal.toLocaleString()}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs">
              <span className="text-slate-400 block mb-1">Contract Status</span>
              <p className="font-semibold text-slate-800 text-sm">
                {activeSub.isPaused ? 'Service Temporarily Paused' : 'Provisioned & Operational'}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Need extra capacity or support? Add optional modules to your contract.
            </span>
            <button
              onClick={() => onSelectSubscription(activeSub)}
              className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            >
              Manage Contract & Add-ons <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
          <p className="text-xs text-slate-400">No active subscriptions registered.</p>
        </div>
      )}

      {/* Pending Quotations for Acceptance */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900">Quotations & Change Orders</h3>
            <p className="text-xs text-slate-500 mt-0.5">Quotations awaiting your digital confirmation</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            {pendingQuotes.length} Pending
          </span>
        </div>

        {pendingQuotes.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-400" />
            You have no pending quotations requiring approval.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {pendingQuotes.map((q) => (
              <div key={q.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                <div>
                  <span className="font-mono font-bold text-slate-900 text-xs">{q.name}</span>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">
                    {q.planName || (q.isAddonChange ? 'Add-on Service Upgrade Order' : 'Quotation')}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-indigo-600 text-sm">
                    {q.currency} {q.amountTotal.toLocaleString()}
                  </span>
                  <button
                    onClick={() => onNavigate('quotations')}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
                  >
                    Review Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

