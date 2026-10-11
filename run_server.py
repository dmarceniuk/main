#!/usr/bin/env python3
"""
Lampa Online Hub — Локальний веб-сервер із підтримкою CORS та Media Station X (MSX).
Безпечний онлайн-перегляд фільмів та серіалів (100% без торентів).
"""

import http.server
import socket
import socketserver
import os
import sys

PORT = 8080
if len(sys.argv) > 1:
    try:
        PORT = int(sys.argv[1])
    except ValueError:
        pass


def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = '127.0.0.1'
    finally:
        s.close()
    return ip


class LampaHubRequestHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'application/javascript; charset=utf-8',
        '.mjs': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.webmanifest': 'application/manifest+json; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.svg': 'image/svg+xml',
        '.m3u': 'audio/x-mpegurl',
        '.m3u8': 'application/vnd.apple.mpegurl',
    }

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Range')
        self.send_header('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200, "ok")
        self.end_headers()

    def do_GET(self):
        # Диспетчеризація MSX start.json з автоматичною підстановкою хоста
        if self.path.startswith('/msx/start.json') or self.path == '/start.json':
            host = self.headers.get('Host') or f"{get_ip()}:{PORT}"
            proto = "https://" if self.headers.get('X-Forwarded-Proto') == 'https' else "http://"
            content = f'''{{
  "name": "Lampa Online Hub",
  "version": "2.0.0",
  "parameter": "content:{proto}{host}/msx/start.json",
  "action": "link:{proto}{host}"
}}'''
            data = content.encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return

        super().do_GET()


def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(root_dir)

    local_ip = get_ip()
    print("=" * 70)
    print("🎬  LAMPA ONLINE HUB — Безпечний Онлайн-Кінотеатр")
    print("    100% Прямий стрімінг (HTTP/HLS) | Жодного BitTorrent / P2P")
    print("=" * 70)
    print(f"🔹 Локальний доступ (ПК/Браузер):  http://localhost:{PORT}")
    print(f"🔹 Доступ у домашній мережі:       http://{local_ip}:{PORT}")
    print("-" * 70)
    print(f"📺 Media Station X (MSX) для Samsung / LG Smart TV:")
    print(f"   Введіть у Start Parameter:       {local_ip}:{PORT}/msx/start.json")
    print("=" * 70)
    print("Натисніть Ctrl+C для зупинки сервера.")
    print("=" * 70)

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), LampaHubRequestHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nСервер зупинено.")


if __name__ == '__main__':
    main()
