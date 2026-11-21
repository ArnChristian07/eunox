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
  checkPinPresence,
  clearLockoutState,
  clearPin,
  getLockoutState,
  isLockSupported,
  storePin,
  VerifyPinResult,
  verifyStoredPin,
} from '@/lib/appLock';

/** Coming back after this long in the background asks for the PIN again. */
const RELOCK_AFTER_MS = 30_000;

interface BackgroundStamp {
  wall: number;
  mono: number;
}

/** Monotonic clock immune to device wall-clock changes while backgrounded. */
function monotonicNow(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

/**
 * The monotonic clock pauses while the phone sleeps on Android and iOS, so it alone
 * would let a phone left asleep overnight reopen unlocked. The wall clock keeps running
 * during sleep but can be changed by the user. Relock when either clock says the app
 * was away too long, and also when the wall clock went backwards (fail closed).
 */
function awayTooLong(since: BackgroundStamp): boolean {
  const wallElapsed = Date.now() - since.wall;
  const monoElapsed = monotonicNow() - since.mono;
  return wallElapsed < 0 || wallElapsed > RELOCK_AFTER_MS || monoElapsed > RELOCK_AFTER_MS;
}

interface LockContextValue {
  /** False until the saved PIN has been checked. */
  ready: boolean;
  supported: boolean;
  enabled: boolean;
  locked: boolean;
  /** True while app is inactive/backgrounded with lock enabled, preventing snapshot & resume flicker. */
  privacyShield: boolean;
  biometricsAvailable: boolean;
  failedAttempts: number;
  lockedUntil: number;
  verifyPin: (pin: string) => Promise<VerifyPinResult>;
  unlock: () => void;
  setPin: (pin: string) => Promise<void>;
  disableLock: () => Promise<void>;
}

const LockContext = createContext<LockContextValue | null>(null);

export function LockProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [locked, setLocked] = useState(false);
  const [privacyShield, setPrivacyShield] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);

  const enabledRef = useRef(false);
  const backgroundedAt = useRef<BackgroundStamp | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [isSupported, pinPresence, bio, lockout] = await Promise.all([
        isLockSupported(),
        checkPinPresence(),
        canUseBiometrics(),
        getLockoutState(),
      ]);
      if (cancelled) return;
      // Fail closed if SecureStore threw a transient error while checking the PIN.
      const isEnabled = pinPresence.status === 'present' || pinPresence.status === 'error';
      enabledRef.current = isEnabled;
      setSupported(isSupported);
      setEnabled(isEnabled);
      setLocked(isEnabled);
      setBiometricsAvailable(bio);
      setFailedAttempts(lockout.failedAttempts);
      setLockedUntil(lockout.lockedUntil);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'inactive' || state === 'background') {
        if (enabledRef.current) {
          setPrivacyShield(true);
        }
        if (state === 'background' && backgroundedAt.current === null) {
          backgroundedAt.current = { wall: Date.now(), mono: monotonicNow() };
        }
        return;
      }
      if (state === 'active') {
        const since = backgroundedAt.current;
        backgroundedAt.current = null;
        if (enabledRef.current && since !== null && awayTooLong(since)) {
          setLocked(true);
        }
        setPrivacyShield(false);
        // Fingerprints may have been added or removed while away.
        canUseBiometrics().then(setBiometricsAvailable);
      }
    });
    return () => sub.remove();
  }, []);

  const verifyPin = useCallback(async (pin: string): Promise<VerifyPinResult> => {
    const result = await verifyStoredPin(pin);
    setFailedAttempts(result.failedAttempts);
    setLockedUntil(result.lockedUntil);
    return result;
  }, []);

  const unlock = useCallback(() => {
    setLocked(false);
    setPrivacyShield(false);
    setFailedAttempts(0);
    setLockedUntil(0);
    clearLockoutState();
  }, []);

  const setPin = useCallback(async (pin: string) => {
    await storePin(pin);
    enabledRef.current = true;
    setEnabled(true);
    setFailedAttempts(0);
    setLockedUntil(0);
  }, []);

  const disableLock = useCallback(async () => {
    await clearPin();
    enabledRef.current = false;
    setEnabled(false);
    setLocked(false);
    setPrivacyShield(false);
    setFailedAttempts(0);
    setLockedUntil(0);
  }, []);

  const value = useMemo<LockContextValue>(
    () => ({
      ready,
      supported,
      enabled,
      locked,
      privacyShield,
      biometricsAvailable,
      failedAttempts,
      lockedUntil,
      verifyPin,
      unlock,
      setPin,
      disableLock,
    }),
    [
      ready,
      supported,
      enabled,
      locked,
      privacyShield,
      biometricsAvailable,
      failedAttempts,
      lockedUntil,
      verifyPin,
      unlock,
      setPin,
      disableLock,
    ]
  );

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>;
}

export function useLock() {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock must be used within LockProvider');
  return ctx;
}
