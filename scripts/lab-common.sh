# Shared helpers for the lab scripts. Source it; do not run it.

LAB_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LAB_DIR="$LAB_ROOT/labs"
LAB_ENV="$LAB_DIR/.env"
LAB_PROJECT="cyberlab"

lab_compose() {
    docker compose --project-directory "$LAB_DIR" -f "$LAB_DIR/compose.yaml" "$@"
}

lab_env_value() {
    grep -E "^$1=" "$LAB_ENV" | head -n1 | cut -d= -f2-
}
