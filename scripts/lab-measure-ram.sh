#!/usr/bin/env bash
# Takes one RAM snapshot: per-container usage, WSL VM view and Windows view.
# Usage: scripts/lab-measure-ram.sh "<scenario label>"
# Append the output to docs/MEDICOES-RAM.md or keep it in a log.
set -euo pipefail
source "$(dirname "$0")/lab-common.sh"

label="${1:-snapshot}"

echo "### $label — $(date '+%Y-%m-%d %H:%M:%S')"
echo
echo '```'
echo "# docker stats (containers of project $LAB_PROJECT)"
ids="$(docker ps -q --filter "label=com.docker.compose.project=$LAB_PROJECT")"
if [ -n "$ids" ]; then
    # shellcheck disable=SC2086
    docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.MemPerc}}\t{{.CPUPerc}}' $ids
else
    echo "(no lab containers running)"
fi
echo
echo "# free -m (inside the WSL VM)"
free -m
if command -v powershell.exe >/dev/null 2>&1; then
    echo
    echo "# Windows view (vmmemWSL = what the whole WSL VM costs the PC)"
    powershell.exe -NoProfile -Command '
        $p = Get-Process -Name vmmem* -ErrorAction SilentlyContinue
        foreach ($x in $p) { "{0}: {1} MB" -f $x.ProcessName, [int]($x.WorkingSet64 / 1MB) }
        $o = Get-CimInstance Win32_OperatingSystem
        "Windows total: {0} MB, free: {1} MB" -f [int]($o.TotalVisibleMemorySize / 1KB), [int]($o.FreePhysicalMemory / 1KB)
    ' | tr -d '\r'
fi
echo '```'
