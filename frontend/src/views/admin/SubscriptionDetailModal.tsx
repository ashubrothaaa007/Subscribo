import React, { useState } from 'react';
import {
  AlertCircle,
  Clock,
  Repeat,
  Package,
} from 'lucide-react';
import { Modal, Badge } from '../../components/ui';
import type { Subscription, UserRole } from '../../types';

interface SubscriptionDetailModalProps {
  subscription: Subscription | null;
  isOpen: boolean;
  onClose: () => void;
  role?: UserRole;
  onPause?: (id: number) => void;
  onResume?: (id: number) => void;
  onCloseSub?: (id: number) => void;
  onRenew?: (id: number) => void;
  onRequestAddon?: (addonId: number) => void;
  onDisableAddon?: (addonId: number) => void;
}

export const SubscriptionDetailModal: React.FC<SubscriptionDetailModalProps> = ({
  subscription,
  isOpen,
  onClose,
  role: _role,
  onPause,
  onResume,
  onCloseSub,
  onRenew,
  onRequestAddon,
  onDisableAddon,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'addons' | 'history' | 'renewals'>('overview');

  if (!subscription) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Subscription: ${subscription.name}`}
      description={`Customer: ${subscription.partnerName} • Quotation: ${subscription.saleOrderName}`}
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Badge status={subscription.isPaused ? 'paused' : subscription.state} />
            <span className="text-xs text-slate-500">
              Total: <strong className="text-slate-800">{subscription.currency} {subscription.amountTotal.toLocaleString()}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {subscription.state === 'active' && !subscription.isPaused && onPause && (
              <button
                onClick={() => onPause(subscription.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
              >
                Pause
              </button>
            )}

            {subscription.state === 'active' && subscription.isPaused && onResume && (
              <button
                onClick={() => onResume(subscription.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
              >
                Resume
              </button>
            )}

            {subscription.state === 'active' && onRenew && (
              <button
                onClick={() => onRenew(subscription.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
              >
                Renew
              </button>
            )}

            {subscription.state === 'active' && onCloseSub && (
              <button
                onClick={() => onCloseSub(subscription.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors"
              >
                Close
              </button>
            )}

            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 -mx-6 px-6 gap-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('addons')}
            className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'addons'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>Add-on Products</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold">
              {subscription.addons.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('renewals')}
            className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'renewals'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>Renewals</span>
            {subscription.renewedFromId && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-600 font-bold">
                Linked
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <span>Audit History</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 font-bold">
              {subscription.events.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-4 pt-1">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block mb-1">Plan & Quantity</span>
                <span className="font-semibold text-slate-800 text-sm block">
                  {subscription.planName}
                </span>
                <span className="text-slate-500 mt-1 block">
                  Qty: {subscription.quantity} Unit(s)
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-slate-500 block mb-1">Billing Period</span>
                <span className="font-semibold text-slate-800 text-sm block">
                  {subscription.startDate} → {subscription.expiryDate}
                </span>
                <span className="text-slate-500 mt-1 block">
                  Status: <span className="capitalize font-medium text-slate-700">{subscription.state}</span>
                </span>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Financial Breakdown</h4>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Untaxed Amount:</span>
                <span className="font-mono">{subscription.currency} {subscription.amountUntaxed.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Taxes:</span>
                <span className="font-mono">{subscription.currency} {subscription.amountTax.toLocaleString()}</span>
              </div>
              <div className="pt-2 border-t border-slate-100 flex justify-between text-sm font-bold text-slate-900">
                <span>Total Recurring:</span>
                <span className="text-indigo-600">{subscription.currency} {subscription.amountTotal.toLocaleString()}</span>
              </div>
            </div>

            {subscription.isPaused && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2 text-xs text-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Subscription is currently Paused</p>
                  <p className="text-amber-700 mt-0.5">
                    Paused at: {subscription.pauseStartedAt || 'Active operational hold'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Add-ons */}
        {activeTab === 'addons' && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between text-xs">
              <p className="text-slate-500">Managed add-on services linked to this subscription.</p>
            </div>

            {subscription.addons.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                No add-on products currently attached.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {subscription.addons.map((addon) => (
                  <div key={addon.id} className="p-3.5 flex items-center justify-between bg-white hover:bg-slate-50/50">
                    <div>
                      <h5 className="text-xs font-semibold text-slate-900">{addon.name}</h5>
                      <span className="text-[11px] text-slate-500">
                        {subscription.currency} {addon.price.toLocaleString()} / interval
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          addon.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {addon.isActive ? 'Active' : 'Disabled'}
                      </span>

                      {addon.isActive && onDisableAddon && (
                        <button
                          onClick={() => onDisableAddon(addon.id)}
                          className="text-[11px] font-medium text-rose-600 hover:underline"
                        >
                          Disable
                        </button>
                      )}

                      {!addon.isActive && onRequestAddon && (
                        <button
                          onClick={() => onRequestAddon(addon.id)}
                          className="text-[11px] font-medium text-indigo-600 hover:underline"
                        >
                          Request Re-enable
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Renewals */}
        {activeTab === 'renewals' && (
          <div className="space-y-3 pt-1 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <h5 className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Repeat className="w-4 h-4 text-indigo-600" />
                Renewal Succession Chain
              </h5>
              {subscription.renewedFromId ? (
                <p className="text-slate-600">
                  This subscription was renewed from prior contract #{subscription.renewedFromId}.
                </p>
              ) : (
                <p className="text-slate-500">This is an original contract (not renewed from a prior subscription).</p>
              )}
              {subscription.renewalIds.length > 0 ? (
                <p className="text-emerald-700 font-medium">
                  Successor contracts created: {subscription.renewalIds.join(', ')}
                </p>
              ) : (
                <p className="text-slate-400">No successor subscriptions created yet.</p>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Audit History */}
        {activeTab === 'history' && (
          <div className="space-y-2 pt-1 text-xs">
            {subscription.events.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl">
                No audit events recorded yet.
              </div>
            ) : (
              <div className="space-y-2">
                {subscription.events.map((e) => (
                  <div key={e.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800 capitalize">
                          {e.eventType.replace('_', ' ')}
                        </span>
                        <span className="text-[10px] text-slate-400">{e.date}</span>
                      </div>
                      <p className="text-slate-600 mt-0.5">{e.details}</p>
                      <span className="text-[10px] text-slate-400 block mt-1">By: {e.userName}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

