import React, { useEffect, useState } from 'react';
import { 
  Receipt, 
  TrendingUp, 
  CalendarClock, 
  CheckCircle2, 
  ArrowUpRight, 
  Play, 
  RotateCw
} from 'lucide-react';
import { odooApi } from '../../services/odooApi';
import type { BillingStats, Invoice, UpcomingBillingItem } from '../../types';
import { StatCard, Badge } from '../../components/ui';

interface BillingDashboardProps {
  onNavigate: (view: string) => void;
}

export const BillingDashboard: React.FC<BillingDashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [dueItems, setDueItems] = useState<UpcomingBillingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [bStats, invs, upcoming] = await Promise.all([
        odooApi.getBillingStats(),
        odooApi.getInvoices(),
        odooApi.getUpcomingBilling(),
      ]);
      setStats(bStats);
      setRecentInvoices(invs.slice(0, 5));
      setDueItems(upcoming.filter(u => u.isDue));
    } catch (err: any) {
      setError(err.message || 'Failed to load billing dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recurring Billing & Invoicing</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Automated Invoicing Live
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Automated recurring invoice generation engine, scheduled cron actions, and idempotency protection.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
          >
            <RotateCw className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => onNavigate('upcoming-billing')}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-2xs hover:shadow-xs"
          >
            <CalendarClock className="w-4 h-4" />
            Upcoming Schedule
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Invoiced Value"
          value={stats ? `₹ ${stats.totalInvoicedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹ 0.00'}
          subtitle={`${stats?.totalInvoiceCount || 0} invoices generated`}
          icon={Receipt}
          color="indigo"
        />
        <StatCard
          title="Active Projected MRR"
          value={stats ? `₹ ${stats.upcomingMonthlyRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '₹ 0.00'}
          subtitle="Monthly Recurring Revenue"
          icon={TrendingUp}
          color="emerald"
        />
        <StatCard
          title="Billing Cycles Due"
          value={stats ? stats.dueSoonCount.toString() : '0'}
          subtitle="Awaiting recurring run"
          icon={CalendarClock}
          color="amber"
        />
        <StatCard
          title="Paid Invoices"
          value={stats ? stats.paidInvoiceCount.toString() : '0'}
          subtitle={`${stats?.draftInvoiceCount || 0} in draft status`}
          icon={CheckCircle2}
          color="indigo"
        />
      </div>

      {/* Cron Engine & Automation Banner */}
      <div className="p-5 rounded-2xl bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
              Odoo Scheduled Action
            </span>
            <span className="text-xs text-slate-300 font-mono">ir.cron: recurring_invoicing</span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            Automated Daily Billing Cron Job Active
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Checks all active, unpaused subscriptions where <code className="text-indigo-200">next_invoice_date &le; today</code>. Each invoice creation runs inside an isolated database savepoint to prevent batch blocking on single record failures.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center shrink-0">
          <button
            onClick={() => onNavigate('upcoming-billing')}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-2 shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Inspect Schedule & Run
          </button>
          <button
            onClick={() => onNavigate('invoices')}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors border border-white/10"
          >
            View All Invoices
          </button>
        </div>
      </div>

      {/* 2 Column Grid: Subscriptions Due Now + Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Due Subscriptions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-slate-900">Subscriptions Due for Billing</h3>
            </div>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
              {dueItems.length} Due
            </span>
          </div>

          {dueItems.length === 0 ? (
            <div className="p-8 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-medium text-slate-600">All subscriptions are up to date</p>
              <p className="text-[11px] text-slate-400">No active subscriptions currently have an invoice overdue.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {dueItems.map(item => (
                <div key={item.subscriptionId} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{item.subscriptionName}</div>
                    <div className="text-slate-500">{item.partnerName} &bull; <span className="font-semibold text-indigo-600">{item.planName}</span></div>
                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">Due: {item.nextInvoiceDate}</div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <div className="font-bold font-mono text-slate-900">
                      {item.currency} {item.estimatedAmount.toFixed(2)}
                    </div>
                    <button
                      onClick={() => onNavigate('upcoming-billing')}
                      className="px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-[11px] transition-colors"
                    >
                      Process Bill
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-indigo-600" />
              <h3 className="text-base font-bold text-slate-900">Recent Customer Invoices</h3>
            </div>
            <button
              onClick={() => onNavigate('invoices')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              See All <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentInvoices.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs italic">
              No invoices generated yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentInvoices.map(inv => (
                <div key={inv.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                      {inv.name}
                      {inv.isRecurring && (
                        <span className="text-[9px] uppercase font-bold bg-purple-50 text-purple-700 border border-purple-200 px-1 py-0.2 rounded">
                          Recurring
                        </span>
                      )}
                    </div>
                    <div className="text-slate-500">{inv.partnerName}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{inv.invoiceDate || 'Draft'}</div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <div className="font-bold font-mono text-slate-900">
                      {inv.currency} {inv.amountTotal.toFixed(2)}
                    </div>
                    <Badge status={inv.state} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
