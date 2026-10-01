#!/usr/bin/env bash
# Starts Xvnc on display :1 (port 5901) and an XFCE session on top of it.
# The container stops when either the X server or the session exits.
set -euo pipefail

: "${VNC_PASSWORD:?VNC_PASSWORD is required}"
geometry="${VNC_GEOMETRY:-1600x900}"

mkdir -p "$HOME/.vnc"
printf '%s\n' "$VNC_PASSWORD" | vncpasswd -f > "$HOME/.vnc/passwd"
chmod 600 "$HOME/.vnc/passwd"

# Stale lock files survive container restarts because /tmp is in the layer.
rm -f /tmp/.X1-lock /tmp/.X11-unix/X1

Xvnc :1 \
    -geometry "$geometry" -depth 24 \
    -rfbport 5901 -localhost no \
    -SecurityTypes VncAuth -rfbauth "$HOME/.vnc/passwd" \
    -AlwaysShared &

for _ in $(seq 1 50); do
    [ -S /tmp/.X11-unix/X1 ] && break
    sleep 0.1
done

export DISPLAY=:1
dbus-launch --exit-with-session startxfce4 &

wait -n
