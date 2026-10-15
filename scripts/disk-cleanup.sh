#!/usr/bin/env bash
# Disk cleanup for WSL and Docker (Phase 8). Shows first, deletes only when
# asked. Never touches volumes (/home/kali, the Guacamole database, DVWA's
# database) nor the images of the registered labs: starting a lab must keep
# working offline. See docs/MANUTENCAO.md.
#
# Usage: scripts/disk-cleanup.sh [--apply] [--deep] [--sudo]
#   (no option)  dry run: what takes space and what would be removed
#   --apply      remove stopped lab containers, dangling images, unused
#                Docker build cache and the Next.js build cache
#   --deep       also all build cache, npm's download cache and old images of
#                the lab stacks that no lab uses any more (asks to confirm)
#   --sudo       also apt cache, journal and fstrim (asks for your password;
#                scripts/windows/compact-wsl.ps1 runs these as root itself)
set -uo pipefail
source "$(dirname "$0")/lab-common.sh"
cd "$LAB_ROOT"

apply=false
deep=false
use_sudo=false
for arg in "$@"; do
    case "$arg" in
        --apply) apply=true ;;
        --deep) apply=true; deep=true ;;
        --sudo) use_sudo=true ;;
        *) sed -n '2,15p' "$0" >&2; exit 2 ;;
    esac
done
if [ "${CYBERLAB_CALLER:-}" = platform ]; then
    echo "Disk cleanup only runs from a terminal." >&2
    exit 6
fi

used_bytes() { df -B1 --output=used / | tail -n1 | tr -d ' '; }
human() { numfmt --to=iec --suffix=B "$1"; }
size_of() { du -sb "$1" 2>/dev/null | cut -f1; }

# Repositories of the images the lab stacks use, to spot their old versions.
LAB_IMAGE_REPOS="cyberlab/ guacamole/guacamole guacamole/guacd postgres mariadb ghcr.io/digininja/dvwa \
bkimminich/juice-shop webgoat/webgoat dolevf/dvga httpd nginxinc/nginx-unprivileged debian kalilinux/kali-rolling"

# Image IDs that must stay: every image any registered lab starts from, and
# the bases its Dockerfiles build on (FROM), so local builds keep working.
protected_ids() {
    local lab image
    {
        for lab in "${LAB_SLUGS[@]}"; do
            lab_compose_of "$lab" config --images 2>/dev/null
        done
        awk 'toupper($1) == "FROM" { print $2 }' labs/*/Dockerfile labs/*/*/Dockerfile 2>/dev/null
    } | sort -u | while read -r image; do
        docker image inspect -f '{{.Id}}' "$image" 2>/dev/null
    done | sort -u
}

# Old images of the lab stacks: same repositories, not used by any lab,
# not used by any container. Printed as "<id> <repo:tag>".
stale_lab_images() {
    local keep in_use
    keep="$(protected_ids)"
    in_use="$(docker ps -aq | xargs -r docker inspect -f '{{.Image}}' | sort -u)"
    docker images --no-trunc --format '{{.ID}} {{.Repository}}:{{.Tag}}' | while read -r id ref; do
        local repo="${ref%:*}" match=false prefix
        for prefix in $LAB_IMAGE_REPOS; do
            if [[ "$prefix" == */ && "$repo" == "$prefix"* ]] || [ "$repo" = "$prefix" ]; then match=true; fi
        done
        $match || continue
        grep -qx "$id" <<<"$keep" && continue
        grep -qx "$id" <<<"$in_use" && continue
        echo "$id $ref"
    done
}

echo "Disk cleanup — $(date '+%Y-%m-%d %H:%M:%S') — mode: $($deep && echo deep || ($apply && echo apply || echo 'dry run'))"
echo
echo "== What takes space"
echo "WSL disk: $(df -h --output=used,size / | tail -n1 | awk '{ print $1 " used of " $2 }')"
docker system df
echo
for path in .next/cache data/backups "$HOME/.npm/_cacache" "$HOME/.cache/ms-playwright"; do
    [ -e "$path" ] && printf '%-40s %s\n' "$path" "$(human "$(size_of "$path")")"
done
echo
echo "Volumes (never removed here; /home/kali lives in cyberlab_kali_home):"
docker system df -v --format '{{json .Volumes}}' 2>/dev/null \
    | node -e 'let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
        for (const v of JSON.parse(s || "[]")) console.log(`  ${v.Name.padEnd(28)} ${v.Size}`); })'

stopped="$(docker ps -aq --filter status=exited --filter status=created --filter label=com.docker.compose.project=$LAB_PROJECT;
           docker ps -aq --filter status=exited --filter status=created --filter label=com.docker.compose.project=cyberlab-sandbox)"
dangling="$(docker images -q --filter dangling=true)"
stale="$(stale_lab_images)"
others="$(docker ps -a --filter status=exited --format '{{.Names}} ({{.Image}})' \
    | grep -v -- '^cyberlab' || true)"

echo
echo "== Would remove with --apply"
echo "  stopped lab containers: $(echo "$stopped" | grep -c . || true)"
echo "  dangling images:        $(echo "$dangling" | grep -c . || true)"
echo "  Docker build cache not in use (docker builder prune)"
echo "  .next/cache (Next.js rebuilds it)"
echo "== Would also remove with --deep"
echo "  all Docker build cache (the next 'scripts/lab.sh pull/rebuild' rebuilds from scratch, with internet)"
echo "  npm's download cache (~/.npm/_cacache; npm install downloads again)"
if [ -n "$stale" ]; then
    echo "  old lab-stack images no lab uses:"
    echo "$stale" | awk '{ print "    " $2 " (" substr($1, 8, 12) ")" }'
else
    echo "  old lab-stack images no lab uses: none"
fi
if [ -n "$others" ]; then
    echo
    echo "Not ours, left alone (remove by hand if you want): stopped containers"
    echo "$others" | sed 's/^/  /'
fi

if ! $apply; then
    echo
    echo "Dry run: nothing was removed. Run with --apply (or --deep)."
    exit 0
fi

# ---------- Apply ----------

running="$(lab_running_labs)$(lab_foreign_running)"
if [ -n "$running" ]; then
    echo "A lab or another container is running: stop it first (scripts/lab.sh down <lab>)." >&2
    exit 5
fi
mkdir -p "$(dirname "$LAB_LOCK")"
exec 9>"$LAB_LOCK"
flock -n 9 || { echo "A lab operation is running. Try again when it finishes." >&2; exit 4; }

before="$(used_bytes)"
echo
echo "== Removing"
[ -n "$stopped" ] && docker rm $stopped >/dev/null && echo "stopped lab containers removed"
docker image prune -f | tail -n1
if $deep; then
    docker builder prune --all -f | tail -n1
else
    docker builder prune -f | tail -n1
fi
if curl -fsS -o /dev/null --max-time 2 http://127.0.0.1:3000/ 2>/dev/null; then
    echo ".next/cache kept: the platform is running"
else
    rm -rf .next/cache && echo ".next/cache removed"
fi
if $deep; then
    npm cache clean --force 2>/dev/null && echo "npm download cache removed"
    if [ -n "$stale" ]; then
        echo "Old lab-stack images to remove:"
        echo "$stale" | awk '{ print "  " $2 }'
        read -r -p "Type 'remove' to confirm: " answer
        if [ "$answer" = remove ]; then
            echo "$stale" | awk '{ print $1 }' | xargs -r docker rmi >/dev/null && echo "old images removed"
        else
            echo "old images kept"
        fi
    fi
fi
if $use_sudo; then
    sudo apt-get clean && echo "apt cache removed"
    sudo journalctl --vacuum-size=100M 2>&1 | tail -n1
    sudo fstrim -v /
fi
after="$(used_bytes)"
echo
echo "Freed inside WSL: $(human $(( before > after ? before - after : 0 )))  (used now: $(human "$after"))"
$use_sudo || echo "Run 'sudo fstrim -v /' (or scripts/windows/compact-wsl.ps1) so Windows gets the space back."
