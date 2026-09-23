import { useSyncExternalStore } from 'react';

type StateCreator<T> = (
  set: (partial: Partial<T> | ((state: T) => Partial<T>)) => void,
  get: () => T
) => T;

export interface StoreApi<T> {
  <U = T>(selector?: (state: T) => U): U;
  getState: () => T;
  setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
  subscribe: (listener: () => void) => () => void;
}

/**
 * Lightweight external store based on React 18's useSyncExternalStore.
 * Provides identical API and selector-based re-rendering behavior as Zustand.
 */
export function createStore<T>(initializer: StateCreator<T>): StoreApi<T> {
  let state: T;
  const listeners = new Set<() => void>();

  const getState = () => state;

  const setState = (partial: Partial<T> | ((state: T) => Partial<T>)) => {
    const nextState = typeof partial === 'function' ? (partial as any)(state) : partial;
    if (nextState !== undefined && nextState !== null) {
      const merged = { ...state, ...nextState };
      state = merged;
      listeners.forEach(listener => listener());
    }
  };

  state = initializer(setState, getState);

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const useStore = <U = T>(selector?: (state: T) => U): U => {
    return useSyncExternalStore(
      subscribe,
      () => (selector ? selector(state) : (state as any)),
      () => (selector ? selector(state) : (state as any))
    );
  };

  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;

  return useStore as StoreApi<T>;
}
