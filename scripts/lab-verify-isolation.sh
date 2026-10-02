#!/usr/bin/env bash
# Proves the lab isolation rules with real connection attempts, for the
# desktop lab that is running (dvwa, kali with no target, juice-shop, ...).
# Usually run as `scripts/lab.sh verify <lab>`, from the platform, or by
# scripts/audit.sh. Exit code 0 only if every test passes. The LAN test
# (another device on your Wi-Fi) is manual: see docs/LABORATORIO.md.
#
# Phase 8 extended it to UDP, ICMP, IPv6 and proxy variables, to every
# Guacamole container (proxy, web, guacd, database), to the headers of the
# published port and to a real screen stream (scripts/guac-screen-probe.py).
set -uo pipefail
source "$(dirname "$0")/lab-common.sh"

pass=0
fail=0
skip=0

report() {  # report <PASS|FAIL> <expected> <id> <description>
    printf '%-4s  %-7s  %-13s  %s\n' "$1" "$2" "$3" "$4"
    if [ "$1" = PASS ]; then pass=$((pass + 1)); else fail=$((fail + 1)); fi
}

# skipped <id> <description>: printed, never counted as a pass.
skipped() {
    printf '%-4s  %-7s  %-13s  %s\n' SKIP - "$1" "$2"
    skip=$((skip + 1))
}

# observe <id> <description> <command...>: measures an accepted, documented
# residual (prints INFO reachable/blocked, never counted).
observe() {
    local id="$1" desc="$2"
    shift 2
    if "$@" >/dev/null 2>&1; then got=reachable; else got=blocked; fi
    printf '%-4s  %-7s  %-13s  %s\n' INFO - "$id" "$desc: $got"
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

# ---------- Probes (run inside a container; bash if it has it, else BusyBox) ----------

in_svc() {  # in_svc <service> <command...>
    lab_compose exec -T "$@"
}

has_tool() {  # has_tool <service> <program>
    in_svc "$1" sh -c "command -v $2" >/dev/null 2>&1
}

# tcp_from <service> <host> <port>: succeeds if a TCP connection opens.
tcp_from() {
    in_svc "$1" sh -c 'if command -v bash >/dev/null 2>&1; then
            exec timeout 4 bash -c "</dev/tcp/$0/$1"
        else exec timeout 4 nc -z -w 4 "$0" "$1"; fi' "$2" "$3"
}

# A DNS query for example.com (type A), as octal escapes for printf.
DNS_QUERY='\022\064\001\000\000\001\000\000\000\000\000\000\007example\003com\000\000\001\000\001'

# udp_dns_from <service> <server>: succeeds if the server answers a DNS query
# sent straight over UDP (not through the container's resolver).
udp_dns_from() {
    in_svc "$1" sh -c 'if command -v bash >/dev/null 2>&1; then
            exec bash -c "exec 3<>/dev/udp/$0/53 && printf \"$1\" >&3 && [ \"\$(timeout 3 head -c 12 <&3 | wc -c)\" -gt 0 ]"
        else [ "$(printf "$1" | timeout 4 nc -u -w 2 "$0" 53 | head -c 12 | wc -c)" -gt 0 ]; fi' "$2" "$DNS_QUERY"
}

# udp_send <service> <host> <port> <payload>: fires one datagram (no answer
# expected; the host-side UDP canary records what arrives).
udp_send() {
    in_svc "$1" sh -c 'if command -v bash >/dev/null 2>&1; then
            exec timeout 4 bash -c "printf %s \"$2\" >/dev/udp/$0/$1"
        else printf %s "$2" | timeout 4 nc -u -w 1 "$0" "$1"; fi' "$2" "$3" "$4"
}

# dns_from <service> <name>: succeeds if the name resolves.
dns_from() {
    in_svc "$1" timeout 4 getent hosts "$2"
}

# ping_from <service> <host>: one ICMP echo.
ping_from() {
    in_svc "$1" timeout 4 ping -c 1 -W 3 "$2"
}

# has_default_route <service>: succeeds if the container has an IPv4 default route.
has_default_route() {
    in_svc "$1" awk 'NR > 1 && $2 == "00000000" { found = 1 } END { exit !found }' /proc/net/route
}

# has_ipv6 <service>: succeeds if any interface but loopback has an IPv6
# address, or there is an IPv6 route outside loopback (Docker's reject routes
# on lo do not count).
has_ipv6() {
    in_svc "$1" sh -c 'cat /proc/net/if_inet6 /proc/net/ipv6_route 2>/dev/null \
        | awk "\$NF != \"lo\" { found = 1 } END { exit !found }"'
}

# has_proxy_env <service>: succeeds if an HTTP/FTP proxy variable is set.
has_proxy_env() {
    in_svc "$1" sh -c 'env | grep -iqE "^(https?|all|ftp)_proxy="'
}

bridge_has_ipv4() {
    [ -n "$(ip -4 -o addr show dev "$1" 2>/dev/null)" ]
}

network_is_internal() {
    [ "$(docker network inspect -f '{{.Internal}}' "${LAB_PROJECT}_$1")" = true ]
}

svc_running() {
    [ -n "$(lab_compose ps -q --status running "$1" 2>/dev/null)" ]
}

# ---------- The lab under test ----------

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
    if ! svc_running "$svc"; then
        echo "Service '$svc' is not running. Start the lab with: scripts/lab.sh up $LAB_ACTIVE" >&2
        exit 2
    fi
done

# The edge is the only container on the non-internal guac_front network: the
# nginx proxy since Phase 8 (trade-off T8). Before it, Guacamole itself.
if svc_running guac-proxy; then
    edge=guac-proxy
    internal_infra=(guacamole guacd guac-db)
    internal_nets=(lab_net desktop_net guac_edge guac_back "${back_nets[@]}")
    internal_bridges=(cl-lab cl-desktop cl-guacedge cl-guacback "${back_bridges[@]}")
else
    edge=guacamole
    internal_infra=(guacd guac-db)
    internal_nets=(lab_net desktop_net guac_back "${back_nets[@]}")
    internal_bridges=(cl-lab cl-desktop cl-guacback "${back_bridges[@]}")
fi
# Every container that must have no internet and no way to the host.
sealed=("${targets[@]}" kali "${internal_infra[@]}" "${back_dbs[@]}")

wsl_ip="$(ip -4 -o addr show dev eth0 | awk '{ split($4, a, "/"); print a[1] }')"
windows_ip="$(ip route show default | awk '{ print $3; exit }')"
front_gw="$(docker network inspect -f '{{range .IPAM.Config}}{{.Gateway}}{{end}}' "${LAB_PROJECT}_guac_front")"

# Canary listeners on host addresses (TCP and UDP): if a sealed container
# reaches them, isolation failed. UDP payloads are logged to a file.
canary_port=$(( 20000 + RANDOM % 20000 ))
udp_log="$(mktemp)"
canary_pids=()
for addr in "$wsl_ip" "$front_gw"; do
    python3 -c "
import socket, sys
s = socket.socket(); s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
s.bind((sys.argv[1], int(sys.argv[2]))); s.listen(8)
while True: s.accept()[0].close()
" "$addr" "$canary_port" &
    canary_pids+=($!)
    python3 -c "
import socket, sys
s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
s.bind((sys.argv[1], int(sys.argv[2])))
while True:
    data = s.recv(512)
    with open(sys.argv[3], 'ab') as log: log.write(data + b'\n')
" "$addr" "$canary_port" "$udp_log" &
    canary_pids+=($!)
done
trap 'kill "${canary_pids[@]}" 2>/dev/null; rm -f "$udp_log"' EXIT
sleep 0.5

# udp_reached <payload>: succeeds if the UDP canary logged that payload.
udp_reached() {
    sleep 0.3
    grep -qx -- "$1" "$udp_log"
}

echo "Lab isolation check (lab: $LAB_ACTIVE) — $(date '+%Y-%m-%d %H:%M:%S')"
echo "WSL eth0: $wsl_ip | Windows host: $windows_ip | guac_front gateway: $front_gw | canary port: $canary_port"
echo "Edge container (only one with a non-internal network): $edge"
echo
printf '%-4s  %-7s  %-13s  %s\n' "RES" "EXPECT" "ID" "ATTEMPT"

# 0. Probe controls: prove the probes work, so a "blocked" below is real and
#    not a missing tool (bash, nc, timeout, getent) inside the container.
if $has_dvwa; then
    expect ok "0.dvwa" "probe control: dvwa -> dvwa-db:3306 (TCP)"  tcp_from dvwa dvwa-db 3306
    expect ok "0.dvwa" "probe control: dvwa resolves 'kali'"         dns_from dvwa kali
fi
for svc in "${targets[@]}"; do
    expect ok "0.kali" "probe control: kali -> $svc:${target_port[$svc]} (TCP)" tcp_from kali "$svc" "${target_port[$svc]}"
    expect ok "0.kali" "probe control: kali -> $svc (ICMP)"          ping_from kali "$svc"
done
expect ok "0.kali" "probe control: kali resolves 'guacd' (accepted trade-off)" dns_from kali guacd
for svc in "${sealed[@]}" "$edge"; do
    # Docker's embedded DNS (127.0.0.11) answers on every network: if the
    # UDP probe gets no reply there, a "blocked" below would mean nothing.
    expect ok "0.$svc" "probe control: $svc UDP DNS query to 127.0.0.11"  udp_dns_from "$svc" 127.0.0.11
done
expect ok "0.ctl" "probe control: host -> UDP canary $wsl_ip:$canary_port" \
    bash -c "printf host-control >/dev/udp/$wsl_ip/$canary_port && sleep 0.3 && grep -qx host-control '$udp_log'"

# 1-3. No internet (TCP, UDP, DNS, ICMP, IPv6) and no route out, from every
#      container: targets, attack box and the Guacamole stack. Since Phase 8
#      this includes the edge proxy (masquerade off, trade-off T8).
for svc in "${sealed[@]}" "$edge"; do
    expect blocked "1.$svc" "$svc -> internet TCP 1.1.1.1:443"        tcp_from "$svc" 1.1.1.1 443
    expect blocked "1.$svc" "$svc -> internet TCP 8.8.8.8:53"         tcp_from "$svc" 8.8.8.8 53
    expect blocked "1.$svc" "$svc -> internet UDP DNS query to 1.1.1.1:53" udp_dns_from "$svc" 1.1.1.1
    expect blocked "1.$svc" "$svc -> internet TCP [2606:4700:4700::1111]:443 (IPv6)" \
        tcp_from "$svc" 2606:4700:4700::1111 443
    if has_tool "$svc" ping; then
        expect blocked "1.$svc" "$svc -> internet ICMP 1.1.1.1"       ping_from "$svc" 1.1.1.1
    else
        skipped "1.$svc" "$svc -> internet ICMP (no ping in the image; TCP/UDP above cover it)"
    fi
    expect blocked "2.$svc" "$svc -> DNS resolution of example.com"   dns_from "$svc" example.com
    expect blocked "3.$svc" "$svc has an IPv6 address or route outside loopback" has_ipv6 "$svc"
    expect blocked "3.$svc" "$svc has an HTTP/FTP proxy variable"     has_proxy_env "$svc"
done
for svc in "${sealed[@]}"; do
    expect blocked "3.$svc" "$svc has a default route"                has_default_route "$svc"
done

# 3. Internal bridges have no IPv4 on the host; networks are marked internal.
for net in "${internal_nets[@]}"; do
    expect ok "8.$net" "network $net is internal"                     network_is_internal "$net"
done
for br in "${internal_bridges[@]}"; do
    expect blocked "3.$br" "host bridge $br has an IPv4 address"      bridge_has_ipv4 "$br"
done
if [ "$edge" = guac-proxy ]; then
    expect ok "8.front" "guac_front has IP masquerade off (no NAT to the internet)" \
        test "$(docker network inspect -f '{{index .Options "com.docker.network.bridge.enable_ip_masquerade"}}' "${LAB_PROJECT}_guac_front")" = false
fi

# 4. Canary on the host: reachable from the host itself, never from the lab.
expect ok      "4.ctl"  "host -> canary $wsl_ip:$canary_port (control)" \
    timeout 4 bash -c "</dev/tcp/$wsl_ip/$canary_port"
for svc in "${sealed[@]}"; do
    expect blocked "4.$svc" "$svc -> host canary $wsl_ip:$canary_port (WSL eth0)"  tcp_from "$svc" "$wsl_ip" "$canary_port"
    expect blocked "4.$svc" "$svc -> host canary $front_gw:$canary_port (guac_front gw)" tcp_from "$svc" "$front_gw" "$canary_port"
    expect blocked "4.$svc" "$svc -> host docker0 172.17.0.1:$canary_port"          tcp_from "$svc" 172.17.0.1 "$canary_port"
    expect blocked "4.$svc" "$svc -> WSL DNS 10.255.255.254:53"                     tcp_from "$svc" 10.255.255.254 53
    udp_send "$svc" "$wsl_ip" "$canary_port" "udp-$svc-eth0" >/dev/null 2>&1
    expect blocked "4.$svc" "$svc -> host UDP canary $wsl_ip:$canary_port"          udp_reached "udp-$svc-eth0"
    udp_send "$svc" "$front_gw" "$canary_port" "udp-$svc-front" >/dev/null 2>&1
    expect blocked "4.$svc" "$svc -> host UDP canary $front_gw:$canary_port"        udp_reached "udp-$svc-front"
done

# 4b. (Phase 8, T8b) The edge proxy sits on the only non-internal network,
#     so, like any container there, it reaches WSL's own addresses (eth0, its
#     bridge gateway and the DNS tunnel 10.255.255.254, on the VM's loopback
#     with global scope). Accepted residual T8b (docs/LABORATORIO.md): nothing
#     else listens outside loopback in WSL (scripts/audit.sh, test A1).
#     Measured here, not counted, so a change shows up.
if [ "$edge" = guac-proxy ]; then
    expect blocked "4.proxy" "guac-proxy -> host docker0 172.17.0.1:$canary_port"    tcp_from guac-proxy 172.17.0.1 "$canary_port"
    observe "4.proxy" "T8b residual: guac-proxy -> WSL eth0 canary $wsl_ip:$canary_port (TCP)" tcp_from guac-proxy "$wsl_ip" "$canary_port"
    observe "4.proxy" "T8b residual: guac-proxy -> bridge gateway canary $front_gw:$canary_port (TCP)" tcp_from guac-proxy "$front_gw" "$canary_port"
    observe "4.proxy" "T8b residual: guac-proxy -> WSL DNS tunnel 10.255.255.254:53 (UDP query)" udp_dns_from guac-proxy 10.255.255.254
fi

# 5. Windows host (from the target; from Kali when the lab has no target).
from_svc="${targets[0]:-kali}"
for port in 135 445 3389; do
    expect blocked "5.$from_svc" "$from_svc -> Windows host $windows_ip:$port"  tcp_from "$from_svc" "$windows_ip" "$port"
done

# 6-7. The target cannot even resolve the platform infrastructure; Kali and
#      the edge proxy see only what they need.
for svc in "${targets[@]}"; do
    for name in host.docker.internal guacamole guac-proxy guacd guac-db; do
        expect blocked "7.$svc" "$svc resolves '$name'"               dns_from "$svc" "$name"
    done
done
for name in guacamole guac-proxy guac-db "${back_dbs[@]}"; do
    expect blocked "7.kali" "kali resolves '$name'"                   dns_from kali "$name"
done
if [ "$edge" = guac-proxy ]; then
    expect ok "7.proxy" "probe control: guac-proxy resolves 'guacamole'" dns_from guac-proxy guacamole
    for name in guacd guac-db kali "${targets[@]}" "${back_dbs[@]}"; do
        expect blocked "7.proxy" "guac-proxy resolves '$name'"        dns_from guac-proxy "$name"
    done
fi

# 9. Only 127.0.0.1:8080 is published, and only by the edge container.
published="$(docker ps --filter "label=com.docker.compose.project=$LAB_PROJECT" --format '{{.Ports}}' \
    | tr ',' '\n' | grep -- '->' | sed 's/^ *//' | sort -u | tr '\n' ' ')"
expect ok "9.pub" "only published port is 127.0.0.1:8080 (found: ${published:-none})" \
    test "$published" = "127.0.0.1:8080->8080/tcp "
expect ok "9.pub" "the published port belongs to $edge" \
    bash -c "docker ps --filter label=com.docker.compose.project=$LAB_PROJECT --filter label=com.docker.compose.service=$edge --format '{{.Ports}}' | grep -q '127.0.0.1:8080->'"
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

# 9c. (Phase 8, trade-off T9) Only the platform may frame Guacamole.
guac_headers="$(curl -fsS -o /dev/null -D - --max-time 5 http://127.0.0.1:8080/guacamole/ | tr -d '\r')"
# 'self' because Guacamole frames its own pages (labs/base/guac-proxy/nginx.conf).
expected_csp="frame-ancestors 'self' http://127.0.0.1:3000 http://localhost:3000"
expect ok "9.csp" "Guacamole sends CSP $expected_csp (nothing else may frame it)" bash -c '
    csp="$(printf "%s\n" "$1" | grep -i "^content-security-policy:" | cut -d: -f2- | sed "s/^ *//")"
    [ "$csp" = "$2" ]' _ "$guac_headers" "$expected_csp"
expect ok "9.hdr" "Guacamole sends X-Content-Type-Options: nosniff" \
    bash -c 'printf "%s\n" "$1" | grep -iq "^x-content-type-options: nosniff"' _ "$guac_headers"

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
        in_svc kali curl -fsS -o /dev/null --max-time 10 "${target_http[$svc]}"
done
expect ok "12a"  "host -> Guacamole http://127.0.0.1:8080/guacamole/" \
    curl -fsS -o /dev/null --max-time 5 http://127.0.0.1:8080/guacamole/
expect ok "12b"  "guacd -> kali:5901 (VNC)" \
    in_svc guacd nc -z -w 4 kali 5901
admin_pw="$(lab_env_value GUAC_ADMIN_PASSWORD)"
expect ok      "12c" "Guacamole login with labs/.env password" \
    curl -fsS -o /dev/null --max-time 5 --data-urlencode username=guacadmin \
        --data-urlencode "password=$admin_pw" http://127.0.0.1:8080/guacamole/api/tokens
# (Phase 8) The desktop itself: WebSocket tunnel, screen size and image data.
expect ok      "12e" "Kali screen streams through 127.0.0.1:8080 (WebSocket tunnel as 'plataforma')" \
    "$LAB_ROOT/scripts/guac-screen-probe.py" http://127.0.0.1:8080/guacamole "$(lab_env_value PLATFORM_GUAC_PASSWORD)"

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

# Last, because it is a failed login: Guacamole bans an address after 5 of
# them in 60 s, and every request comes from the proxy (labs/base/compose.yaml).
expect blocked "12d" "Guacamole login with default guacadmin/guacadmin" \
    curl -fsS -o /dev/null --max-time 5 -d username=guacadmin -d password=guacadmin \
        http://127.0.0.1:8080/guacamole/api/tokens

echo
echo "Result: $pass passed, $fail failed, $skip skipped (not counted)."
echo "Manual test pending: from another device on your network, open http://<PC-LAN-IP>:8080 — it must fail."
[ "$fail" -eq 0 ]
