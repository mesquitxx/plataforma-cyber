#!/usr/bin/env bash
# Starts the Phase 1 stack (Guacamole + Kali + DVWA): kept as a shortcut for
# `scripts/lab.sh up dvwa`, which does the real work since Phase 6.
# Usage: scripts/lab-up.sh [--rebuild]
#   --rebuild  rebuild the Kali image first (pulls fresh packages from the internet)
set -euo pipefail
lab="$(dirname "$0")/lab.sh"

for arg in "$@"; do
    case "$arg" in
        --rebuild) "$lab" rebuild dvwa ;;
        *) echo "unknown option: $arg" >&2; exit 2 ;;
    esac
done

exec "$lab" up dvwa
