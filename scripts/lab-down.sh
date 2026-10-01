#!/usr/bin/env bash
# Stops the desktop lab (Guacamole + Kali + target) and removes its containers
# and networks: kept as a shortcut for `scripts/lab.sh down dvwa` (Phase 6).
# Any desktop lab goes down, since they all share the "cyberlab" project.
# Usage: scripts/lab-down.sh [--purge]
#   --purge  also delete the volumes (Guacamole DB, DVWA DB, Kali home).
#            Required after changing passwords in labs/.env.
set -euo pipefail
lab="$(dirname "$0")/lab.sh"

command=down
for arg in "$@"; do
    case "$arg" in
        --purge) command=purge ;;
        *) echo "unknown option: $arg" >&2; exit 2 ;;
    esac
done

exec "$lab" "$command" dvwa
