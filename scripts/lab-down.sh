#!/usr/bin/env bash
# Stops the lab stack and removes its containers and networks.
# Usage: scripts/lab-down.sh [--purge]
#   --purge  also delete the volumes (Guacamole DB, DVWA DB, Kali home).
#            Required after changing passwords in labs/.env.
set -euo pipefail
source "$(dirname "$0")/lab-common.sh"

args=(down --remove-orphans)
for arg in "$@"; do
    case "$arg" in
        --purge) args+=(--volumes) ;;
        *) echo "unknown option: $arg" >&2; exit 2 ;;
    esac
done

lab_compose "${args[@]}"

left="$(docker ps -a --filter "label=com.docker.compose.project=$LAB_PROJECT" -q)"
nets="$(docker network ls --filter "label=com.docker.compose.project=$LAB_PROJECT" -q)"
if [ -n "$left$nets" ]; then
    echo "Warning: lab containers or networks are still present" >&2
    exit 1
fi
echo "Lab is down: no containers, no networks left."
