import React from 'react';
import { ShieldCheck } from 'lucide-react';
import type { User as UserType } from '../../types';

interface CustomerProfileProps {
  user: UserType | null;
}

export const CustomerProfile: React.FC<CustomerProfileProps> = ({ user }) => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white font-bold flex items-center justify-center text-xl shadow-xs">
            {user?.name?.charAt(0) || 'C'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user?.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
            <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Verified Self-Service Customer
            </span>
          </div>
        </div>

        <div className="mt-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-500 font-medium mb-1">Company / Organization</label>
            <input
              type="text"
              readOnly
              value={user?.companyName || 'Acme Corporation (Customer)'}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Login Username</label>
            <input
              type="text"
              readOnly
              value={user?.login || 'portal.customer@example.com'}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Assigned Security Group</label>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <span className="font-mono text-slate-700">subscribo.group_subscribo_customer</span>
              <span className="text-emerald-600 font-semibold flex items-center gap-1 text-[11px]">
                <ShieldCheck className="w-4 h-4" /> Active Isolation
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

