import React from 'react';
import type { StaffMember } from '../../types';

interface StaffManagementProps {
  staffList: StaffMember[];
}

export const StaffManagement: React.FC<StaffManagementProps> = ({ staffList }) => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Staff & Security Administration</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Internal operators with scoped access to SUBSCRIBO records (`group_subscribo_staff`).
          </p>
        </div>
        <span className="text-xs font-semibold px-3 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
          RBAC Protected
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-100">
            <tr>
              <th className="px-5 py-3">Member</th>
              <th className="px-5 py-3">Username / Login</th>
              <th className="px-5 py-3">Assigned Role</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Access Boundary</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {staffList.map((member) => (
              <tr key={member.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="px-5 py-3.5 font-semibold text-slate-900 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <span>{member.name}</span>
                    <span className="text-[10px] text-slate-400 block">{member.email}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 font-mono text-slate-600">{member.login}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      member.login === 'admin'
                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {member.role}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right font-mono text-[11px] text-slate-500">
                  {member.login === 'admin' ? 'Unrestricted (Admin)' : 'subscribo_is_subscription = True'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

