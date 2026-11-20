import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

// During server rendering and hydration React uses the server snapshot, then
// switches to the client snapshot, so this tells us if we're on the server.
export function useClientOnlyValue<S, C>(server: S, client: C): S | C {
  return useSyncExternalStore<S | C>(
    subscribe,
    () => client,
    () => server
  );
}
