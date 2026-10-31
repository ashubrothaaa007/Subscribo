import { useState, useEffect, useCallback } from 'react';
import { odooApi } from '../services/odooApi';
import type { Subscription } from '../types';

export const useSubscriptions = (enabled: boolean = true) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await odooApi.getSubscriptions();
      setSubscriptions(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load subscriptions.');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const pauseSubscription = useCallback(async (id: number, reason: string = 'Pause request') => {
    await odooApi.pauseSubscription(id, reason);
    await fetchSubscriptions();
  }, [fetchSubscriptions]);

  const resumeSubscription = useCallback(async (id: number, reason: string = 'Resume request') => {
    await odooApi.resumeSubscription(id, reason);
    await fetchSubscriptions();
  }, [fetchSubscriptions]);

  const closeSubscription = useCallback(async (id: number, reason: string = 'Cancellation') => {
    await odooApi.closeSubscription(id, reason);
    await fetchSubscriptions();
  }, [fetchSubscriptions]);

  const renewSubscription = useCallback(async (id: number, templateCode?: string) => {
    const res = await odooApi.renewSubscription(id, templateCode);
    await fetchSubscriptions();
    return res;
  }, [fetchSubscriptions]);

  return {
    subscriptions,
    loading,
    error,
    refetch: fetchSubscriptions,
    pauseSubscription,
    resumeSubscription,
    closeSubscription,
    renewSubscription,
  };
};
