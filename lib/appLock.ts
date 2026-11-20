import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const PIN_KEY = 'eunox.pin';
const LOCKOUT_KEY = 'eunox.pin.lockout';
const LOCK_HINT_KEY = 'eunox.lock.enabled.v1';

const HASH_PREFIX = 'v1:';
const HASH_ITERATIONS = 1000;

export const PIN_LENGTH = 4;

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export interface LockoutState {
  failedAttempts: number;
  /** Epoch ms until which PIN entry is blocked (0 when not locked out). */
  lockedUntil: number;
}

export type PinPresenceResult =
  | { status: 'present' }
  | { status: 'empty' }
  | { status: 'error' };

export interface VerifyPinResult {
  ok: boolean;
  failedAttempts: number;
  lockedUntil: number;
  /** True when SecureStore could not be read (fail-closed). */
  storageError?: boolean;
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

/** Cooldown in ms after N failed attempts (1-indexed). */
function cooldownForAttempts(attempts: number): number {
  if (attempts < 5) return 0;
  if (attempts === 5) return 30_000;
  if (attempts === 6) return 60_000;
  if (attempts === 7) return 5 * 60_000;
  return 15 * 60_000;
}

// Compact FIPS 180-4 SHA-256 (UTF-8 ASCII input) so PINs are never stored in plaintext.
const SHA256_K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

function sha256Hex(input: string): string {
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    bytes.push(input.charCodeAt(i) & 0xff);
  }
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) {
    bytes.push(0);
  }
  const highBits = Math.floor(bitLen / 0x100000000);
  const lowBits = bitLen >>> 0;
  bytes.push(
    (highBits >>> 24) & 0xff,
    (highBits >>> 16) & 0xff,
    (highBits >>> 8) & 0xff,
    highBits & 0xff,
    (lowBits >>> 24) & 0xff,
    (lowBits >>> 16) & 0xff,
    (lowBits >>> 8) & 0xff,
    lowBits & 0xff
  );

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Array<number>(64);
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] =
        ((bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((v) => v.toString(16).padStart(8, '0'))
    .join('');
}

function generateSaltHex(byteLength = 16): string {
  const arr = new Uint8Array(byteLength);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < byteLength; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

function hashPin(pin: string, salt: string): string {
  let acc = `${salt}:${pin}`;
  for (let i = 0; i < HASH_ITERATIONS; i++) {
    acc = sha256Hex(`${salt}:${acc}`);
  }
  return acc;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function serializeHashedPin(pin: string): string {
  const salt = generateSaltHex(16);
  return `${HASH_PREFIX}${salt}:${hashPin(pin, salt)}`;
}

async function readStoredPinRaw(): Promise<{ status: 'ok'; value: string | null } | { status: 'error' }> {
  if (!(await isLockSupported())) return { status: 'ok', value: null };
  try {
    const value = await SecureStore.getItemAsync(PIN_KEY, SECURE_STORE_OPTIONS);
    return { status: 'ok', value };
  } catch {
    return { status: 'error' };
  }
}

/** App lock relies on the device keychain/keystore, which web does not have. */
export async function isLockSupported(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Checks whether a PIN is stored, distinguishing transient Keychain/Keystore errors
 * from an actually empty PIN so callers can fail-closed.
 */
export async function checkPinPresence(): Promise<PinPresenceResult> {
  const raw = await readStoredPinRaw();
  if (raw.status === 'error') {
    try {
      const hint = await AsyncStorage.getItem(LOCK_HINT_KEY);
      if (hint === '1') return { status: 'error' };
    } catch {
      // Fail closed if we cannot rule out an enabled lock.
    }
    return { status: 'error' };
  }
  if (raw.value) {
    AsyncStorage.setItem(LOCK_HINT_KEY, '1').catch(() => {});
    return { status: 'present' };
  }
  return { status: 'empty' };
}

export async function storePin(pin: string): Promise<void> {
  const encoded = serializeHashedPin(pin);
  await SecureStore.setItemAsync(PIN_KEY, encoded, SECURE_STORE_OPTIONS);
  await clearLockoutState();
  await AsyncStorage.setItem(LOCK_HINT_KEY, '1').catch(() => {});
}

export async function clearPin(): Promise<void> {
  if (!(await isLockSupported())) return;
  await SecureStore.deleteItemAsync(PIN_KEY, SECURE_STORE_OPTIONS);
  await clearLockoutState();
  await AsyncStorage.removeItem(LOCK_HINT_KEY).catch(() => {});
}

export async function getLockoutState(): Promise<LockoutState> {
  if (!(await isLockSupported())) return { failedAttempts: 0, lockedUntil: 0 };
  try {
    const raw = await SecureStore.getItemAsync(LOCKOUT_KEY, SECURE_STORE_OPTIONS);
    if (!raw) return { failedAttempts: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw) as Partial<LockoutState>;
    const failedAttempts =
      typeof parsed.failedAttempts === 'number' && parsed.failedAttempts > 0
        ? Math.floor(parsed.failedAttempts)
        : 0;
    const lockedUntil =
      typeof parsed.lockedUntil === 'number' && parsed.lockedUntil > 0
        ? parsed.lockedUntil
        : 0;
    return { failedAttempts, lockedUntil };
  } catch {
    return { failedAttempts: 0, lockedUntil: 0 };
  }
}

async function saveLockoutState(state: LockoutState): Promise<void> {
  if (!(await isLockSupported())) return;
  try {
    await SecureStore.setItemAsync(LOCKOUT_KEY, JSON.stringify(state), SECURE_STORE_OPTIONS);
  } catch {
    // Best effort persistence; in-memory state still enforces lockout for this session.
  }
}

export async function clearLockoutState(): Promise<void> {
  if (!(await isLockSupported())) return;
  try {
    await SecureStore.deleteItemAsync(LOCKOUT_KEY, SECURE_STORE_OPTIONS);
  } catch {
    // Ignore cleanup errors.
  }
}

/**
 * Verifies a candidate PIN against SecureStore with persisted brute-force rate-limiting.
 * Transparently migrates legacy plaintext PINs to salted SHA-256 on successful match.
 */
export async function verifyStoredPin(pin: string): Promise<VerifyPinResult> {
  const lockout = await getLockoutState();
  const now = Date.now();
  if (lockout.lockedUntil > now) {
    return {
      ok: false,
      failedAttempts: lockout.failedAttempts,
      lockedUntil: lockout.lockedUntil,
    };
  }

  const raw = await readStoredPinRaw();
  if (raw.status === 'error') {
    return {
      ok: false,
      failedAttempts: lockout.failedAttempts,
      lockedUntil: lockout.lockedUntil,
      storageError: true,
    };
  }
  if (!raw.value) {
    return { ok: false, failedAttempts: 0, lockedUntil: 0 };
  }

  let matched = false;
  let needsMigration = false;

  if (raw.value.startsWith(HASH_PREFIX)) {
    const rest = raw.value.slice(HASH_PREFIX.length);
    const sep = rest.indexOf(':');
    if (sep > 0) {
      const salt = rest.slice(0, sep);
      const expected = rest.slice(sep + 1);
      const actual = hashPin(pin, salt);
      matched = timingSafeEqual(actual, expected);
    }
  } else {
    // Legacy plaintext PIN migration path.
    matched = timingSafeEqual(pin, raw.value);
    needsMigration = matched;
  }

  if (matched) {
    if (needsMigration) {
      await SecureStore.setItemAsync(PIN_KEY, serializeHashedPin(pin), SECURE_STORE_OPTIONS).catch(
        () => {}
      );
    }
    await clearLockoutState();
    return { ok: true, failedAttempts: 0, lockedUntil: 0 };
  }

  const failedAttempts = lockout.failedAttempts + 1;
  const cooldown = cooldownForAttempts(failedAttempts);
  const lockedUntil = cooldown > 0 ? Date.now() + cooldown : 0;
  await saveLockoutState({ failedAttempts, lockedUntil });
  return { ok: false, failedAttempts, lockedUntil };
}

export async function canUseBiometrics(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const [hardware, enrolled] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
    ]);
    return hardware && enrolled;
  } catch {
    return false;
  }
}

export async function authenticateWithBiometrics(): Promise<BiometricAuthResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Eunox',
      cancelLabel: 'Use PIN',
      disableDeviceFallback: true,
      biometricsSecurityLevel: 'strong',
    });
    if (result.success) return { success: true };
    return { success: false, error: result.error };
  } catch {
    return { success: false, error: 'unknown' };
  }
}

export function cancelBiometrics(): void {
  if (Platform.OS === 'android') {
    LocalAuthentication.cancelAuthenticate().catch(() => {});
  }
}
