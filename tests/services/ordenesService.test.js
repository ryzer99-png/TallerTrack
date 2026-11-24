import { beforeEach, describe, expect, test } from 'bun:test';
import { fakeQuery, installLocalStorage } from '../helpers.js';
import { createOrdenesService } from '../../js/services/ordenesService.js';

const noSleep = () => Promise.resolve();
const payload = {
  cliente_nombre: 'Ana',
  cliente_telefono: '3001112233',
  tipo_equipo: 'TV',
  falla_reportada: 'No enciende',
};

function clientWith(handlers) {
  const calls = [];
  return {
    calls,
    from: (table) => {
      calls.push(table);
      return handlers[table]?.() ?? fakeQuery({ data: [], error: null });
    },
    rpc: (name) => (calls.push(`rpc:${name}`), Promise.resolve({ data: null, error: null })),
  };
}

beforeEach(() => installLocalStorage());

describe('createOrder', () => {
  test('rechaza una orden incompleta sin tocar la red', async () => {
    const client = clientWith({});
    const svc = createOrdenesService({ getClient: () => client, getToken: () => 'tok', sleep: noSleep });
    await expect(svc.createOrder({ ...payload, falla_reportada: '' })).rejects.toThrow('Indica la falla reportada');
    expect(client.calls).toEqual([]);
  });

  test('sin código de taller en localStorage no permite crear órdenes', async () => {
    const client = clientWith({});
    const svc = createOrdenesService({ getClient: () => client, getToken: () => '', sleep: noSleep });
    await expect(svc.createOrder(payload)).rejects.toThrow('Dispositivo no autorizado');
    expect(client.calls).toEqual([]);
  });

  test('con código vinculado inserta y devuelve la orden', async () => {
    const created = { id: 'u1', numero_orden: 4200 };
    const client = clientWith({ ordenes: () => fakeQuery({ data: created, error: null }) });
    const svc = createOrdenesService({ getClient: () => client, getToken: () => 'tok', sleep: noSleep });
    await expect(svc.createOrder(payload)).resolves.toEqual(created);
    expect(client.calls).toEqual(['ordenes']);
  });

  test('no reintenta la inserción (evita órdenes duplicadas)', async () => {
    let attempts = 0;
    const client = clientWith({
      ordenes: () => (attempts += 1, fakeQuery({ data: null, error: new TypeError('Failed to fetch') })),
    });
    const svc = createOrdenesService({ getClient: () => client, getToken: () => 'tok', sleep: noSleep });
    await expect(svc.createOrder(payload)).rejects.toThrow('Failed to fetch');
    expect(attempts).toBe(1);
  });

  test('modo demo (sin Supabase) guarda en localStorage con número consecutivo', async () => {
    const svc = createOrdenesService({ getClient: () => null, getToken: () => '', sleep: noSleep });
    const first = await svc.createOrder(payload);
    const second = await svc.createOrder(payload);
    expect(second.numero_orden).toBe(first.numero_orden + 1);
    expect((await svc.listOrders())[0].numero_orden).toBe(second.numero_orden);
  });
});

describe('listOrders', () => {
  test('reintenta ante un corte de red y se recupera', async () => {
    let attempts = 0;
    const client = clientWith({
      ordenes: () => {
        attempts += 1;
        return fakeQuery(
          attempts < 3 ? { data: null, error: new TypeError('Failed to fetch') } : { data: [{ id: 'a' }], error: null }
        );
      },
    });
    const svc = createOrdenesService({ getClient: () => client, getToken: () => 'tok', sleep: noSleep });
    await expect(svc.listOrders()).resolves.toEqual([{ id: 'a' }]);
    expect(attempts).toBe(3);
  });

  test('si la red no vuelve, propaga el error para que la UI avise', async () => {
    const client = clientWith({
      ordenes: () => fakeQuery({ data: null, error: new TypeError('Failed to fetch') }),
    });
    const svc = createOrdenesService({ getClient: () => client, getToken: () => 'tok', sleep: noSleep });
    await expect(svc.listOrders()).rejects.toThrow('Failed to fetch');
  });
});

describe('getOrderByIdOrNumber', () => {
  test('sin token solo consulta por UUID mediante la RPC pública', async () => {
    const client = clientWith({});
    const svc = createOrdenesService({ getClient: () => client, getToken: () => '', sleep: noSleep });
    await expect(svc.getOrderByIdOrNumber('4094')).resolves.toBeNull();
    expect(client.calls).toEqual([]);
    await svc.getOrderByIdOrNumber('11111111-1111-4111-8111-111111114063');
    expect(client.calls).toEqual(['rpc:obtener_orden_publica']);
  });

  test('referencia inválida devuelve null', async () => {
    const client = clientWith({});
    const svc = createOrdenesService({ getClient: () => client, getToken: () => 'tok', sleep: noSleep });
    await expect(svc.getOrderByIdOrNumber('abc')).resolves.toBeNull();
    await expect(svc.getOrderByIdOrNumber('')).resolves.toBeNull();
  });
});

describe('updateOrder', () => {
  test('marcar Entregado fija fecha_entrega y otro estado la limpia', async () => {
    const sent = [];
    const client = {
      from: () => ({
        update: (patch) => (sent.push(patch), fakeQuery({ data: { id: 'x', ...patch }, error: null })),
      }),
    };
    const svc = createOrdenesService({ getClient: () => client, getToken: () => 'tok', sleep: noSleep });
    await svc.updateOrder('x', { estado: 'Entregado' });
    await svc.updateOrder('x', { estado: 'Reparado' });
    expect(typeof sent[0].fecha_entrega).toBe('string');
    expect(sent[1].fecha_entrega).toBeNull();
  });
});
