# Teleradio — Gestión de Taller de Electrónica (SPA)

Aplicación web ultra-simple y de alto contraste diseñada para celulares, tablets táctiles y mesón de trabajo en el taller **Teleradio**.

---

## 1. Estructura del Proyecto

```text
TallerTrack/
├── index.html               # Entrada principal de la SPA + Tailwind CSS
├── styles.css               # Estilos táctiles y de alto contraste
├── env.js                   # Variables de entorno en runtime (generado en Netlify)
├── env.example.js           # Plantilla de configuración local
├── .env.example             # Plantilla de variables de entorno
├── netlify.toml             # Configuración de build y redirección SPA (/orden)
├── _redirects               # Regla de respaldo para SPA en Netlify
├── scripts/
│   └── generate-env.sh      # Inyecta SUPABASE_URL y SUPABASE_ANON_KEY en env.js
├── supabase/
│   └── schema.sql           # Script SQL completo (tabla, índices, Realtime, RLS)
└── js/
    ├── app.js               # Enrutador y estado global + Realtime
    ├── config.js            # Lectura de variables de entorno y overrides locales
    ├── supabaseClient.js    # Cliente @supabase/supabase-js v2
    ├── ordersService.js     # CRUD + Realtime + Modo Demo Local automático
    ├── utils.js             # Formatos, estados y utilidades
    ├── whatsapp.js          # Generador de enlaces wa.me por estado y radicado
    └── views/
        ├── newOrder.js      # Vista 1: Nueva Orden (ultra rápida)
        ├── activeOrders.js  # Vista 2: Tablero de Órdenes Activas
        └── publicOrder.js   # Vista 3: Consulta Pública (/orden?id=...)
```

---

## 2. Configurar Base de Datos en Supabase

1. Crea un proyecto nuevo en [Supabase](https://supabase.com/).
2. Ve a **SQL Editor** en el menú izquierdo y haz clic en **New query**.
3. Copia y pega el contenido completo de [`supabase/schema.sql`](./supabase/schema.sql) y ejecútalo (**Run**).
   - Esto crea la tabla `public.ordenes` con `numero_orden` autoincremental iniciando en `4063`.
   - Crea índices optimizados (incluyendo un índice parcial `where impresa = false` para tu servicio de impresión).
   - Activa **Supabase Realtime** en la tabla `ordenes`.
   - Configura las políticas RLS para lectura, creación y actualización.
4. Ve a **Project Settings → API** y copia:
   - **Project URL** (`SUPABASE_URL`)
   - **anon public key** (`SUPABASE_ANON_KEY`)

---

## 3. Cómo funciona el módulo de impresión (`impresa`)

Cada orden nueva se registra con `impresa: false`. El servicio local de impresión del taller puede consultar periódicamente (o escuchar por Realtime) los registros pendientes:

```sql
select *
from public.ordenes
where impresa = false
order by fecha_ingreso asc;
```

Una vez impreso el ticket (con el código QR apuntando a `https://tu-sitio.netlify.app/orden?id=<id>`), el módulo actualiza:

```sql
update public.ordenes
set impresa = true
where id = '<uuid>';
```

El tablero de **Órdenes Activas** mostrará el cambio de `⏳ Pendiente de imprimir` a `🖨️ Impreso` al instante sin recargar la página.

---

## 4. Despliegue Paso a Paso en Netlify

### Opción A: Conectando tu repositorio Git (Recomendado)

1. Sube este proyecto a GitHub, GitLab o Bitbucket.
2. Ingresa a [Netlify](https://app.netlify.com/) y haz clic en **Add new site → Import an existing project**.
3. Selecciona tu repositorio.
4. Netlify detectará automáticamente [`netlify.toml`](./netlify.toml):
   - **Build command:** `bash scripts/generate-env.sh`
   - **Publish directory:** `.`
5. Antes o después del primer deploy, ve a **Site configuration → Environment variables** y agrega:
   - `SUPABASE_URL`: tu URL de Supabase (`https://xxxx.supabase.co`)
   - `SUPABASE_ANON_KEY`: tu clave `anon public` de Supabase
   - `TELERADIO_WHATSAPP` *(opcional)*: número del taller con código de país, sin `+` (ej. `573001234567`)
   - `DEFAULT_COUNTRY_CODE` *(opcional, por defecto `57`)*: código de país para teléfonos de 10 dígitos
6. Haz clic en **Deploys → Trigger deploy → Deploy site**.

> **Nota sobre `/orden?id=...`:** El archivo `netlify.toml` (y `_redirects`) redirige `/orden` a `/index.html` con código `200`, por lo que los enlaces del QR y WhatsApp funcionarán directamente sin errores 404.

---

## 5. Prueba Local

Puedes probar la aplicación inmediatamente en un servidor estático (incluso sin credenciales de Supabase, usando el **Modo Demo Local** automático en `localStorage`):

```bash
python3 -m http.server 8080
```

Luego abre `http://localhost:8080` en tu navegador. Si deseas conectar Supabase localmente, copia `.env.example` a `.env`, completa tus credenciales y ejecuta:

```bash
bash scripts/generate-env.sh
```

