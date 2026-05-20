import { useState, useEffect, useCallback } from 'react';
import { getPublicKey, getTokaBalance } from '../services/stellar';
import { AppState, AppStateStatus } from 'react-native';

export function useStellarBalance() {
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    try {
      const pubKey = await getPublicKey();
      if (pubKey) {
        const bal = await getTokaBalance(pubKey);
        setBalance(bal);
      }
    } catch (error) {
      console.error('Error fetching Stellar balance:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();

    // Refetch when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        fetchBalance();
      }
    });

    // Poll every 10 seconds for real-time feel
    const interval = setInterval(fetchBalance, 10000);

    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [fetchBalance]);

  return { balance, loading, refetch: fetchBalance };
}
