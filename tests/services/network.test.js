import { describe, expect, test } from 'bun:test';
import { isNetworkError, withRetry } from '../../js/services/network.js';

const noSleep = () => Promise.resolve();

describe('isNetworkError', () => {
  test.each([
    [new TypeError('Failed to fetch'), true],
    [{ message: 'TypeError: Failed to fetch' }, true],
    [{ status: 503, message: 'bad gateway' }, true],
    [{ code: '42501', message: 'new row violates row-level security policy' }, false],
    [{ status: 401, message: 'unauthorized' }, false],
    [null, false],
  ])('%p -> %p', (err, expected) => expect(isNetworkError(err)).toBe(expected));
});

describe('withRetry', () => {
  test('reintenta y termina bien tras un corte momentáneo', async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new TypeError('Failed to fetch');
        return 'ok';
      },
      { retries: 2, sleep: noSleep }
    );
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  test('se rinde con el último error cuando la red no vuelve', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new TypeError('Failed to fetch');
        },
        { retries: 2, sleep: noSleep }
      )
    ).rejects.toThrow('Failed to fetch');
    expect(calls).toBe(3);
  });

  test('no reintenta errores que no son de red', async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw { code: '42501', message: 'rls' };
        },
        { retries: 3, sleep: noSleep }
      )
    ).rejects.toMatchObject({ code: '42501' });
    expect(calls).toBe(1);
  });

  test('espera con backoff exponencial entre intentos', async () => {
    const waits = [];
    await withRetry(
      async (attempt) => {
        if (attempt < 2) throw new TypeError('Failed to fetch');
      },
      { retries: 2, baseDelayMs: 100, sleep: (ms) => (waits.push(ms), Promise.resolve()) }
    );
    expect(waits).toEqual([100, 200]);
  });
});
