import { getConfig } from './config.js';
import { formatCurrency, formatDateTime, getPublicOrderUrl } from './utils.js';

export function normalizeWhatsAppPhone(rawPhone) {
  const { DEFAULT_COUNTRY_CODE } = getConfig();
  const digits = String(rawPhone || '').replace(/\D/g, '');
  if (!digits) return '';

  // Si ya incluye código de país (11+ dígitos o empieza por el prefijo configurado)
  if (digits.length > 10) {
    return digits;
  }
  // Si son 10 dígitos locales (ej. celular Colombia 3001234567), anteponer código de país
  if (digits.length === 10 && DEFAULT_COUNTRY_CODE) {
    return `${DEFAULT_COUNTRY_CODE}${digits}`;
  }
  return digits;
}

export function buildReceiptWhatsAppUrl(order) {
  const phone = normalizeWhatsAppPhone(order.cliente_telefono);
  const publicUrl = getPublicOrderUrl(order);
  const lines = [
    `*TELERADIO — COMPROBANTE DE INGRESO*`,
    `━━━━━━━━━━━━━━━━━━`,
    `*Orden N°:* #${order.numero_orden}`,
    `*Fecha:* ${formatDateTime(order.fecha_ingreso)}`,
    `*Cliente:* ${order.cliente_nombre}`,
    `*Equipo:* ${order.tipo_equipo}`,
    `*Accesorios:* ${order.accesorios || 'Ninguno'}`,
    `*Falla reportada:* ${order.falla_reportada}`,
    `*Observaciones:* ${order.observaciones || 'Revisar y cotizar antes de reparar'}`,
    `━━━━━━━━━━━━━━━━━━`,
    `Consulta el estado de tu equipo en cualquier momento aquí:`,
    publicUrl,
  ];

  const text = encodeURIComponent(lines.join('\n'));
  return `https://wa.me/${phone}?text=${text}`;
}

export function buildStatusWhatsAppUrl(order) {
  const phone = normalizeWhatsAppPhone(order.cliente_telefono);
  const publicUrl = getPublicOrderUrl(order);
  const costo = Number(order.costo_estimado || 0);
  const costoText = costo > 0 ? `\n*Valor estimado:* ${formatCurrency(costo)}` : '';

  let body = '';
  switch (order.estado) {
    case 'En Revisión':
      body = `Hola ${order.cliente_nombre}, te saludamos de *Teleradio*. Tu *${order.tipo_equipo}* (Orden *#${order.numero_orden}*) ya está *en revisión técnica*. Te avisaremos apenas tengamos el diagnóstico.`;
      break;
    case 'Por Aprobar':
      body = `Hola ${order.cliente_nombre}, te saludamos de *Teleradio*. Ya revisamos tu *${order.tipo_equipo}* (Orden *#${order.numero_orden}*).${costoText}\n¿Nos confirmas si autorizas la reparación?`;
      break;
    case 'Reparado':
      body = `¡Hola ${order.cliente_nombre}! Buenas noticias de *Teleradio*: tu *${order.tipo_equipo}* (Orden *#${order.numero_orden}*) *ya está reparado y listo para recoger*.${costoText}\nTe esperamos en el taller.`;
      break;
    case 'Entregado':
      body = `Hola ${order.cliente_nombre}, gracias por confiar en *Teleradio*. Confirmamos la entrega de tu *${order.tipo_equipo}* (Orden *#${order.numero_orden}*). ¡Quedamos a tu servicio!`;
      break;
    default:
      body = `Hola ${order.cliente_nombre}, te escribimos de *Teleradio* respecto a tu *${order.tipo_equipo}* (Orden *#${order.numero_orden}*).`;
      break;
  }

  const text = encodeURIComponent(`${body}\n\nDetalle de tu orden:\n${publicUrl}`);
  return `https://wa.me/${phone}?text=${text}`;
}

export function buildWorkshopContactWhatsAppUrl(order) {
  const { TELERADIO_WHATSAPP } = getConfig();
  const phone = normalizeWhatsAppPhone(TELERADIO_WHATSAPP);
  const message = encodeURIComponent(
    `Hola Teleradio, consulto por mi orden #${order.numero_orden} (${order.tipo_equipo}).`
  );
  if (phone) {
    return `https://wa.me/${phone}?text=${message}`;
  }
  return `https://wa.me/?text=${message}`;
}

