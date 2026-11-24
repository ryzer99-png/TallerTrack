# Teleradio Desk — Domain Glossary (`CONTEXT.md`)

## Bounded Context: Taller (Workshop Operations)
- **orden**: Service intake ticket (`public.ordenes`) identified by UUID `id` and sequential `numero_orden` (starting `#4063`).
- **estado**: Lifecycle stage: `Recibido`, `En Revisión`, `Por Aprobar`, `Reparado`, `Sin Reparación`, `Sin Falla`, `Entregado`.
- **prioridad**: `Normal` or `Urgente / Garantía`.
- **técnico**: Workshop technician (`public.tecnicos`) with display `nombre` and badge `color`.
- **código de taller**: Shared workshop authorization key validated via `validar_codigo_taller` RPC, persisted in `localStorage` (`teleradio_auth_token`), and sent as `x-teleradio-key`.

## Bounded Context: Consulta Pública (Customer QR)
- **ficha pública**: Read-only status view (`#/orden?id=<uuid>`) backed by `obtener_orden_publica` RPC (omits phone number and internal IDs).
