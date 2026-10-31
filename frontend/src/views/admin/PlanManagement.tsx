import React from 'react';
import { Check, Layers, Clock } from 'lucide-react';
import type { SubscriptionPlan } from '../../types';

interface PlanManagementProps {
  plans: SubscriptionPlan[];
}

export const PlanManagement: React.FC<PlanManagementProps> = ({ plans }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Subscription Plans Catalog</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configured commercial plans governing recurring pricing, terms, and service lines.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
            {plans.length} Configured Plans
          </span>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow p-6 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                  {plan.code}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    plan.active
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {plan.active ? 'Active' : 'Archived'}
                </span>
              </div>

              <h3 className="text-base font-bold text-slate-900 mt-4">{plan.name}</h3>
              <p className="text-xs text-slate-500 mt-1 min-h-[32px]">
                {plan.description || 'Enterprise cloud subscription contract service.'}
              </p>

              {/* Price display */}
              <div className="mt-5 pb-5 border-b border-slate-100 flex items-baseline gap-1">
                <span className="text-3xl font-black text-slate-900">
                  {plan.currency} {plan.price.toLocaleString()}
                </span>
                <span className="text-xs font-medium text-slate-500">
                  / {plan.billingInterval}
                </span>
              </div>

              {/* Specifications */}
              <div className="mt-4 space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Billing cycle: <strong className="text-slate-800 capitalize">{plan.billingInterval}</strong> (Interval {plan.intervalCount})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Service: <strong className="text-slate-800">{plan.productName || 'Cloud Service'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Standard service line quotation mapping</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400">Add-ons supported</span>
              <span className="font-semibold text-slate-700 font-mono">
                {plan.addonProductIds.length} add-on(s)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

