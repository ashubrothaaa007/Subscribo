import React, { useEffect, useState } from 'react';
import { 
  Receipt, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  Sparkles
} from 'lucide-react';
import { odooApi } from '../../services/odooApi';
import type { Invoice } from '../../types';
import { Badge, Modal } from '../../components/ui';

export const AllInvoicesView: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterState, setFilterState] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [postingId, setPostingId] = useState<number | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await odooApi.getInvoices();
      setInvoices(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load invoices from Odoo backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleOpenDetail = async (inv: Invoice) => {
    try {
      const full = await odooApi.getInvoice(inv.id);
      setSelectedInvoice(full || inv);
    } catch {
      setSelectedInvoice(inv);
    }
  };

  const handlePostInvoice = async (id: number) => {
    try {
      setPostingId(id);
      await odooApi.postInvoice(id);
      await fetchInvoices();
      if (selectedInvoice && selectedInvoice.id === id) {
        setSelectedInvoice(prev => prev ? { ...prev, state: 'posted' } : null);
      }
    } catch (err: any) {
      alert(`Failed to post invoice: ${err.message}`);
    } finally {
      setPostingId(null);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.name.toLowerCase().includes(search.toLowerCase()) ||
      inv.partnerName.toLowerCase().includes(search.toLowerCase()) ||
      (inv.subscriptionName && inv.subscriptionName.toLowerCase().includes(search.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (filterState === 'all') return true;
    if (filterState === 'draft') return inv.state === 'draft';
    if (filterState === 'posted') return inv.state === 'posted';
    if (filterState === 'paid') return inv.paymentState === 'paid';
    if (filterState === 'recurring') return inv.isRecurring;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">All Invoices</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Standard customer billing records, automated recurring cycles, and PDF statement exports.
          </p>
        </div>
        <button
          onClick={fetchInvoices}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs self-start"
        >
          <Receipt className="w-4 h-4 text-indigo-600" />
          Refresh Records
        </button>
      </div>

      {/* Control bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by invoice #, customer, or subscription..."
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
            { id: 'all', label: `All (${invoices.length})` },
            { id: 'recurring', label: `Recurring (${invoices.filter(i => i.isRecurring).length})` },
            { id: 'draft', label: `Draft (${invoices.filter(i => i.state === 'draft').length})` },
            { id: 'posted', label: `Posted (${invoices.filter(i => i.state === 'posted').length})` },
            { id: 'paid', label: `Paid (${invoices.filter(i => i.paymentState === 'paid').length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterState(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shrink-0 ${
                filterState === tab.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading billing records from Odoo database...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No invoices found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {invoices.length === 0
                ? "No recurring customer invoices have been generated yet. Use the 'Upcoming Billing' view to generate one or run the automated cron."
                : 'No invoices match your selected filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Invoice #</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Subscription Source</th>
                  <th className="px-5 py-3.5">Billing Period</th>
                  <th className="px-5 py-3.5">Invoice Date</th>
                  <th className="px-5 py-3.5 text-right">Total</th>
                  <th className="px-5 py-3.5">State</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-900 text-xs flex items-center gap-2">
                      <Receipt className="w-3.5 h-3.5 text-indigo-500" />
                      {inv.name}
                      {inv.isRecurring && (
                        <span className="text-[10px] uppercase font-bold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded">
                          Recurring
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-800">
                      {inv.partnerName}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      {inv.subscriptionName ? (
                        <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {inv.subscriptionName}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Standalone</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {inv.billingStart && inv.billingEnd ? (
                        <div className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{inv.billingStart}</span>
                          <span className="text-slate-300">→</span>
                          <span>{inv.billingEnd}</span>
                        </div>
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {inv.invoiceDate || 'Unset'}
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-slate-900">
                      {inv.currency} {inv.amountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <Badge status={inv.state} />
                        {inv.paymentState === 'paid' && (
                          <Badge status="paid" />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenDetail(inv)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          Details
                        </button>
                        {inv.state === 'draft' && (
                          <button
                            disabled={postingId === inv.id}
                            onClick={() => handlePostInvoice(inv.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {postingId === inv.id ? 'Posting...' : 'Post'}
                          </button>
                        )}
                        <a
                          href={`http://localhost:8099/report/pdf/account.report_invoice/${inv.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                          title="Download Odoo PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedInvoice && (
        <Modal
          isOpen={Boolean(selectedInvoice)}
          onClose={() => setSelectedInvoice(null)}
          title={`Invoice ${selectedInvoice.name}`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            {/* Header info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Customer</span>
                <span className="font-bold text-slate-900">{selectedInvoice.partnerName}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Subscription</span>
                <span className="font-bold text-indigo-600">{selectedInvoice.subscriptionName || 'None'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Invoice Date</span>
                <span className="font-bold text-slate-900">{selectedInvoice.invoiceDate || 'Draft'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">State</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <Badge status={selectedInvoice.state} />
                </div>
              </div>
            </div>

            {/* Billing period details */}
            {selectedInvoice.billingStart && selectedInvoice.billingEnd && (
              <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200/80 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold text-purple-900">
                    Recurring Service Period: {selectedInvoice.billingStart} to {selectedInvoice.billingEnd}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                  Automated Cycle
                </span>
              </div>
            )}

            {/* Line items table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice Lines Breakdown</h4>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2.5">Product / Service</th>
                      <th className="px-4 py-2.5 text-right">Qty</th>
                      <th className="px-4 py-2.5 text-right">Unit Price</th>
                      <th className="px-4 py-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.lines.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-slate-400 italic">
                          No lines found on this invoice.
                        </td>
                      </tr>
                    ) : (
                      selectedInvoice.lines.map((l) => (
                        <tr key={l.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            <div>{l.productName}</div>
                            {l.name && l.name !== l.productName && (
                              <div className="text-[11px] text-slate-500">{l.name}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600">
                            {l.quantity}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-slate-600">
                            {selectedInvoice.currency} {l.priceUnit.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                            {selectedInvoice.currency} {l.priceSubtotal.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div className="border-t border-slate-200 pt-4 flex flex-col items-end gap-1 text-xs">
              <div className="flex justify-between w-48 text-slate-600">
                <span>Untaxed:</span>
                <span className="font-mono">{selectedInvoice.currency} {selectedInvoice.amountUntaxed.toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-48 text-slate-600">
                <span>Taxes:</span>
                <span className="font-mono">{selectedInvoice.currency} {selectedInvoice.amountTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-48 text-sm font-bold text-slate-900 border-t border-slate-200 pt-1.5 mt-1">
                <span>Total Due:</span>
                <span className="font-mono text-indigo-600">{selectedInvoice.currency} {selectedInvoice.amountTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2">
              <a
                href={`http://localhost:8099/report/pdf/account.report_invoice/${selectedInvoice.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download Official PDF
              </a>

              <div className="flex items-center gap-2">
                {selectedInvoice.state === 'draft' && (
                  <button
                    disabled={postingId === selectedInvoice.id}
                    onClick={() => handlePostInvoice(selectedInvoice.id)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors disabled:opacity-50 shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {postingId === selectedInvoice.id ? 'Posting...' : 'Post Invoice'}
                  </button>
                )}
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
