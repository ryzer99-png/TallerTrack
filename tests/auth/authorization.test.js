import { beforeEach, describe, expect, test } from 'bun:test';
import { installLocalStorage } from '../helpers.js';
import { extractAuthParam, resolveAuthorization, validarCodigoTaller } from '../../js/auth/authorization.js';

const noNetwork = () => ({ rpc: () => Promise.reject(new TypeError('Failed to fetch')) });
const rpcReturning = (data, error = null) => () => ({ rpc: () => Promise.resolve({ data, error }) });

beforeEach(() => installLocalStorage());

describe('validarCodigoTaller', () => {
  test('código vacío no llega a la red', async () => {
    const result = await validarCodigoTaller('  ', { getClient: noNetwork, isConfigured: () => true });
    expect(result).toMatchObject({ ok: false, reason: 'empty' });
  });

  test('modo demo (sin Supabase) deja pasar', async () => {
    const result = await validarCodigoTaller('x', { getClient: () => null, isConfigured: () => false });
    expect(result.ok).toBe(true);
  });

  test('código correcto', async () => {
    const result = await validarCodigoTaller('ok', { getClient: rpcReturning(true), isConfigured: () => true });
    expect(result).toEqual({ ok: true });
  });

  test('código incorrecto', async () => {
    const result = await validarCodigoTaller('mal', { getClient: rpcReturning(false), isConfigured: () => true });
    expect(result).toMatchObject({ ok: false, reason: 'invalid' });
  });

  test('límite de intentos', async () => {
    const error = { code: 'P0001', message: 'Demasiados intentos fallidos.' };
    const result = await validarCodigoTaller('x', { getClient: rpcReturning(null, error), isConfigured: () => true });
    expect(result).toMatchObject({ ok: false, reason: 'rate_limited' });
  });

  test('migración SQL pendiente', async () => {
    const error = { code: 'PGRST202', message: 'function not found' };
    const result = await validarCodigoTaller('x', { getClient: rpcReturning(null, error), isConfigured: () => true });
    expect(result).toMatchObject({ ok: false, reason: 'missing_rpc' });
  });

  test('corte de red se reporta como network', async () => {
    const result = await validarCodigoTaller('x', { getClient: noNetwork, isConfigured: () => true });
    expect(result).toMatchObject({ ok: false, reason: 'network' });
  });
});

describe('extractAuthParam', () => {
  test('toma ?auth= y devuelve la URL limpia conservando el resto', () => {
    const out = extractAuthParam('https://x.dev/?id=7&auth=Teleradio2026.%3F#/activas');
    expect(out.code).toBe('Teleradio2026.?');
    expect(out.cleanPath).toBe('/?id=7#/activas');
  });

  test('toma auth dentro del hash', () => {
    const out = extractAuthParam('https://x.dev/#/activas?auth=abc');
    expect(out.code).toBe('abc');
    expect(out.cleanPath).toBe('/#/activas');
  });

  test('sin auth no hay código', () => {
    expect(extractAuthParam('https://x.dev/#/nueva').code).toBe('');
  });
});

describe('resolveAuthorization', () => {
  const ok = async () => ({ ok: true });
  const invalid = async () => ({ ok: false, reason: 'invalid', message: 'no' });

  test('sin código ni llave guardada queda bloqueado', async () => {
    expect(await resolveAuthorization({ urlCode: '', storedCode: '', validate: ok })).toEqual({ status: 'locked' });
  });

  test('enlace válido vincula y persiste el código', async () => {
    const out = await resolveAuthorization({ urlCode: 'abc', storedCode: '', validate: ok });
    expect(out).toEqual({ status: 'authorized', token: 'abc', linkedByUrl: true });
  });

  test('enlace inválido bloquea con mensaje', async () => {
    const out = await resolveAuthorization({ urlCode: 'abc', storedCode: '', validate: invalid });
    expect(out.status).toBe('locked');
    expect(out.message).toContain('enlace');
  });

  test('llave guardada válida entra directo', async () => {
    const out = await resolveAuthorization({ urlCode: '', storedCode: 'abc', validate: ok });
    expect(out).toEqual({ status: 'authorized', token: 'abc', linkedByUrl: false });
  });

  test('corte de red no desvincula un dispositivo ya autorizado', async () => {
    const network = async () => ({ ok: false, reason: 'network', message: 'sin red' });
    const out = await resolveAuthorization({ urlCode: '', storedCode: 'abc', validate: network });
    expect(out).toEqual({ status: 'authorized', token: 'abc', offlineBypass: true });
  });

  test('llave guardada que ya no es válida se borra', async () => {
    const out = await resolveAuthorization({ urlCode: '', storedCode: 'abc', validate: invalid });
    expect(out).toMatchObject({ status: 'locked', clearStored: true });
  });

  test('límite de intentos conserva la llave guardada', async () => {
    const limited = async () => ({ ok: false, reason: 'rate_limited', message: 'espera' });
    const out = await resolveAuthorization({ urlCode: '', storedCode: 'abc', validate: limited });
    expect(out).toMatchObject({ status: 'locked', message: 'espera' });
    expect(out.clearStored).toBeFalsy();
  });
});
