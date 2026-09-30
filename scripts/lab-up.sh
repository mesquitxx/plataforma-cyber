#!/usr/bin/env bash
# Starts the lab stack (Guacamole + Kali + DVWA).
# Usage: scripts/lab-up.sh [--rebuild]
#   --rebuild  rebuild the Kali image (pulls fresh packages from the internet)
set -euo pipefail
source "$(dirname "$0")/lab-common.sh"

rebuild=false
for arg in "$@"; do
    case "$arg" in
        --rebuild) rebuild=true ;;
        *) echo "unknown option: $arg" >&2; exit 2 ;;
    esac
done

random_secret() {
    head -c 64 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c "$1"
}

if [ ! -f "$LAB_ENV" ]; then
    echo "==> Creating labs/.env with random passwords"
    umask 077
    cat > "$LAB_ENV" <<EOF
GUAC_DB_PASSWORD=$(random_secret 32)
GUAC_ADMIN_PASSWORD=$(random_secret 20)
KALI_VNC_PASSWORD=$(random_secret 8)
KALI_VNC_GEOMETRY=1600x900
DVWA_DB_PASSWORD=$(random_secret 32)
DVWA_DB_ROOT_PASSWORD=$(random_secret 32)
EOF
fi

# RAM rule: one lab at a time. Refuse to start next to other running containers.
others="$(docker ps --format '{{.Names}}' --filter "label=com.docker.compose.project" \
    | while read -r name; do
          project="$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$name")"
          [ "$project" != "$LAB_PROJECT" ] && echo "$name"
      done || true)"
if [ -n "$others" ]; then
    echo "Other containers are running (one lab at a time):" >&2
    echo "$others" >&2
    exit 1
fi

if $rebuild; then
    echo "==> Rebuilding the Kali image"
    lab_compose build --pull kali
fi

echo "==> Starting the stack"
lab_compose up -d --wait --wait-timeout 300

# DVWA needs its database tables created once ("Create / Reset Database").
# Only on first boot: running it again would wipe the target's state.
echo "==> Initialising the DVWA database (if needed)"
users_table="$(lab_compose exec -T dvwa-db sh -c \
    'mariadb -udvwa -p"$MARIADB_PASSWORD" -N -e "SHOW TABLES LIKE '\''users'\''" dvwa')"
if [ "$users_table" = "users" ]; then
    echo "DVWA database already initialised"
else
    # Done from inside Kali, the only machine that can reach DVWA.
    lab_compose exec -T kali bash -s <<'EOF'
set -euo pipefail
jar="$(mktemp)"
trap 'rm -f "$jar"' EXIT
token="$(curl -s -c "$jar" -b "$jar" http://dvwa/setup.php \
    | grep -oP "name='user_token' value='\K[0-9a-f]+")"
curl -s -o /dev/null -c "$jar" -b "$jar" \
    --data-urlencode "create_db=Create / Reset Database" \
    --data-urlencode "user_token=$token" \
    http://dvwa/setup.php
EOF
    users_table="$(lab_compose exec -T dvwa-db sh -c \
        'mariadb -udvwa -p"$MARIADB_PASSWORD" -N -e "SHOW TABLES LIKE '\''users'\''" dvwa')"
    if [ "$users_table" != "users" ]; then
        echo "DVWA database setup failed: open http://dvwa/setup.php inside Kali" >&2
        exit 1
    fi
    echo "DVWA database created"
fi

cat <<EOF

Lab is up.
  Guacamole: http://127.0.0.1:8080/guacamole/
  User:      guacadmin
  Password:  GUAC_ADMIN_PASSWORD in labs/.env
  Inside Kali, DVWA is at http://dvwa/  (admin / password)

Validate isolation: scripts/lab-verify-isolation.sh
Stop the lab:       scripts/lab-down.sh
EOF
