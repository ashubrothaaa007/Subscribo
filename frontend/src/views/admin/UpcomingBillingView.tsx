import React, { useEffect, useState } from 'react';
import { 
  CalendarClock, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Receipt,
  RotateCw
} from 'lucide-react';
import { odooApi } from '../../services/odooApi';
import type { UpcomingBillingItem } from '../../types';
import { Badge } from '../../components/ui';

export const UpcomingBillingView: React.FC = () => {
  const [items, setItems] = useState<UpcomingBillingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');

  const fetchUpcoming = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await odooApi.getUpcomingBilling();
      setItems(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load upcoming billing schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcoming();
  }, []);

  const handleGenerateInvoice = async (subscriptionId: number) => {
    try {
      setGeneratingId(subscriptionId);
      setSuccessMsg(null);
      await odooApi.generateSubscriptionInvoice(subscriptionId);
      setSuccessMsg(`Generated recurring invoice for subscription #${subscriptionId}.`);
      await fetchUpcoming();
    } catch (err: any) {
      alert(`Generation failed: ${err.message}`);
    } finally {
      setGeneratingId(null);
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.subscriptionName.toLowerCase().includes(search.toLowerCase()) ||
      item.partnerName.toLowerCase().includes(search.toLowerCase()) ||
      item.planName.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;

    if (filterStatus === 'all') return true;
    if (filterStatus === 'due') return item.status === 'due';
    if (filterStatus === 'upcoming') return item.status === 'upcoming';
    if (filterStatus === 'paused') return item.status === 'paused';
    return true;
  });

  const dueCount = items.filter(i => i.status === 'due').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Upcoming Billing Schedule</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
              {dueCount} Due Now
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time billing cycle projections across Daily, Weekly, Monthly, and Yearly subscriptions.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUpcoming}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RotateCw className="w-4 h-4 text-slate-500" />
            Refresh
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900">
            Dismiss
          </button>
        </div>
      )}

      {/* Control bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search subscription, customer, or plan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {[
            { id: 'all', label: `All (${items.length})` },
            { id: 'due', label: `Due (${dueCount})` },
            { id: 'upcoming', label: `Upcoming (${items.filter(i => i.status === 'upcoming').length})` },
            { id: 'paused', label: `Paused (${items.filter(i => i.status === 'paused').length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 ${
                filterStatus === tab.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Calculating subscription billing schedules...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <CalendarClock className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">No scheduled subscriptions found</p>
            <p className="text-xs text-slate-400">All subscriptions are up to date or no records match.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Subscription</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Plan / Cadence</th>
                  <th className="px-5 py-3.5">Current Cycle</th>
                  <th className="px-5 py-3.5">Next Invoice Date</th>
                  <th className="px-5 py-3.5 text-right">Cycle Amount</th>
                  <th className="px-5 py-3.5">Billing Status</th>
                  <th className="px-5 py-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.subscriptionId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-900 text-xs">
                      {item.subscriptionName}
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-800">
                      {item.partnerName}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <div className="font-semibold text-slate-900">{item.planName}</div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        {item.billingInterval}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-slate-500">
                      {item.billingStart} → {item.billingEnd}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono font-semibold">
                      <span className={item.status === 'due' ? 'text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200' : 'text-slate-700'}>
                        {item.nextInvoiceDate}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-slate-900">
                      {item.currency} {item.estimatedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4">
                      <Badge status={item.status} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      {item.status === 'due' ? (
                        <button
                          disabled={generatingId === item.subscriptionId}
                          onClick={() => handleGenerateInvoice(item.subscriptionId)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-2xs hover:shadow-xs disabled:opacity-50"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          {generatingId === item.subscriptionId ? 'Generating...' : 'Invoice Now'}
                        </button>
                      ) : (
                        <button
                          disabled={generatingId === item.subscriptionId || item.status === 'paused' || item.status === 'closed'}
                          onClick={() => handleGenerateInvoice(item.subscriptionId)}
                          className="px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Generate invoice for this subscription"
                        >
                          Manual Bill
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
