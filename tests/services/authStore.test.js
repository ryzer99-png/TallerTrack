import { beforeEach, describe, expect, test } from 'bun:test';
import { installLocalStorage } from '../helpers.js';
import {
  AUTH_TOKEN_STORAGE_KEY,
  clearAuthToken,
  getStoredAuthToken,
  requireAuthToken,
  saveAuthToken,
} from '../../js/services/authStore.js';

beforeEach(() => installLocalStorage());

describe('authStore', () => {
  test('sin llave guardada no hay token', () => {
    expect(getStoredAuthToken()).toBe('');
  });

  test('guarda y recorta el código del taller', () => {
    saveAuthToken('  Teleradio2026.?  ');
    expect(getStoredAuthToken()).toBe('Teleradio2026.?');
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBe('Teleradio2026.?');
  });

  test('clearAuthToken desvincula el dispositivo', () => {
    saveAuthToken('abc');
    clearAuthToken();
    expect(getStoredAuthToken()).toBe('');
  });

  test('requireAuthToken lanza si el dispositivo no está vinculado', () => {
    expect(() => requireAuthToken()).toThrow('Dispositivo no autorizado');
  });

  test('requireAuthToken devuelve el token vinculado', () => {
    saveAuthToken('abc');
    expect(requireAuthToken()).toBe('abc');
  });

  test('si localStorage falla, se comporta como no autorizado', () => {
    globalThis.localStorage = {
      getItem: () => {
        throw new Error('blocked');
      },
    };
    expect(getStoredAuthToken()).toBe('');
  });
});
