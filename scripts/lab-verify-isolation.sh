#!/usr/bin/env bash
# Proves the lab isolation rules with real connection attempts, for the
# desktop lab that is running (dvwa, or kali with no target). Usually run as
# `scripts/lab.sh verify <lab>` or from the platform. Exit code 0 only if
# every test passes. The LAN test (another device on your Wi-Fi) is manual:
# see docs/LABORATORIO.md.
set -uo pipefail
source "$(dirname "$0")/lab-common.sh"

pass=0
fail=0

report() {  # report <PASS|FAIL> <expected> <id> <description>
    printf '%-4s  %-7s  %-13s  %s\n' "$1" "$2" "$3" "$4"
    if [ "$1" = PASS ]; then pass=$((pass + 1)); else fail=$((fail + 1)); fi
}

# expect <ok|blocked> <id> <description> <command...>
# The description states the attempt; the EXPECT column says whether it must
# succeed (ok) or fail (blocked).
expect() {
    local want="$1" id="$2" desc="$3"
    shift 3
    if "$@" >/dev/null 2>&1; then got=ok; else got=blocked; fi
    if [ "$got" = "$want" ]; then report PASS "$want" "$id" "$desc"; else report FAIL "$want" "$id" "$desc (got: $got)"; fi
}

# tcp_from <service> <host> <port>: succeeds if a TCP connection opens.
tcp_from() {
    lab_compose exec -T "$1" timeout 4 bash -c "</dev/tcp/$2/$3"
}

# dns_from <service> <name>: succeeds if the name resolves.
dns_from() {
    lab_compose exec -T "$1" timeout 4 getent hosts "$2"
}

# has_default_route <service>: succeeds if the container has a default route.
has_default_route() {
    lab_compose exec -T "$1" awk 'NR > 1 && $2 == "00000000" { found = 1 } END { exit !found }' /proc/net/route
}

bridge_has_ipv4() {
    [ -n "$(ip -4 -o addr show dev "$1" 2>/dev/null)" ]
}

network_is_internal() {
    [ "$(docker network inspect -f '{{.Internal}}' "${LAB_PROJECT}_$1")" = true ]
}

LAB_ACTIVE="${LAB_ACTIVE:-$(lab_active_desktop || true)}"
if [ -z "$LAB_ACTIVE" ]; then
    echo "No desktop lab is running. Start one with: scripts/lab.sh up dvwa" >&2
    exit 2
fi
# Targets of the lab (reachable from Kali), their private back-end networks, and
# per-target probe port + positive-control HTTP URL.
declare -A target_http=() target_port=()
case "$LAB_ACTIVE" in
    dvwa)
        targets=(dvwa); back_nets=(dvwa_back); back_bridges=(cl-dvwaback); back_dbs=(dvwa-db)
        target_http=([dvwa]="http://dvwa/login.php"); target_port=([dvwa]=80) ;;
    juice-shop)
        targets=(juice-shop); back_nets=(); back_bridges=(); back_dbs=()
        target_http=([juice-shop]="http://juice-shop:3000/"); target_port=([juice-shop]=3000) ;;
    webgoat)
        targets=(webgoat); back_nets=(); back_bridges=(); back_dbs=()
        target_http=([webgoat]="http://webgoat:8080/WebGoat/login"); target_port=([webgoat]=8080) ;;
    vulhub)
        targets=(vulhub); back_nets=(); back_bridges=(); back_dbs=()
        target_http=([vulhub]="http://vulhub/"); target_port=([vulhub]=80) ;;
    rede-de-alvos)
        targets=(dvwa juice-shop); back_nets=(dvwa_back); back_bridges=(cl-dvwaback); back_dbs=(dvwa-db)
        target_http=([dvwa]="http://dvwa/login.php" [juice-shop]="http://juice-shop:3000/")
        target_port=([dvwa]=80 [juice-shop]=3000) ;;
    *) targets=(); back_nets=(); back_bridges=(); back_dbs=() ;;
esac
has_dvwa=false
for t in "${targets[@]}"; do [ "$t" = dvwa ] && has_dvwa=true; done

for svc in kali "${targets[@]}"; do
    if [ -z "$(lab_compose ps -q --status running "$svc")" ]; then
        echo "Service '$svc' is not running. Start the lab with: scripts/lab.sh up $LAB_ACTIVE" >&2
        exit 2
    fi
done

wsl_ip="$(ip -4 -o addr show dev eth0 | awk '{ split($4, a, "/"); print a[1] }')"
windows_ip="$(ip route show default | awk '{ print $3; exit }')"
front_gw="$(docker network inspect -f '{{range .IPAM.Config}}{{.Gateway}}{{end}}' "${LAB_PROJECT}_guac_front")"

# Canary listeners on host addresses: if a target reaches them, isolation failed.
canary_port=$(( 20000 + RANDOM % 20000 ))
canary_pids=()
for addr in "$wsl_ip" "$front_gw"; do
    python3 -c "
import socket, sys
s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind((sys.argv[1], int(sys.argv[2]))); s.listen(8)
while True: s.accept()[0].close()
" "$addr" "$canary_port" &
    canary_pids+=($!)
done
trap 'kill "${canary_pids[@]}" 2>/dev/null' EXIT
sleep 0.5

echo "Lab isolation check (lab: $LAB_ACTIVE) — $(date '+%Y-%m-%d %H:%M:%S')"
echo "WSL eth0: $wsl_ip | Windows host: $windows_ip | guac_front gateway: $front_gw | canary port: $canary_port"
echo
printf '%-4s  %-7s  %-13s  %s\n' "RES" "EXPECT" "ID" "ATTEMPT"

# 0. Probe controls: prove the probes work, so a "blocked" below is real and
#    not a missing tool (bash, timeout, getent) inside the container.
if $has_dvwa; then
    expect ok "0.dvwa" "probe control: dvwa -> dvwa-db:3306 (TCP)"  tcp_from dvwa dvwa-db 3306
    expect ok "0.dvwa" "probe control: dvwa resolves 'kali'"         dns_from dvwa kali
fi
for svc in "${targets[@]}"; do
    expect ok "0.kali" "probe control: kali -> $svc:${target_port[$svc]} (TCP)" tcp_from kali "$svc" "${target_port[$svc]}"
done
expect ok "0.kali" "probe control: kali resolves 'guacd' (accepted trade-off)" dns_from kali guacd

# 1-2. No internet (TCP and DNS) from targets and attack box.
for svc in "${targets[@]}" kali; do
    expect blocked "1.$svc" "$svc -> internet TCP 1.1.1.1:443"        tcp_from "$svc" 1.1.1.1 443
    expect blocked "1.$svc" "$svc -> internet TCP 8.8.8.8:53"         tcp_from "$svc" 8.8.8.8 53
    expect blocked "2.$svc" "$svc -> DNS resolution of example.com"   dns_from "$svc" example.com
    expect blocked "3.$svc" "$svc has a default route"                has_default_route "$svc"
done

# 3. Internal bridges have no IPv4 on the host; networks are marked internal.
for net in lab_net desktop_net "${back_nets[@]}" guac_back; do
    expect ok "8.$net" "network $net is internal"                     network_is_internal "$net"
done
for br in cl-lab cl-desktop "${back_bridges[@]}" cl-guacback; do
    expect blocked "3.$br" "host bridge $br has an IPv4 address"      bridge_has_ipv4 "$br"
done

# 4. Canary on the host: reachable from the host itself, never from the lab.
expect ok      "4.ctl"  "host -> canary $wsl_ip:$canary_port (control)" \
    timeout 4 bash -c "</dev/tcp/$wsl_ip/$canary_port"
for svc in "${targets[@]}" kali; do
    expect blocked "4.$svc" "$svc -> host canary $wsl_ip:$canary_port (WSL eth0)"  tcp_from "$svc" "$wsl_ip" "$canary_port"
    expect blocked "4.$svc" "$svc -> host canary $front_gw:$canary_port (guac_front gw)" tcp_from "$svc" "$front_gw" "$canary_port"
    expect blocked "4.$svc" "$svc -> host docker0 172.17.0.1:$canary_port"          tcp_from "$svc" 172.17.0.1 "$canary_port"
    expect blocked "4.$svc" "$svc -> WSL DNS 10.255.255.254:53"                     tcp_from "$svc" 10.255.255.254 53
done

# 5. Windows host (from the target; from Kali when the lab has no target).
from_svc="${targets[0]:-kali}"
for port in 135 445 3389; do
    expect blocked "5.$from_svc" "$from_svc -> Windows host $windows_ip:$port"  tcp_from "$from_svc" "$windows_ip" "$port"
done

# 6-7. The target cannot even resolve the platform infrastructure.
for svc in "${targets[@]}"; do
    for name in host.docker.internal guacamole guacd guac-db; do
        expect blocked "7.$svc" "$svc resolves '$name'"               dns_from "$svc" "$name"
    done
done
for name in guacamole guac-db "${back_dbs[@]}"; do
    expect blocked "7.kali" "kali resolves '$name'"                   dns_from kali "$name"
done

# 9. Only 127.0.0.1:8080 is published.
published="$(docker ps --filter "label=com.docker.compose.project=$LAB_PROJECT" --format '{{.Ports}}' \
    | tr ',' '\n' | grep -- '->' | sed 's/^ *//' | sort -u | tr '\n' ' ')"
expect ok "9.pub" "only published port is 127.0.0.1:8080 (found: ${published:-none})" \
    test "$published" = "127.0.0.1:8080->8080/tcp "
expect blocked "9.ss" "something listens on 0.0.0.0:8080 or [::]:8080 in WSL" \
    bash -c "ss -Hltn | awk '{ print \$4 }' | grep -Eq '^(0\.0\.0\.0|\*|\[::\]):8080$'"
expect blocked "9.eth0" "Guacamole reachable on WSL eth0 $wsl_ip:8080 (non-loopback)" \
    curl -fsS -o /dev/null --max-time 5 "http://$wsl_ip:8080/guacamole/"
if command -v powershell.exe >/dev/null 2>&1; then
    expect ok "9.win" "Windows listens on 8080 only on loopback" bash -c '
        addrs="$(powershell.exe -NoProfile -Command "Get-NetTCPConnection -State Listen -LocalPort 8080 -ErrorAction SilentlyContinue | ForEach-Object LocalAddress" | tr -d "\r")"
        [ -z "$addrs" ] || ! echo "$addrs" | grep -Evq "^(127\.0\.0\.1|::1)$"'
fi

# 9b. The platform (Phase 6) is loopback-only too, whether it runs or not.
expect blocked "9.app" "something listens on 0.0.0.0:3000 or [::]:3000 in WSL" \
    bash -c "ss -Hltn | awk '{ print \$4 }' | grep -Eq '^(0\.0\.0\.0|\*|\[::\]):3000$'"

# 10. No lab container is privileged or can reach the Docker daemon.
for id in $(docker ps -q --filter "label=com.docker.compose.project=$LAB_PROJECT"); do
    name="$(docker inspect -f '{{.Name}}' "$id")"
    expect blocked "10" "${name#/} is privileged" \
        test "$(docker inspect -f '{{.HostConfig.Privileged}}' "$id")" = true
    expect blocked "10" "${name#/} mounts the Docker socket" \
        bash -c "docker inspect -f '{{range .Mounts}}{{.Source}} {{end}}' '$id' | grep -q docker.sock"
done

# 11-12. Positive controls: the lab must still work.
for svc in "${targets[@]}"; do
    expect ok "11" "kali -> $svc (HTTP ${target_http[$svc]})" \
        lab_compose exec -T kali curl -fsS -o /dev/null --max-time 10 "${target_http[$svc]}"
done
expect ok "12a"  "host -> Guacamole http://127.0.0.1:8080/guacamole/" \
    curl -fsS -o /dev/null --max-time 5 http://127.0.0.1:8080/guacamole/
expect ok "12b"  "guacd -> kali:5901 (VNC)" \
    lab_compose exec -T guacd nc -z -w 4 kali 5901
admin_pw="$(lab_env_value GUAC_ADMIN_PASSWORD)"
expect ok      "12c" "Guacamole login with labs/.env password" \
    curl -fsS -o /dev/null --max-time 5 --data-urlencode username=guacadmin \
        --data-urlencode "password=$admin_pw" http://127.0.0.1:8080/guacamole/api/tokens
expect blocked "12d" "Guacamole login with default guacadmin/guacadmin" \
    curl -fsS -o /dev/null --max-time 5 -d username=guacadmin -d password=guacadmin \
        http://127.0.0.1:8080/guacamole/api/tokens

# 13. The platform's Guacamole user (Phase 6) sees the Kali connection and
#     nothing else: no connection parameters (VNC password), no admin.
api="http://127.0.0.1:8080/guacamole/api"
platform_token="$(curl -fsS --max-time 5 --data-urlencode username=plataforma \
    --data-urlencode "password=$(lab_env_value PLATFORM_GUAC_PASSWORD)" "$api/tokens" \
    | python3 -c 'import json, sys; print(json.load(sys.stdin)["authToken"])' 2>/dev/null)"
expect ok "13a" "Guacamole login as 'plataforma' (restricted user)" test -n "$platform_token"
expect ok "13b" "'plataforma' sees exactly one connection: Kali (attack box)" bash -c "
    curl -fsS --max-time 5 '$api/session/data/postgresql/connections?token=$platform_token' \
        | python3 -c 'import json, sys; d = json.load(sys.stdin); sys.exit(0 if [c[\"name\"] for c in d.values()] == [\"Kali (attack box)\"] else 1)'"
kali_id="$(curl -fsS --max-time 5 "$api/session/data/postgresql/connections?token=$platform_token" \
    | python3 -c 'import json, sys; print(next(iter(json.load(sys.stdin))))' 2>/dev/null)"
expect blocked "13c" "'plataforma' reads the Kali connection parameters (VNC password)" \
    curl -fsS -o /dev/null --max-time 5 "$api/session/data/postgresql/connections/$kali_id/parameters?token=$platform_token"
expect blocked "13d" "'plataforma' creates a connection" \
    curl -fsS -o /dev/null --max-time 5 -H 'Content-Type: application/json' \
        -d '{"parentIdentifier":"ROOT","name":"x","protocol":"ssh","parameters":{},"attributes":{}}' \
        "$api/session/data/postgresql/connections?token=$platform_token"
expect blocked "13e" "'plataforma' creates a user" \
    curl -fsS -o /dev/null --max-time 5 -H 'Content-Type: application/json' \
        -d '{"username":"x","password":"x","attributes":{}}' \
        "$api/session/data/postgresql/users?token=$platform_token"
[ -n "$platform_token" ] && curl -fsS -o /dev/null -X DELETE "$api/session?token=$platform_token"

echo
echo "Result: $pass passed, $fail failed."
echo "Manual test pending: from another device on your network, open http://<PC-LAN-IP>:8080 — it must fail."
[ "$fail" -eq 0 ]
