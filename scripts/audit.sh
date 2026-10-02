#!/usr/bin/env bash
# Phase 8 isolation audit: proves that nothing is reachable from outside the
# PC and that the lab networks have no internet. Terminal only (it starts and
# stops every lab, one at a time, through scripts/lab.sh). Read-only
# otherwise: it never changes Docker, WSL or Windows settings.
#
# Usage: scripts/audit.sh [--labs "<slug> ..."] [--no-labs] [--self-test]
#   (no option)   host/WSL + Windows + every lab of the registry + npm audit
#   --labs "..."  only these labs in block C
#   --no-labs     blocks A, B and D only (no lab is started)
#   --self-test   "test of the test": attaches DVWA to Docker's default bridge
#                 (which has internet), expects scripts/lab.sh verify to FAIL,
#                 and always detaches it again. Needs the dvwa lab running.
#
# Labs whose images were never downloaded are reported as PENDING (never as a
# pass). Exit code 0 only if nothing failed. See docs/LABORATORIO.md.
set -uo pipefail
source "$(dirname "$0")/lab-common.sh"
cd "$LAB_ROOT"

pass=0
fail=0
pending=()
lab_results=()

report() {  # report <PASS|FAIL|SKIP|INFO> <id> <description>
    printf '%-4s  %-9s  %s\n' "$1" "$2" "$3"
    case "$1" in PASS) pass=$((pass + 1)) ;; FAIL) fail=$((fail + 1)) ;; esac
}

check() {  # check <id> <description> <command...>: PASS if the command succeeds
    local id="$1" desc="$2"
    shift 2
    if "$@" >/dev/null 2>&1; then report PASS "$id" "$desc"; else report FAIL "$id" "$desc"; fi
}

section() { printf '\n== %s\n' "$1"; }

# ---------- Options ----------

only_labs=""
run_labs=true
self_test=false
while [ $# -gt 0 ]; do
    case "$1" in
        --labs) only_labs="${2:-}"; shift 2 ;;
        --no-labs) run_labs=false; shift ;;
        --self-test) self_test=true; shift ;;
        *) sed -n '2,17p' "$0" >&2; exit 2 ;;
    esac
done
if [ "${CYBERLAB_CALLER:-}" = platform ]; then
    echo "The audit only runs from a terminal." >&2
    exit 6
fi

# ---------- Self-test (test of the test) ----------

if $self_test; then
    if [ "$(lab_running_labs)" != dvwa ]; then
        echo "--self-test needs the dvwa lab running: scripts/lab.sh up dvwa" >&2
        exit 2
    fi
    container="$(lab_compose_of dvwa ps -q dvwa)"
    echo "Self-test: attaching DVWA to Docker's default bridge (has internet) for a moment."
    trap 'docker network disconnect bridge "$container" >/dev/null 2>&1' EXIT
    docker network connect bridge "$container"
    out="$(scripts/lab.sh verify dvwa 2>&1)"
    code=$?
    docker network disconnect bridge "$container"
    trap - EXIT
    echo "$out" | grep -E '^FAIL' | sed 's/^/  caught: /'
    fails="$(echo "$out" | grep -c '^FAIL')"
    if [ "$code" -ne 0 ] && echo "$out" | grep -q '^FAIL  blocked  1\.dvwa'; then
        echo "Self-test PASS: the check caught the break ($fails FAILs, exit $code)."
    else
        echo "Self-test FAIL: the check did not catch DVWA on a network with internet (exit $code)."
        exit 1
    fi
    if scripts/lab.sh verify dvwa >/dev/null 2>&1; then
        echo "Self-test PASS: after detaching, every check passes again."
        exit 0
    fi
    echo "Self-test FAIL: the lab does not pass again after detaching DVWA." >&2
    exit 1
fi

echo "Isolation audit — $(date '+%Y-%m-%d %H:%M:%S')"
echo "WSL $(wsl.exe --version 2>/dev/null | tr -d '\0\r' | head -n1 | grep -oE '[0-9.]+$' || echo '?') ·" \
    "kernel $(uname -r) · Docker $(docker version -f '{{.Server.Version}}' 2>/dev/null) ·" \
    "Compose $(docker compose version --short 2>/dev/null) · Node $(node --version)"

# ---------- A. Host / WSL ----------

section "A. Host (WSL)"

# Listening sockets that are not loopback. 10.255.255.254 is WSL's DNS
# tunneling address, which lives on the loopback interface (lo) of the VM.
non_loopback_listeners() {
    ss -Hltnu | awk '{ print $1, $5 }' \
        | grep -Ev ' (127\.[0-9.]+|\[::1\]|10\.255\.255\.254)(%lo)?:[0-9]+$'
}
listeners="$(non_loopback_listeners)"
if [ -z "$listeners" ]; then
    report PASS A1 "every listening TCP/UDP socket in WSL is loopback-only"
else
    report FAIL A1 "sockets listening beyond loopback: $(echo "$listeners" | tr '\n' ';')"
fi
check A2 "Docker daemon has no TCP endpoint (no -H tcp://, no daemon.json hosts)" bash -c '
    ! ps -o args= -C dockerd | grep -Eq "(-H|--host)[ =]?tcp://" &&
    ! { [ -f /etc/docker/daemon.json ] && grep -q "\"hosts\"" /etc/docker/daemon.json; } &&
    ! ss -Hltn | awk "{ print \$4 }" | grep -Eq ":(2375|2376)$"'
check A2 "docker CLI talks to the daemon over the Unix socket" \
    bash -c '[[ "$(docker context inspect -f "{{.Endpoints.docker.Host}}")" == unix://* ]]'
check A3 "docker.sock is 660 root:docker" \
    test "$(stat -c '%a %U %G' /var/run/docker.sock)" = "660 root docker"
check A3 "only $(id -un) is in the docker group (docker = root in WSL)" \
    test "$(getent group docker | cut -d: -f4)" = "$(id -un)"
if [ -f "$LAB_ENV" ]; then
    check A4 "labs/.env is readable only by its owner (600)" test "$(stat -c '%a' "$LAB_ENV")" = 600
fi
check A4 "labs/.env and data/ are git-ignored and untracked" bash -c '
    git check-ignore -q labs/.env && git check-ignore -q data/plataforma.db &&
    [ -z "$(git ls-files labs/.env data)" ]'
check A5 "npm dev/start bind to 127.0.0.1:3000 only" bash -c '
    node -e "const s=require(\"./package.json\").scripts; process.exit([s.dev,s.start].every(c=>/-H 127\.0\.0\.1 -p 3000/.test(c))?0:1)"'
if curl -fsS -o /dev/null --max-time 3 http://127.0.0.1:3000/ 2>/dev/null; then
    headers="$(curl -fsS -o /dev/null -D - --max-time 5 http://127.0.0.1:3000/ | tr -d '\r')"
    for h in "x-frame-options: DENY" "content-security-policy: frame-ancestors 'none'" \
             "x-content-type-options: nosniff" "referrer-policy: no-referrer"; do
        check A6 "platform sends '$h'" bash -c 'printf "%s\n" "$1" | grep -iqF "$2"' _ "$headers" "$h"
    done
    check A6 "platform refuses a foreign Host header (DNS rebinding) with 403" \
        test "$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: evil.example:3000' http://127.0.0.1:3000/)" = 403
    check A6 "platform refuses a POST from a foreign Origin with 403" \
        test "$(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Origin: http://evil.example' http://127.0.0.1:3000/laboratorios)" = 403
else
    report SKIP A6 "platform is not running: headers not checked (npm run dev, then audit again)"
fi

# ---------- B. Windows ----------

section "B. Windows"

if ! command -v powershell.exe >/dev/null 2>&1; then
    report SKIP B "powershell.exe not reachable from WSL (interop off?): Windows not audited"
    win_ips=""
else
    win_ps() { powershell.exe -NoProfile -NonInteractive -Command "$1" </dev/null 2>/dev/null | tr -d '\r'; }
    win_profile="$(wslpath "$(win_ps '$env:USERPROFILE')")"
    wslconfig="$win_profile/.wslconfig"
    mode="$(grep -iE '^\s*networkingMode\s*=' "$wslconfig" 2>/dev/null | tail -n1 | cut -d= -f2 | tr -d ' ' | tr 'A-Z' 'a-z')"
    report INFO B1 ".wslconfig networkingMode = ${mode:-nat (default)}"
    # In mirrored mode a WSL socket on 0.0.0.0 is a LAN socket; our rules
    # assume NAT, where WSL loopback reaches Windows loopback only.
    check B1 "WSL networking is NAT (not mirrored/bridged)" test "${mode:-nat}" = nat
    check B2 "no netsh portproxy rule (would forward LAN ports into WSL)" \
        test -z "$(win_ps 'netsh interface portproxy show all' | tr -d '[:space:]')"
    check B3 "Windows listens on 3000/8080 only on loopback" bash -c '
        addrs="$(powershell.exe -NoProfile -Command "Get-NetTCPConnection -State Listen -LocalPort 3000,8080 -ErrorAction SilentlyContinue | ForEach-Object LocalAddress" | tr -d "\r")"
        [ -z "$addrs" ] || ! echo "$addrs" | grep -Evq "^(127\.0\.0\.1|::1)$"'
    # Every non-loopback IPv4 of Windows (Wi-Fi, Ethernet, VPNs), except the
    # WSL/Hyper-V virtual adapters.
    win_ips="$(win_ps 'Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" -and $_.InterfaceAlias -notlike "vEthernet*" } | ForEach-Object { "{0}={1}" -f $_.IPAddress, $_.InterfaceAlias }')"
    report INFO B4 "Windows addresses probed from the LAN side: $(echo "$win_ips" | paste -sd ";")"
fi

# lan_probe <port...>: from Windows, connect to its own LAN/VPN addresses.
# A listener on those addresses is what another device would reach.
win_port_open() {  # win_port_open <ip> <port>: a TCP connect from Windows itself
    [ "$(powershell.exe -NoProfile -Command "\$c = New-Object Net.Sockets.TcpClient; try { if (\$c.ConnectAsync('$1', $2).Wait(2000) -and \$c.Connected) { 'open' } else { 'closed' } } catch { 'closed' } finally { \$c.Dispose() }" </dev/null 2>/dev/null | tr -d '\r')" = open ]
}
lan_probe() {
    local entry ip port
    [ -z "$win_ips" ] && return
    for port in "$@"; do
        # Control: the same probe must see the port open on Windows loopback
        # (WSL forwards it there), or "closed" below would mean nothing.
        check B4 "probe control: Windows 127.0.0.1:$port is open" win_port_open 127.0.0.1 "$port"
        while IFS= read -r entry; do
            ip="${entry%%=*}"
            if win_port_open "$ip" "$port"; then
                report FAIL B4 "$ip:$port (${entry#*=}) is OPEN from the network side"
            else
                report PASS B4 "$ip:$port (${entry#*=}) is closed from the network side"
            fi
        done <<<"$win_ips"
    done
}
# 3000 is probed here when the platform runs; 8080 once per lab, below.
if curl -fsS -o /dev/null --max-time 3 http://127.0.0.1:3000/ 2>/dev/null; then
    lan_probe 3000
fi

# ---------- C. Labs ----------

section "C. Labs (one at a time)"

if $run_labs; then
    running="$(lab_running_labs)$(lab_foreign_running)"
    if [ -n "$running" ]; then
        echo "A lab or another container is running: stop it first (scripts/lab.sh down <lab>)." >&2
        exit 5
    fi
    labs=(${only_labs:-${LAB_SLUGS[@]}})
    for lab in "${labs[@]}"; do
        lab_is_known "$lab" || { report FAIL C "unknown lab '$lab'"; continue; }
        missing="$(missing_images "$lab")"
        if [ -n "$missing" ]; then
            report INFO "C.$lab" "PENDING: images not downloaded ($(echo $missing)); run scripts/lab.sh pull $lab"
            pending+=("$lab")
            lab_results+=("$lab|PENDING|images not downloaded")
            continue
        fi
        echo "-- $lab: up"
        if ! up_out="$(scripts/lab.sh up "$lab" 2>&1)"; then
            echo "$up_out" | tail -n 5
            report FAIL "C.$lab" "lab did not start"
            lab_results+=("$lab|FAIL|did not start")
            scripts/lab.sh down "$lab" >/dev/null 2>&1
            continue
        fi
        verify_out="$(scripts/lab.sh verify "$lab" 2>&1)"
        code=$?
        echo "$verify_out" | grep -E '^(FAIL|SKIP)' | sed 's/^/   /'
        summary="$(echo "$verify_out" | grep -E '^(Result|Resultado)|passed' | tail -n1)"
        if [ "$code" -eq 0 ]; then
            report PASS "C.$lab" "scripts/lab.sh verify $lab — $summary"
            lab_results+=("$lab|PASS|$summary")
        else
            report FAIL "C.$lab" "scripts/lab.sh verify $lab — $summary"
            lab_results+=("$lab|FAIL|$summary")
        fi
        [ "${LAB_KIND[$lab]}" = desktop ] && lan_probe 8080
        echo "-- $lab: down"
        scripts/lab.sh down "$lab" >/dev/null 2>&1 || report FAIL "C.$lab" "lab did not stop cleanly"
    done
else
    report SKIP C "labs not audited (--no-labs)"
fi

# ---------- D. Dependencies ----------

section "D. Dependencies (npm audit, production only)"
# Sends the dependency list to the npm registry (the same data npm install
# sends); approved by MESQUITA in Phase 8.
audit_json="$(npm audit --omit=dev --json 2>/dev/null)"
vulns="$(echo "$audit_json" | node -e '
    let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
      try { const v = JSON.parse(s).metadata.vulnerabilities;
            console.log(["critical","high","moderate","low"].map(k => `${k} ${v[k]}`).join(", ")); }
      catch { console.log("unavailable"); } });')"
if [ "$vulns" = unavailable ]; then
    report SKIP D1 "npm audit unavailable (offline?)"
elif echo "$vulns" | grep -Eq '^critical 0, high 0'; then
    report PASS D1 "no critical/high advisory in production dependencies ($vulns)"
else
    report FAIL D1 "production dependencies with critical/high advisories ($vulns): run npm audit"
fi

# ---------- Summary ----------

section "Summary"
if [ ${#lab_results[@]} -gt 0 ]; then
    printf '%-15s %-8s %s\n' LAB RESULT DETAIL
    for row in "${lab_results[@]}"; do
        IFS='|' read -r l r d <<<"$row"
        printf '%-15s %-8s %s\n' "$l" "$r" "$d"
    done
    echo
fi
echo "Audit: $pass passed, $fail failed${pending:+, pending: ${pending[*]}}."
echo "Manual, still required: from another device (phone on the same Wi-Fi), open"
echo "http://<PC-LAN-IP>:3000/ and http://<PC-LAN-IP>:8080/guacamole/ — both must fail."
[ "$fail" -eq 0 ]
