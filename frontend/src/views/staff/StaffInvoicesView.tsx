import React, { useEffect, useState } from 'react';
import { 
  Receipt, 
  Search, 
  Download, 
  AlertCircle, 
  RotateCw
} from 'lucide-react';
import { odooApi } from '../../services/odooApi';
import type { Invoice } from '../../types';
import { Badge, Modal } from '../../components/ui';

export const StaffInvoicesView: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await odooApi.getInvoices();
      setInvoices(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load staff invoice records.');
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

  const filtered = invoices.filter(inv => {
    return (
      inv.name.toLowerCase().includes(search.toLowerCase()) ||
      inv.partnerName.toLowerCase().includes(search.toLowerCase()) ||
      (inv.subscriptionName && inv.subscriptionName.toLowerCase().includes(search.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subscription Invoices</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Staff Operations
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Scoped access to subscription customer billing records, automated cycles, and PDF previews.
          </p>
        </div>

        <button
          onClick={fetchInvoices}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs self-start"
        >
          <RotateCw className="w-4 h-4 text-slate-500" />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by invoice #, customer name, or subscription..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Loading permitted subscription invoices...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs italic">
            No subscription invoices available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Invoice #</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Subscription</th>
                  <th className="px-5 py-3.5">Billing Period</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5 text-right">Total</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-indigo-500" />
                      {inv.name}
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-800">
                      {inv.partnerName}
                    </td>
                    <td className="px-5 py-4 text-xs font-semibold text-indigo-600">
                      {inv.subscriptionName || '-'}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-slate-500">
                      {inv.billingStart && inv.billingEnd ? `${inv.billingStart} → ${inv.billingEnd}` : '-'}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {inv.invoiceDate || 'Draft'}
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-slate-900 font-mono">
                      {inv.currency} {inv.amountTotal.toFixed(2)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge status={inv.state} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenDetail(inv)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          View
                        </button>
                        <a
                          href={`http://localhost:8099/report/pdf/account.report_invoice/${inv.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                          title="Download PDF"
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
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-400 block">Customer</span>
                <span className="font-bold text-slate-900">{selectedInvoice.partnerName}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Subscription</span>
                <span className="font-bold text-indigo-600">{selectedInvoice.subscriptionName || 'None'}</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedInvoice.lines.map(l => (
                    <tr key={l.id}>
                      <td className="px-3 py-2 font-medium text-slate-800">{l.name || l.productName}</td>
                      <td className="px-3 py-2 text-right font-mono">{l.quantity}</td>
                      <td className="px-3 py-2 text-right font-mono">{selectedInvoice.currency} {l.priceUnit.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-900">{selectedInvoice.currency} {l.priceSubtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex justify-between items-center border-t border-slate-200">
              <div className="text-sm font-bold text-slate-900">
                Total: <span className="font-mono text-indigo-600">{selectedInvoice.currency} {selectedInvoice.amountTotal.toFixed(2)}</span>
              </div>
              <a
                href={`http://localhost:8099/report/pdf/account.report_invoice/${selectedInvoice.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </a>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
