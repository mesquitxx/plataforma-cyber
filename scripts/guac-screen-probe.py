#!/usr/bin/env python3
"""Positive control for the Kali desktop (Phase 8): proves that the screen
really streams through the published Guacamole port, not just that the login
page loads.

Logs in as the restricted user "plataforma" (exactly what the platform's
iframe does), opens Guacamole's WebSocket tunnel to "Kali (attack box)" and
waits for a `size` instruction plus image data from the desktop. Exit 0 only
if both arrive. Standard library only; run by scripts/lab-verify-isolation.sh.

Usage: guac-screen-probe.py <base-url> <password-of-plataforma>
"""
import base64
import json
import os
import socket
import sys
import time
import urllib.parse
import urllib.request

BASE = sys.argv[1].rstrip("/")  # e.g. http://127.0.0.1:8080/guacamole
PASSWORD = sys.argv[2]
DEADLINE = time.monotonic() + 15


def api(path, data=None):
    body = urllib.parse.urlencode(data).encode() if data else None
    with urllib.request.urlopen(f"{BASE}/api/{path}", body, timeout=5) as response:
        return json.load(response)


def read_exact(sock, n):
    buf = b""
    while len(buf) < n:
        chunk = sock.recv(n - len(buf))
        if not chunk:
            raise ConnectionError("tunnel closed")
        buf += chunk
    return buf


def read_frame(sock):
    """One server frame (servers never mask). Returns (opcode, payload)."""
    b0, b1 = read_exact(sock, 2)
    length = b1 & 0x7F
    if length == 126:
        length = int.from_bytes(read_exact(sock, 2), "big")
    elif length == 127:
        length = int.from_bytes(read_exact(sock, 8), "big")
    return b0 & 0x0F, read_exact(sock, length)


def main():
    session = api("tokens", {"username": "plataforma", "password": PASSWORD})
    token, source = session["authToken"], session["dataSource"]
    try:
        connections = api(f"session/data/{source}/connections?token={token}")
        kali = next(c for c in connections.values() if c["name"] == "Kali (attack box)")
        query = urllib.parse.urlencode({
            "token": token, "GUAC_DATA_SOURCE": source, "GUAC_ID": kali["identifier"],
            "GUAC_TYPE": "c", "GUAC_WIDTH": "1024", "GUAC_HEIGHT": "768", "GUAC_DPI": "96",
            "GUAC_IMAGE": "image/png",
        })
        url = urllib.parse.urlsplit(BASE)
        sock = socket.create_connection((url.hostname, url.port or 80), timeout=5)
        key = base64.b64encode(os.urandom(16)).decode()
        sock.sendall((
            f"GET {url.path}/websocket-tunnel?{query} HTTP/1.1\r\n"
            f"Host: {url.netloc}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n"
            "Sec-WebSocket-Protocol: guacamole\r\n\r\n"
        ).encode())
        head = b""
        while b"\r\n\r\n" not in head:
            head += read_exact(sock, 1)
        status = head.split(b"\r\n", 1)[0].decode()
        if " 101 " not in status:
            print(f"WebSocket upgrade refused: {status}")
            return 1

        text, seen_size, seen_image = "", False, False
        while time.monotonic() < DEADLINE and not (seen_size and seen_image):
            opcode, payload = read_frame(sock)
            if opcode == 8:
                print("tunnel closed by the server")
                break
            text += payload.decode("utf-8", "replace")
            seen_size = seen_size or "4.size," in text
            seen_image = seen_image or "3.img," in text or "3.png," in text
            if "5.error," in text:
                print("Guacamole error:", text[text.index("5.error,"):][:120])
                break
            text = text[-4096:]
        sock.close()
        print(f"websocket: {status}; size: {seen_size}; image data: {seen_image}")
        return 0 if seen_size and seen_image else 1
    finally:
        req = urllib.request.Request(f"{BASE}/api/session?token={token}", method="DELETE")
        try:
            urllib.request.urlopen(req, timeout=5).close()
        except OSError:
            pass


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as error:  # any failure means "the screen does not work"
        print(f"probe failed: {error}")
        sys.exit(1)
