import React, { useState } from 'react';
import { FileText, Search } from 'lucide-react';
import { Badge } from '../../components/ui';
import type { Quotation } from '../../types';

interface QuotationsViewProps {
  quotations: Quotation[];
  onConfirmQuotation: (id: number) => Promise<void>;
  onRefresh: () => void;
}

export const QuotationsView: React.FC<QuotationsViewProps> = ({
  quotations,
  onConfirmQuotation,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState<number | null>(null);

  const filtered = quotations.filter((q) =>
    q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.planName && q.planName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleConfirm = async (id: number) => {
    setIsProcessing(id);
    try {
      await onConfirmQuotation(id);
      onRefresh();
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search quotation reference or customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <span className="text-xs text-slate-500 font-medium">
          Showing <strong>{filtered.length}</strong> subscription quotations
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Quote Ref</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Plan / Type</th>
                <th className="px-5 py-3">Order Date</th>
                <th className="px-5 py-3">Total Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No subscription quotations found.
                  </td>
                </tr>
              ) : (
                filtered.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-semibold text-slate-900">
                      {q.name}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-800">{q.partnerName}</td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-slate-800 block">
                        {q.planName || 'Add-on Change Request'}
                      </span>
                      {q.isAddonChange && (
                        <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded-md font-bold">
                          Add-on Change
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono">
                      {q.dateOrder ? q.dateOrder.slice(0, 10) : '—'}
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                      {q.currency} {q.amountTotal.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge status={q.state} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {q.state === 'draft' || q.state === 'sent' ? (
                        <button
                          onClick={() => handleConfirm(q.id)}
                          disabled={isProcessing === q.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors shadow-xs"
                        >
                          {isProcessing === q.id ? 'Confirming...' : 'Confirm Order'}
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Processed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

