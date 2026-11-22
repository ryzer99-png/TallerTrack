/**
 * Cloudflare Pages Middleware:
 *   1. Restringe el tráfico público únicamente a Colombia (CO).
 *   2. Inyecta cabeceras HTTP de seguridad (CSP, HSTS, X-Frame-Options, etc.).
 *   3. Elimina CORS abierto y fuerza no-store en /env.js.
 */
const SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
};

export async function onRequest(context) {
  const country = context.request.cf?.country;

  // En el borde de Cloudflare, bloquear cualquier país distinto de Colombia (CO).
  // Si no existe `cf.country` (entorno local), permitir continuar.
  if (country && country !== 'CO') {
    return new Response(
      'Acceso restringido: Teleradio Taller solo está disponible en Colombia.',
      {
        status: 403,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
          ...SECURITY_HEADERS,
        },
      }
    );
  }

  const response = await context.next();
  const headers = new Headers(response.headers);

  headers.delete('Access-Control-Allow-Origin');
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(key, value);
  }

  if (new URL(context.request.url).pathname === '/env.js') {
    headers.set('Cache-Control', 'no-store, max-age=0');
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
