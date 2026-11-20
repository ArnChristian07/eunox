import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import {
  canUseBiometrics,
  clearPin,
  getStoredPin,
  isLockSupported,
  storePin,
} from '@/lib/appLock';

/** Coming back after this long in the background asks for the PIN again. */
const RELOCK_AFTER_MS = 30_000;

interface LockContextValue {
  /** False until the saved PIN has been checked. */
  ready: boolean;
  supported: boolean;
  enabled: boolean;
  locked: boolean;
  biometricsAvailable: boolean;
  verifyPin: (pin: string) => boolean;
  unlock: () => void;
  setPin: (pin: string) => Promise<void>;
  disableLock: () => Promise<void>;
}

const LockContext = createContext<LockContextValue | null>(null);

export function LockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(false);
  const [locked, setLocked] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const pinRef = useRef<string | null>(null);
  const [enabled, setEnabled] = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [isSupported, pin, bio] = await Promise.all([
        isLockSupported(),
        getStoredPin(),
        canUseBiometrics(),
      ]);
      if (cancelled) return;
      pinRef.current = pin;
      setSupported(isSupported);
      setEnabled(!!pin);
      setLocked(!!pin);
      setBiometricsAvailable(bio);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        backgroundedAt.current = Date.now();
        return;
      }
      if (state === 'active') {
        const since = backgroundedAt.current;
        backgroundedAt.current = null;
        if (pinRef.current && since !== null && Date.now() - since > RELOCK_AFTER_MS) {
          setLocked(true);
        }
        // Fingerprints may have been added or removed while away.
        canUseBiometrics().then(setBiometricsAvailable);
      }
    });
    return () => sub.remove();
  }, []);

  const verifyPin = useCallback(
    (pin: string) => pinRef.current !== null && pin === pinRef.current,
    []
  );

  const unlock = useCallback(() => setLocked(false), []);

  const setPin = useCallback(async (pin: string) => {
    await storePin(pin);
    pinRef.current = pin;
    setEnabled(true);
  }, []);

  const disableLock = useCallback(async () => {
    await clearPin();
    pinRef.current = null;
    setEnabled(false);
    setLocked(false);
  }, []);

  const value = useMemo<LockContextValue>(
    () => ({
      ready,
      supported,
      enabled,
      locked,
      biometricsAvailable,
      verifyPin,
      unlock,
      setPin,
      disableLock,
    }),
    [ready, supported, enabled, locked, biometricsAvailable, verifyPin, unlock, setPin, disableLock]
  );

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>;
}

export function useLock() {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock must be used within LockProvider');
  return ctx;
}
