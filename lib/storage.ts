import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  onboarding: 'eunox.onboarding.v1',
  budget: 'eunox.budget.v1',
} as const;

export type StorageLoadResult<T> =
  | { status: 'ok'; data: T }
  | { status: 'empty' }
  | { status: 'error'; error: unknown };

/**
 * Per-key promise queue to serialize AsyncStorage writes/removes and prevent
 * out-of-order overwrites when multiple state updates happen in rapid succession.
 */
const keyQueues = new Map<string, Promise<void>>();

export function enqueueStorageOp<T>(
  key: string,
  op: () => Promise<T>
): Promise<T> {
  const previous = keyQueues.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(op);
  const tail = next.then(
    () => undefined,
    () => undefined
  );
  keyQueues.set(key, tail);
  tail.finally(() => {
    if (keyQueues.get(key) === tail) {
      keyQueues.delete(key);
    }
  });
  return next;
}

/**
 * Reads and parses a JSON value, distinguishing missing data from read/parse errors
 * so callers never accidentally overwrite corrupted or temporarily unreadable data.
 */
export async function loadJSONSafe<T>(key: string): Promise<StorageLoadResult<T>> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return { status: 'empty' };
    return { status: 'ok', data: JSON.parse(raw) as T };
  } catch (error) {
    return { status: 'error', error };
  }
}

export async function loadJSON<T>(key: string): Promise<T | null> {
  const result = await loadJSONSafe<T>(key);
  return result.status === 'ok' ? result.data : null;
}

/**
 * Serialized write that propagates storage errors (quota, IO, serialization)
 * so callers can alert the user instead of silently dropping financial data.
 */
export function saveJSONStrict(key: string, value: unknown): Promise<void> {
  const serialized = JSON.stringify(value);
  return enqueueStorageOp(key, async () => {
    await AsyncStorage.setItem(key, serialized);
  });
}

export async function saveJSON(key: string, value: unknown): Promise<void> {
  try {
    await saveJSONStrict(key, value);
  } catch {
    // Non-critical settings; the next change will retry.
  }
}

export async function removeKeys(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  try {
    if (keys.length === 1) {
      await enqueueStorageOp(keys[0], async () => {
        await AsyncStorage.removeItem(keys[0]);
      });
    } else {
      await Promise.all(
        keys.map((k) =>
          enqueueStorageOp(k, async () => {
            await AsyncStorage.removeItem(k);
          })
        )
      );
    }
  } catch {
    // Nothing to clean up.
  }
}
