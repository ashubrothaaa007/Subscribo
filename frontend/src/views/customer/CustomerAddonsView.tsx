import React, { useState } from 'react';
import { Package, Plus, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../components/ui';
import type { Subscription, ProductCatalogItem } from '../../types';

interface CustomerAddonsViewProps {
  subscription: Subscription | null;
  availableAddons: ProductCatalogItem[];
  onRequestAddon: (subscriptionId: number, addonProductId: number) => Promise<void>;
  onDisableAddon: (addonId: number, reason: string) => Promise<void>;
  onRefresh: () => void;
}

export const CustomerAddonsView: React.FC<CustomerAddonsViewProps> = ({
  subscription,
  availableAddons,
  onRequestAddon,
  onDisableAddon,
  onRefresh,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<ProductCatalogItem | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const activeAddons = subscription?.addons.filter((a) => a.isActive) || [];

  const handleRequest = async () => {
    if (!subscription || !selectedProduct) return;
    setIsSubmitting(true);
    try {
      await onRequestAddon(subscription.id, selectedProduct.id);
      setSuccessNotice(
        `A priced change quotation has been generated for ${selectedProduct.name}. Please review and approve it under Quotations to activate this add-on.`
      );
      setConfirmModalOpen(false);
      setSelectedProduct(null);
      onRefresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Subscription Add-on Services</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Enhance your subscription with SLA guarantees, priority compute, and storage modules.
          </p>
        </div>

        {subscription && (
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono">
            Linked to {subscription.name}
          </span>
        )}
      </div>

      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Add-on Quotation Generated</p>
            <p className="mt-0.5 text-emerald-700">{successNotice}</p>
          </div>
        </div>
      )}

      {/* Currently Active Addons on Subscription */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <h3 className="font-bold text-slate-900 text-sm">Your Active Add-on Services</h3>

        {activeAddons.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
            <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No add-ons currently attached to your active subscription.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {activeAddons.map((addon) => (
              <div key={addon.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{addon.name}</h4>
                  <span className="text-[11px] text-slate-500">
                    Recurring Rate: ₹ {addon.price.toLocaleString()} / billing cycle
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                  <button
                    onClick={() => onDisableAddon(addon.id, 'Customer self-service disabled')}
                    className="text-xs font-medium text-rose-600 hover:underline"
                  >
                    Disable Service
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Add-on Catalog */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Available Add-on Upgrades</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Requesting an add-on creates a formal change quotation for your review and approval.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableAddons
            .filter((p) => p.isAddon)
            .map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-sm">
                    {item.code || 'ADDON'}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm mt-2">{item.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Enterprise service extension with immediate change order creation.
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    ₹ {item.listPrice.toLocaleString()}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedProduct(item);
                      setConfirmModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Request
                  </button>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModalOpen && selectedProduct && (
        <Modal
          isOpen={true}
          onClose={() => setConfirmModalOpen(false)}
          title="Confirm Add-on Request"
          description={`Add-on: ${selectedProduct.name} (₹ ${selectedProduct.listPrice.toLocaleString()})`}
          maxWidth="md"
          footer={
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRequest}
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating Quotation...' : 'Generate Change Quote'}
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-xs text-slate-600">
            <p>
              In accordance with SUBSCRIBO subscription change policy, requesting this add-on creates a formal priced change quotation in Odoo.
            </p>
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-900">
              <p className="font-semibold">Next Step After Submitting:</p>
              <p className="text-indigo-800 mt-0.5">
                The new quotation will appear in your Quotations list. Once confirmed, the add-on is automatically activated and attached to your subscription.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

