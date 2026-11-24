import { describe, expect, test } from 'bun:test';
import {
  buildAccessoriesPayload,
  isValidOrderNumber,
  normalizeOrderPayload,
  validateOrderPayload,
} from '../../js/domain/orden.js';

const valid = {
  cliente_nombre: 'David Figueroa',
  cliente_telefono: '3132798621',
  tipo_equipo: 'TV',
  falla_reportada: 'No enciende',
};

describe('validateOrderPayload', () => {
  test('acepta una orden con los 4 campos obligatorios', () => {
    expect(validateOrderPayload(valid)).toEqual({ ok: true, errors: {}, firstField: null });
  });

  test.each([
    ['tipo_equipo', 'Indica el tipo de equipo'],
    ['cliente_nombre', 'Falta el nombre del cliente'],
    ['cliente_telefono', 'Falta el teléfono / WhatsApp del cliente'],
    ['falla_reportada', 'Indica la falla reportada'],
  ])('rechaza cuando falta %s', (field, message) => {
    const result = validateOrderPayload({ ...valid, [field]: '' });
    expect(result.ok).toBe(false);
    expect(result.errors[field]).toBe(message);
    expect(result.firstField).toBe(field);
  });

  test('trata espacios en blanco como vacío', () => {
    expect(validateOrderPayload({ ...valid, cliente_nombre: '   ' }).ok).toBe(false);
  });

  test('reporta el primer campo faltante en el orden del formulario', () => {
    const result = validateOrderPayload({});
    expect(result.firstField).toBe('tipo_equipo');
    expect(Object.keys(result.errors)).toHaveLength(4);
  });

  test('no revienta con payload nulo', () => {
    expect(validateOrderPayload(undefined).ok).toBe(false);
  });
});

describe('isValidOrderNumber', () => {
  test.each([[4094, true], ['4094', true], ['0', false], ['-3', false], ['4.5', false], ['abc', false], ['', false]])(
    '%p -> %p',
    (value, expected) => expect(isValidOrderNumber(value)).toBe(expected)
  );
});

describe('normalizeOrderPayload', () => {
  test('recorta textos y aplica valores por defecto', () => {
    const out = normalizeOrderPayload({ ...valid, cliente_nombre: '  Ana  ' });
    expect(out.cliente_nombre).toBe('Ana');
    expect(out.accesorios).toBe('Ninguno');
    expect(out.observaciones).toBe('Revisar y cotizar antes de reparar');
    expect(out.estado).toBe('Recibido');
    expect(out.prioridad).toBe('Normal');
    expect(out.impresa).toBe(false);
    expect(out.tecnico_id).toBeNull();
    expect(out.costo_estimado).toBe(0);
  });
});

describe('buildAccessoriesPayload', () => {
  test('sin accesorios ni detalle -> Ninguno', () => {
    expect(buildAccessoriesPayload(new Set(['Sin accesorios']), '')).toBe('Ninguno');
  });
  test('combina chips y detalle', () => {
    expect(buildAccessoriesPayload(new Set(['Batería', 'Cable de poder']), 'estuche')).toBe(
      'Batería, Cable de poder. Detalle: estuche'
    );
  });
  test('solo detalle', () => {
    expect(buildAccessoriesPayload(new Set(), ' funda ')).toBe('Detalle: funda');
  });
});
