import React, { useState } from 'react';
import {
  Search,
  Layers,
  Pause,
  Play,
  XCircle,
  Repeat,
  Eye,
} from 'lucide-react';
import { Badge, Modal } from '../../components/ui';
import type { Subscription } from '../../types';

interface SubscriptionManagementProps {
  subscriptions: Subscription[];
  onSelectSubscription: (sub: Subscription) => void;
  onPause: (id: number, reason: string) => Promise<void>;
  onResume: (id: number, reason: string) => Promise<void>;
  onCloseSub: (id: number, reason: string) => Promise<void>;
  onRenew: (id: number, startDate?: string, expiryDate?: string) => Promise<void>;
  onRefresh: () => void;
}

export const SubscriptionManagement: React.FC<SubscriptionManagementProps> = ({
  subscriptions,
  onSelectSubscription,
  onPause,
  onResume,
  onCloseSub,
  onRenew,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Action Modals State
  const [actionModal, setActionModal] = useState<{
    type: 'pause' | 'resume' | 'close' | 'renew';
    sub: Subscription;
  } | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = subscriptions.filter((sub) => {
    const matchesSearch =
      sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sub.planName.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'paused') return sub.isPaused;
    return sub.state === statusFilter;
  });

  const handleExecuteAction = async () => {
    if (!actionModal) return;
    setIsSubmitting(true);
    try {
      if (actionModal.type === 'pause') {
        await onPause(actionModal.sub.id, reason || 'Customer requested operational pause');
      } else if (actionModal.type === 'resume') {
        await onResume(actionModal.sub.id, reason || 'Resumed service');
      } else if (actionModal.type === 'close') {
        await onCloseSub(actionModal.sub.id, reason || 'Subscription closed');
      } else if (actionModal.type === 'renew') {
        await onRenew(actionModal.sub.id);
      }
      setActionModal(null);
      setReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Search and Filter bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 justify-between items-center">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reference, customer, plan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
          {['all', 'active', 'paused', 'draft', 'quotation', 'confirmed', 'closed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-colors shrink-0 ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
              <tr>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Customer</th>
                <th className="px-5 py-3">Plan Details</th>
                <th className="px-5 py-3">Term & Expiry</th>
                <th className="px-5 py-3">Recurring Total</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Operations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <Layers className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No subscriptions matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-slate-900 font-mono">
                      {sub.name}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-slate-800 block">{sub.partnerName}</span>
                      <span className="text-[10px] text-slate-400 font-mono block">Order: {sub.saleOrderName}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-slate-800 block">{sub.planName}</span>
                      <span className="text-[10px] text-slate-400">Qty: {sub.quantity} unit(s)</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <span>{sub.startDate}</span>
                      <span className="text-slate-400 mx-1">→</span>
                      <span className="font-medium text-slate-800">{sub.expiryDate}</span>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                      {sub.currency} {sub.amountTotal.toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge status={sub.isPaused ? 'paused' : sub.state} />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onSelectSubscription(sub)}
                          title="View Details"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {sub.state === 'active' && !sub.isPaused && (
                          <button
                            onClick={() => setActionModal({ type: 'pause', sub })}
                            title="Pause Subscription"
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          >
                            <Pause className="w-4 h-4" />
                          </button>
                        )}

                        {sub.state === 'active' && sub.isPaused && (
                          <button
                            onClick={() => setActionModal({ type: 'resume', sub })}
                            title="Resume Subscription"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}

                        {sub.state === 'active' && (
                          <button
                            onClick={() => setActionModal({ type: 'renew', sub })}
                            title="Create Renewal Quotation"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Repeat className="w-4 h-4" />
                          </button>
                        )}

                        {sub.state === 'active' && (
                          <button
                            onClick={() => setActionModal({ type: 'close', sub })}
                            title="Close Subscription"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation / Action Modal */}
      {actionModal && (
        <Modal
          isOpen={true}
          onClose={() => setActionModal(null)}
          title={`Confirm Operation: ${actionModal.type.toUpperCase()}`}
          description={`Subscription: ${actionModal.sub.name} (${actionModal.sub.partnerName})`}
          maxWidth="md"
          footer={
            <div className="flex gap-2">
              <button
                onClick={() => setActionModal(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteAction}
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            {actionModal.type === 'pause' && (
              <>
                <p className="text-slate-600">
                  Pausing this subscription stops service provisioning. Main lifecycle state remains Active with paused flag enabled.
                </p>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Reason for Pause:</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Customer seasonal hold..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </>
            )}

            {actionModal.type === 'resume' && (
              <p className="text-slate-600">
                Resuming will reactivate all service flags and log the reactivation event in the immutable audit history.
              </p>
            )}

            {actionModal.type === 'renew' && (
              <p className="text-slate-600">
                This will trigger the Odoo renewal workflow, creating a priced renewal change quotation and establishing a linked successor relationship.
              </p>
            )}

            {actionModal.type === 'close' && (
              <>
                <p className="text-rose-600 font-medium">
                  Warning: Closing a subscription is final and terminates the active contract.
                </p>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Reason for Closure:</label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Contract completed, customer non-renewal..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

