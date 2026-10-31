import { useState, useEffect, useCallback } from 'react';
import { odooApi } from '../services/odooApi';
import type { Invoice, UpcomingBillingItem, BillingStats } from '../types';

export const useInvoices = (enabled: boolean = true) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingBillingItem[]>([]);
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const [invList, upList, bStats] = await Promise.all([
        odooApi.getInvoices(),
        odooApi.getUpcomingBilling(),
        odooApi.getBillingStats(),
      ]);
      setInvoices(invList);
      setUpcoming(upList);
      setStats(bStats);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve invoice information.');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const generateInvoice = useCallback(async (subscriptionId: number) => {
    const result = await odooApi.generateSubscriptionInvoice(subscriptionId);
    await fetchAll();
    return result;
  }, [fetchAll]);

  const postInvoice = useCallback(async (id: number) => {
    await odooApi.postInvoice(id);
    await fetchAll();
  }, [fetchAll]);

  return {
    invoices,
    upcoming,
    stats,
    loading,
    error,
    refetch: fetchAll,
    generateInvoice,
    postInvoice,
  };
};

