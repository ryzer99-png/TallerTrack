import { mock } from 'bun:test';

mock.module('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm', () => ({
  createClient: () => ({}),
}));

export function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => void data.set(k, String(v)),
    removeItem: (k) => void data.delete(k),
    clear: () => data.clear(),
  };
}

export function installLocalStorage(initial) {
  globalThis.localStorage = memoryStorage(initial);
  return globalThis.localStorage;
}

export function fakeQuery(result) {
  const chain = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}
