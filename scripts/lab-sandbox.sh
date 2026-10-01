#!/usr/bin/env bash
# Controls the linux-sandbox practice box (module 0.3).
# Usage: scripts/lab-sandbox.sh [command]      (or: npm run lab:sandbox -- [command])
#   (none) | shell   start the sandbox if needed and open a shell in it
#   reset            throw the container away and start a fresh one, then open a shell
#   rebuild          rebuild the image (pulls packages from the internet), then reset
#   down             stop and remove the sandbox
#   verify           prove the isolation rules (exit code 0 only if all pass)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/labs/linux-sandbox"
PROJECT="cyberlab-sandbox"

sandbox_compose() {
    docker compose --project-directory "$DIR" -f "$DIR/compose.yaml" "$@"
}

is_running() {
    [ -n "$(sandbox_compose ps -q --status running sandbox 2>/dev/null)" ]
}

# RAM rule: one lab at a time. Refuse to start next to other compose projects.
refuse_if_other_lab() {
    local others
    others="$(docker ps --format '{{.Names}}' --filter "label=com.docker.compose.project" \
        | while read -r name; do
              project="$(docker inspect -f '{{index .Config.Labels "com.docker.compose.project"}}' "$name")"
              [ "$project" != "$PROJECT" ] && echo "$name"
          done || true)"
    if [ -n "$others" ]; then
        echo "Other containers are running (one lab at a time):" >&2
        echo "$others" >&2
        echo "Stop them first, e.g. scripts/lab-down.sh" >&2
        exit 1
    fi
}

start() {
    refuse_if_other_lab
    sandbox_compose up -d "$@"
}

open_shell() {
    echo "==> Entering the sandbox (type 'exit' to leave)"
    sandbox_compose exec sandbox bash -l
}

verify() {
    if ! is_running; then
        echo "The sandbox is not running. Start it with: npm run lab:sandbox" >&2
        exit 2
    fi
    local pass=0 fail=0 cid
    cid="$(sandbox_compose ps -q sandbox)"
    check() {  # check <ok|blocked> <description> <command...>
        local want="$1" desc="$2" got
        shift 2
        if "$@" >/dev/null 2>&1; then got=ok; else got=blocked; fi
        if [ "$got" = "$want" ]; then
            printf 'PASS  %-7s  %s\n' "$want" "$desc"; pass=$((pass + 1))
        else
            printf 'FAIL  %-7s  %s (got: %s)\n' "$want" "$desc" "$got"; fail=$((fail + 1))
        fi
    }
    in_box() { sandbox_compose exec -T sandbox "$@"; }

    echo "linux-sandbox isolation check — $(date '+%Y-%m-%d %H:%M:%S')"
    printf '%-4s  %-7s  %s\n' "RES" "EXPECT" "ATTEMPT"
    check ok      "probe control: bash runs inside the sandbox"        in_box bash -c 'true'
    check ok      "probe control: missions exist (missao-1..3)"        in_box test -d missao-3
    check ok      "network mode is 'none'" \
        test "$(docker inspect -f '{{.HostConfig.NetworkMode}}' "$cid")" = none
    check ok      "only the loopback interface exists" \
        in_box bash -c '[ "$(ls /sys/class/net)" = lo ]'
    check blocked "sandbox -> internet TCP 1.1.1.1:443"                in_box timeout 4 bash -c '</dev/tcp/1.1.1.1/443'
    check blocked "sandbox -> DNS resolution of example.com"           in_box timeout 4 getent hosts example.com
    check blocked "sandbox -> Docker host 172.17.0.1:22"               in_box timeout 4 bash -c '</dev/tcp/172.17.0.1/22'
    check ok      "no published ports" \
        test -z "$(docker inspect -f '{{range $p, $b := .NetworkSettings.Ports}}{{$p}}{{end}}' "$cid")"
    check ok      "runs as aluno (uid 1000), not root"                 in_box bash -c '[ "$(id -u)" = 1000 ]'
    check blocked "sudo is available"                                  in_box bash -c 'command -v sudo'
    check ok      "no effective capabilities" \
        in_box bash -c 'grep -q "^CapEff:[[:space:]]*0000000000000000$" /proc/self/status'
    check ok      "no-new-privileges is set" \
        in_box bash -c 'grep -q "^NoNewPrivs:[[:space:]]*1$" /proc/self/status'
    check ok      "not privileged" \
        test "$(docker inspect -f '{{.HostConfig.Privileged}}' "$cid")" = false
    check blocked "Docker socket is mounted"                           in_box test -e /var/run/docker.sock
    check ok      "memory limit is set (128 MiB)" \
        test "$(docker inspect -f '{{.HostConfig.Memory}}' "$cid")" = 134217728
    check ok      "process limit is set (128)" \
        test "$(docker inspect -f '{{.HostConfig.PidsLimit}}' "$cid")" = 128
    check ok      "restart policy is 'no'" \
        test "$(docker inspect -f '{{.HostConfig.RestartPolicy.Name}}' "$cid")" = no
    echo
    echo "Result: $pass passed, $fail failed."
    [ "$fail" -eq 0 ]
}

case "${1:-shell}" in
    shell)
        is_running || start
        open_shell
        ;;
    reset)
        start --force-recreate
        open_shell
        ;;
    rebuild)
        refuse_if_other_lab
        sandbox_compose build --pull
        start --force-recreate
        echo "Sandbox rebuilt. Open it with: npm run lab:sandbox"
        ;;
    down)
        sandbox_compose down --remove-orphans
        echo "Sandbox is down."
        ;;
    verify)
        verify
        ;;
    *)
        sed -n '2,9p' "$0" >&2
        exit 2
        ;;
esac
