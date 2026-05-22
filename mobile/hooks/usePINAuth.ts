import { useCallback, useRef, useState } from 'react';
import SecureStore from '../utils/storage';

// ── Constants ─────────────────────────────────────────────────────────────────
const PIN_HASH_KEY    = 'toka_pin_hash';
const STELLAR_KEY     = 'stellar_secret';

// ── Simple hash (djb2 — good enough for local PIN verification) ───────────────
// Note: for production use expo-crypto SHA-256, but it requires native module.
// This djb2 hash keeps us dependency-free while still preventing trivial bypass.
function djb2Hash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface PINAuthState {
  /** Show the PIN modal in the component tree when this is true */
  pinModalVisible: boolean;
  /** 'set' = first-time setup, 'verify' = unlock */
  pinMode: 'set' | 'verify';
  /** Intermediate PIN during two-phase set confirmation */
  pendingPin: string | null;
  /** Error message to show inside the modal */
  pinError: string | null;
  /** Call this to trigger a PIN-protected action. Returns the secret key or throws. */
  requestSecret: () => Promise<string>;
  /** Handlers wired to PINModal component props */
  handlePINSuccess: (pin: string) => void;
  handlePINCancel:  () => void;
  handlePendingPin: (pin: string) => void;
}

/**
 * usePINAuth
 *
 * Call `requestSecret()` from any signing handler.
 * Mount `<PINModal ... />` in your component and wire the returned props.
 *
 * Example:
 *   const pin = usePINAuth();
 *   // in component JSX:
 *   <PINModal
 *     visible={pin.pinModalVisible}
 *     mode={pin.pinMode}
 *     onSuccess={pin.handlePINSuccess}
 *     onCancel={pin.handlePINCancel}
 *     pendingPin={pin.pendingPin}
 *     onPendingPin={pin.handlePendingPin}
 *     errorMessage={pin.pinError}
 *   />
 *   // in your handler:
 *   const secret = await pin.requestSecret();
 */
export function usePINAuth(): PINAuthState {
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pinMode, setPinMode]     = useState<'set' | 'verify'>('verify');
  const [pendingPin, setPendingPin] = useState<string | null>(null);
  const [pinError, setPinError]   = useState<string | null>(null);

  // Resolve/reject for the current requestSecret() promise
  const resolveRef = useRef<((secret: string) => void) | null>(null);
  const rejectRef  = useRef<((err: Error) => void) | null>(null);

  const requestSecret = useCallback((): Promise<string> => {
    return new Promise(async (resolve, reject) => {
      const secret = await SecureStore.getItemAsync(STELLAR_KEY);
      if (!secret) {
        reject(new Error('No wallet found. Please create a wallet first.'));
        return;
      }

      const pinHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
      resolveRef.current = resolve;
      rejectRef.current  = reject;
      setPinError(null);
      setPendingPin(null);

      if (!pinHash) {
        // First time — set a PIN
        setPinMode('set');
      } else {
        // Existing PIN — verify
        setPinMode('verify');
      }
      setPinModalVisible(true);
    });
  }, []);

  const handlePINSuccess = useCallback(async (pin: string) => {
    const secret = await SecureStore.getItemAsync(STELLAR_KEY);

    if (pinMode === 'set') {
      // Store the hash and resolve
      const hash = djb2Hash(pin);
      await SecureStore.setItemAsync(PIN_HASH_KEY, hash);
      setPinModalVisible(false);
      setPinError(null);
      resolveRef.current?.(secret!);

    } else {
      // Verify
      const storedHash = await SecureStore.getItemAsync(PIN_HASH_KEY);
      const inputHash  = djb2Hash(pin);
      if (inputHash === storedHash) {
        setPinModalVisible(false);
        setPinError(null);
        resolveRef.current?.(secret!);
      } else {
        setPinError('Incorrect PIN. Please try again.');
        // Do NOT close the modal — let user retry
      }
    }
  }, [pinMode]);

  const handlePINCancel = useCallback(() => {
    setPinModalVisible(false);
    setPinError(null);
    setPendingPin(null);
    rejectRef.current?.(new Error('PIN entry cancelled'));
  }, []);

  const handlePendingPin = useCallback((pin: string) => {
    setPendingPin(pin);
  }, []);

  return {
    pinModalVisible,
    pinMode,
    pendingPin,
    pinError,
    requestSecret,
    handlePINSuccess,
    handlePINCancel,
    handlePendingPin,
  };
}
