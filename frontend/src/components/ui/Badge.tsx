import React from 'react';
import type { SubscriptionState } from '../../types';

interface BadgeProps {
  status: SubscriptionState | 'paused' | 'sent' | 'sale' | 'cancel' | string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ status, className = '' }) => {
  const norm = status.toLowerCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';
  let label = status;

  if (norm === 'active' || norm === 'paid') {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dotColor = 'bg-emerald-500';
    label = norm === 'paid' ? 'Paid' : 'Active';
  } else if (norm === 'paused' || norm === 'due') {
    styles = 'bg-amber-50 text-amber-700 border-amber-200';
    dotColor = 'bg-amber-500';
    label = norm === 'due' ? 'Due for Invoicing' : 'Paused';
  } else if (norm === 'quotation' || norm === 'sent' || norm === 'posted' || norm === 'upcoming') {
    styles = 'bg-sky-50 text-sky-700 border-sky-200';
    dotColor = 'bg-sky-500';
    label = norm === 'posted' ? 'Posted' : norm === 'upcoming' ? 'Scheduled' : 'Quotation';
  } else if (norm === 'draft') {
    styles = 'bg-slate-100 text-slate-700 border-slate-300';
    dotColor = 'bg-slate-500';
    label = 'Draft';
  } else if (norm === 'confirmed' || norm === 'sale') {
    styles = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    dotColor = 'bg-indigo-500';
    label = 'Confirmed';
  } else if (norm === 'closed' || norm === 'cancel') {
    styles = 'bg-rose-50 text-rose-700 border-rose-200';
    dotColor = 'bg-rose-500';
    label = 'Closed';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span className="capitalize">{label}</span>
    </span>
  );
};

