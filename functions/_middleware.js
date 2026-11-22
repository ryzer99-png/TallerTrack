/**
 * Cloudflare Pages Middleware: restringe el acceso público únicamente a Colombia (CO).
 */
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
        },
      }
    );
  }

  return context.next();
}
