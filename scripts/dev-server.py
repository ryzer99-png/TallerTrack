#!/usr/bin/env python3
"""Servidor local para Teleradio con soporte SPA para /orden?id=..."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080


class SpaHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/orden" or parsed.path.startswith("/orden/"):
            self.path = "/index.html"
        elif not os.path.exists(self.translate_path(parsed.path)) and "." not in os.path.basename(parsed.path):
            self.path = "/index.html"
        return super().do_GET()


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), SpaHandler)
    print(f"Servidor Teleradio escuchando en http://0.0.0.0:{PORT}", flush=True)
    server.serve_forever()

