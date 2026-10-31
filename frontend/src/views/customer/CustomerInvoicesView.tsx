import React, { useEffect, useState } from 'react';
import { 
  Receipt, 
  Download, 
  AlertCircle
} from 'lucide-react';
import { odooApi } from '../../services/odooApi';
import type { Invoice } from '../../types';
import { Badge, Modal } from '../../components/ui';

export const CustomerInvoicesView: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await odooApi.getInvoices();
      setInvoices(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load your invoices.');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Invoices & Billing History</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your subscription statements, billing periods, payment statuses, and download official PDF tax invoices.
        </p>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Retrieving your invoices...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-600 space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No invoices yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              When your subscription enters its recurring billing cycle, generated invoices will be available here for inspection and PDF download.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Invoice #</th>
                  <th className="px-5 py-3.5">Service Period</th>
                  <th className="px-5 py-3.5">Issue Date</th>
                  <th className="px-5 py-3.5">Due Date</th>
                  <th className="px-5 py-3.5 text-right">Amount</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-900 text-xs flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-indigo-500" />
                      {inv.name}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-slate-500">
                      {inv.billingStart && inv.billingEnd ? (
                        <span>{inv.billingStart} → {inv.billingEnd}</span>
                      ) : (
                        <span>Standard Service</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {inv.invoiceDate || 'Pending'}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {inv.invoiceDateDue || '-'}
                    </td>
                    <td className="px-5 py-4 text-right font-bold font-mono text-slate-900">
                      {inv.currency} {inv.amountTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <Badge status={inv.paymentState === 'paid' ? 'paid' : inv.state} />
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenDetail(inv)}
                          className="px-3 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          View Details
                        </button>
                        <a
                          href={`http://localhost:8099/report/pdf/account.report_invoice/${inv.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF
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
          title={`Tax Invoice ${selectedInvoice.name}`}
          maxWidth="md"
        >
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-slate-400 block mb-0.5">Issue Date</span>
                <span className="font-bold text-slate-900">{selectedInvoice.invoiceDate || 'Draft'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Due Date</span>
                <span className="font-bold text-slate-900">{selectedInvoice.invoiceDateDue || 'Immediate'}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Payment State</span>
                <Badge status={selectedInvoice.paymentState === 'paid' ? 'paid' : selectedInvoice.state} />
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Subscription Reference</span>
                <span className="font-bold text-indigo-600">{selectedInvoice.subscriptionName || 'Standard'}</span>
              </div>
            </div>

            {selectedInvoice.billingStart && selectedInvoice.billingEnd && (
              <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-indigo-900 flex items-center justify-between">
                <span className="font-semibold">
                  Billing Cycle: {selectedInvoice.billingStart} to {selectedInvoice.billingEnd}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-white px-2 py-0.5 rounded border border-indigo-100">
                  Recurring
                </span>
              </div>
            )}

            {/* Line Items */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-600 uppercase tracking-wider text-[11px]">Billed Items</h4>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="px-3 py-2">Item Description</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Rate</th>
                      <th className="px-3 py-2 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedInvoice.lines.map(l => (
                      <tr key={l.id}>
                        <td className="px-3 py-2.5 font-medium text-slate-800">
                          <div>{l.productName}</div>
                          {l.name && l.name !== l.productName && (
                            <div className="text-[11px] text-slate-500 font-normal">{l.name}</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-600">{l.quantity}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-slate-600">
                          {selectedInvoice.currency} {l.priceUnit.toFixed(2)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                          {selectedInvoice.currency} {l.priceSubtotal.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Breakdown */}
            <div className="border-t border-slate-200 pt-3 flex flex-col items-end gap-1">
              <div className="flex justify-between w-44 text-slate-500">
                <span>Untaxed:</span>
                <span className="font-mono">{selectedInvoice.currency} {selectedInvoice.amountUntaxed.toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-44 text-slate-500">
                <span>Tax:</span>
                <span className="font-mono">{selectedInvoice.currency} {selectedInvoice.amountTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between w-44 text-sm font-bold text-slate-900 border-t border-slate-200 pt-1 mt-1">
                <span>Total:</span>
                <span className="font-mono text-indigo-600">{selectedInvoice.currency} {selectedInvoice.amountTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <a
                href={`http://localhost:8099/report/pdf/account.report_invoice/${selectedInvoice.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" />
                Download Tax Invoice (PDF)
              </a>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
