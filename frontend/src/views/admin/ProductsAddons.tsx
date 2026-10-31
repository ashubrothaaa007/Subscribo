import React from 'react';
import { Package } from 'lucide-react';
import type { ProductCatalogItem } from '../../types';

interface ProductsAddonsProps {
  products: ProductCatalogItem[];
}

export const ProductsAddons: React.FC<ProductsAddonsProps> = ({ products }) => {
  const serviceProducts = products.filter((p) => p.isService && !p.isAddon);
  const addonProducts = products.filter((p) => p.isAddon);

  return (
    <div className="space-y-6">
      {/* Add-ons Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900">Subscription Add-on Catalog</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Available optional products switchable via customer change quotations.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            {addonProducts.length} Add-on Services
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {addonProducts.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 col-span-full">No add-ons currently found.</p>
          ) : (
            addonProducts.map((addon) => (
              <div
                key={addon.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-sm">
                      {addon.code || 'ADDON'}
                    </span>
                    <span className="text-[10px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Priced Service
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mt-2">{addon.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Customer requestable add-on mapped to Odoo quotation line.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Recurring Price</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    ₹ {addon.listPrice.toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Core Services Section */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900">Base Subscription Service Products</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Service products representing plan lines with quantity and unit price.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            {serviceProducts.length} Base Products
          </span>
        </div>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
          {serviceProducts.map((prod) => (
            <div key={prod.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{prod.name}</h4>
                  <span className="text-[10px] font-mono text-slate-400">Code: {prod.code || 'CORE-SRV'}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold font-mono text-slate-900 block">
                  ₹ {prod.listPrice.toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400">List Price</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

