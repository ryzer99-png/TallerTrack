#!/usr/bin/env python3
"""
Servicio local de impresión automática para Teleradio Desk.
Calibrado para Honeywell PC42E-5 (203 dpi) con etiquetas de 70 x 35 mm (560 x 280 dots)
usando lenguaje ZPL II (ZSim auto-detectado por la impresora).

Uso:
  python3 scripts/print-worker.py --dry-run
  python3 scripts/print-worker.py --ip 192.168.1.50
  python3 scripts/print-worker.py --device /dev/usb/lp0
  python3 scripts/print-worker.py --printer Honeywell_PC42E
"""

import argparse
import json
import os
import re
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime


ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENV_JS_PATH = os.path.join(ROOT_DIR, "env.js")
DOT_ENV_PATH = os.path.join(ROOT_DIR, ".env")


def load_config():
    cfg = {}

    if os.path.exists(ENV_JS_PATH):
        with open(ENV_JS_PATH, "r", encoding="utf-8") as f:
            content = f.read()
        for key in ("SUPABASE_URL", "SUPABASE_ANON_KEY", "TELERADIO_WHATSAPP"):
            m = re.search(rf'{key}\s*:\s*["\']([^"\']*)["\']', content)
            if m:
                cfg[key] = m.group(1).strip()

    if os.path.exists(DOT_ENV_PATH):
        with open(DOT_ENV_PATH, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                cfg[k.strip()] = v.strip().strip('"').strip("'")

    for key in (
        "SUPABASE_URL",
        "SUPABASE_ANON_KEY",
        "PUBLIC_BASE_URL",
        "PRINTER_IP",
        "PRINTER_PORT",
        "PRINTER_DEVICE",
        "PRINTER_NAME",
    ):
        if os.environ.get(key):
            cfg[key] = os.environ[key].strip()

    return cfg


def sanitize_zpl(text, max_len=None):
    clean = re.sub(r"[\r\n\t]+", " ", str(text or "")).strip()
    clean = clean.replace("^", " ").replace("~", " ")
    if max_len and len(clean) > max_len:
        clean = clean[: max_len - 1].rstrip() + "…"
    return clean


def format_short_date(iso_str):
    if not iso_str:
        return datetime.now().strftime("%d/%m %H:%M")
    try:
        dt = datetime.fromisoformat(iso_str.replace("Z", "+00:00")).astimezone()
        return dt.strftime("%d/%m/%y %H:%M")
    except Exception:
        return str(iso_str)[:16]


def build_label_zpl(order, public_base_url):
    """
    Etiqueta 70 x 35 mm a 203 dpi (8 dots/mm):
      - Ancho: 560 dots (^PW560)
      - Alto:  280 dots (^LL280)
    """
    num = sanitize_zpl(order.get("numero_orden", "0000"), 10)
    cliente = sanitize_zpl(order.get("cliente_nombre", "Cliente"), 24)
    telefono = sanitize_zpl(order.get("cliente_telefono", ""), 18)
    equipo = sanitize_zpl(order.get("tipo_equipo", "Equipo"), 26)
    falla = sanitize_zpl(order.get("falla_reportada", ""), 56)
    accesorios = sanitize_zpl(order.get("accesorios", "Ninguno"), 28)
    fecha = format_short_date(order.get("fecha_ingreso"))
    is_urgent = order.get("prioridad") == "Urgente / Garantía"

    order_ref = order.get("id") or order.get("numero_orden")
    qr_url = f"{public_base_url.rstrip('/')}/orden?id={urllib.parse.quote(str(order_ref))}"

    urgent_badge = (
        "^FO235,14^GB132,32,32^FS"
        "^FO241,20^FR^A0N,22,22^FDURGENTE^FS"
        if is_urgent
        else ""
    )

    zpl = "\n".join(
        [
            "^XA",
            "^CI28",
            "^PW560",
            "^LL280",
            "^LH0,0",
            # Encabezado: Marca + N° de orden + badge Urgente opcional
            "^FO16,14^A0N,24,24^FDTELERADIO^FS",
            f"^FO16,42^A0N,40,40^FD#{num}^FS",
            urgent_badge,
            f"^FO16,86^A0N,18,18^FD{fecha}^FS",
            "^FO16,108^GB352,2,2^FS",
            # Datos principales en columna izquierda (x=16..370)
            f"^FO16,118^A0N,24,24^FD{cliente}^FS",
            f"^FO16,146^A0N,20,20^FDTel: {telefono}^FS",
            f"^FO16,172^A0N,22,22^FD{equipo}^FS",
            f"^FO16,198^FB354,2,2,L,0^A0N,20,20^FDFalla: {falla}^FS",
            f"^FO16,246^A0N,18,18^FDAcc: {accesorios}^FS",
            # Columna derecha: QR de seguimiento + numero abajo
            "^FO382,18^BQN,2,4",
            f"^FDQA,{qr_url}^FS",
            f"^FO382,236^FB162,1,0,C,0^A0N,22,22^FD#{num}^FS",
            "^XZ",
        ]
    )
    return zpl + "\n"


def supabase_request(url, anon_key, method="GET", body=None):
    headers = {
        "apikey": anon_key,
        "Authorization": f"Bearer {anon_key}",
        "Content-Type": "application/json",
    }
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=10) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else None


def fetch_pending_orders(supabase_url, anon_key, include_test=False):
    endpoint = (
        f"{supabase_url.rstrip('/')}/rest/v1/ordenes"
        "?impresa=eq.false&order=fecha_ingreso.asc&select=*"
    )
    rows = supabase_request(endpoint, anon_key, method="GET") or []
    if include_test:
        return rows
    return [
        r for r in rows if "[Prueba visual]" not in str(r.get("observaciones") or "")
    ]


def mark_order_printed(supabase_url, anon_key, order_id):
    endpoint = (
        f"{supabase_url.rstrip('/')}/rest/v1/ordenes"
        f"?id=eq.{urllib.parse.quote(str(order_id))}"
    )
    supabase_request(endpoint, anon_key, method="PATCH", body={"impresa": True})


def send_zpl_to_printer(zpl, args):
    payload = zpl.encode("utf-8")

    if args.dry_run:
        print("\n--- PREVIEW ZPL (70x35mm) ---")
        print(zpl.strip())
        print("--- FIN ZPL ---\n")
        return

    if args.ip:
        with socket.create_connection((args.ip, args.port), timeout=5) as sock:
            sock.sendall(payload)
        return

    if args.device:
        with open(args.device, "wb") as dev:
            dev.write(payload)
            dev.flush()
        return

    if args.printer:
        subprocess.run(
            ["lp", "-d", args.printer, "-o", "raw"],
            input=payload,
            check=True,
        )
        return

    # Auto-detección USB en Linux si no se especificó destino
    for candidate in ("/dev/usb/lp0", "/dev/usb/lp1"):
        if os.path.exists(candidate):
            with open(candidate, "wb") as dev:
                dev.write(payload)
                dev.flush()
            return

    raise RuntimeError(
        "No se especificó impresora ni se encontró /dev/usb/lp0. "
        "Usa --ip <IP>, --device <ruta>, --printer <nombre_CUPS> o --dry-run."
    )


def main():
    cfg = load_config()
    parser = argparse.ArgumentParser(
        description="Worker de impresión Honeywell PC42E-5 (70x35mm) para Teleradio Desk"
    )
    parser.add_argument("--ip", default=cfg.get("PRINTER_IP"), help="IP de la PC42E-5 en red")
    parser.add_argument(
        "--port", type=int, default=int(cfg.get("PRINTER_PORT") or 9100), help="Puerto TCP (default 9100)"
    )
    parser.add_argument("--device", default=cfg.get("PRINTER_DEVICE"), help="Dispositivo USB (ej: /dev/usb/lp0)")
    parser.add_argument("--printer", default=cfg.get("PRINTER_NAME"), help="Nombre de impresora en CUPS")
    parser.add_argument(
        "--public-url",
        default=cfg.get("PUBLIC_BASE_URL") or "https://charming-halva-fd6269.netlify.app",
        help="URL base pública para el código QR",
    )
    parser.add_argument("--interval", type=float, default=3.0, help="Segundos entre consultas (default 3)")
    parser.add_argument("--include-test", action="store_true", help="Incluir órdenes [Prueba visual]")
    parser.add_argument("--dry-run", action="store_true", help="Solo mostrar ZPL sin imprimir ni marcar impresa=true")
    parser.add_argument("--once", action="store_true", help="Procesar pendientes una sola vez y salir")
    args = parser.parse_args()

    supabase_url = cfg.get("SUPABASE_URL", "")
    anon_key = cfg.get("SUPABASE_ANON_KEY", "")
    if not supabase_url or not anon_key:
        print("Error: faltan SUPABASE_URL o SUPABASE_ANON_KEY en env.js o .env.", file=sys.stderr)
        sys.exit(1)

    target_desc = (
        "DRY-RUN (pantalla)"
        if args.dry_run
        else f"TCP {args.ip}:{args.port}"
        if args.ip
        else f"USB {args.device}"
        if args.device
        else f"CUPS {args.printer}"
        if args.printer
        else "Auto-detección /dev/usb/lp0"
    )
    print(f"[Teleradio Print] Iniciado -> Destino: {target_desc} | Etiqueta: 70x35mm (203dpi)")

    while True:
        try:
            pending = fetch_pending_orders(
                supabase_url, anon_key, include_test=args.include_test
            )
            for order in pending:
                num = order.get("numero_orden")
                zpl = build_label_zpl(order, args.public_url)
                send_zpl_to_printer(zpl, args)
                if not args.dry_run:
                    mark_order_printed(supabase_url, anon_key, order["id"])
                print(
                    f"[Teleradio Print] {'Simulada' if args.dry_run else 'Impresa'} orden #{num} ({order.get('cliente_nombre')})"
                )
        except KeyboardInterrupt:
            print("\n[Teleradio Print] Detenido por usuario.")
            break
        except Exception as exc:
            print(f"[Teleradio Print] Error: {exc}", file=sys.stderr)

        if args.once:
            break
        time.sleep(args.interval)


if __name__ == "__main__":
    main()

