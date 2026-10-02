<#
.SYNOPSIS
  Gives the space freed inside WSL back to Windows: cleans WSL and Docker,
  then makes the WSL virtual disk (ext4.vhdx) sparse or compacts it.
  Phase 8, decision D5 (docs/MANUTENCAO.md).

.DESCRIPTION
  Run it from Windows PowerShell, never from inside WSL (it shuts WSL down):

    powershell -ExecutionPolicy Bypass -File \\wsl.localhost\Ubuntu\home\mesquitxx\projetos\plataforma-cyber\scripts\windows\compact-wsl.ps1 -Check
    powershell -ExecutionPolicy Bypass -File \\wsl.localhost\Ubuntu\home\mesquitxx\projetos\plataforma-cyber\scripts\windows\compact-wsl.ps1

  Steps:
    1. Refuses if a lab is running (stop it in the platform or with scripts/lab.sh down).
    2. Inside WSL: database backup copied to Windows, /home/kali backup,
       scripts/disk-cleanup.sh --apply, and as root apt-get clean, journal vacuum
       and fstrim.
    3. wsl --shutdown.
    4. Sparse VHD (preferred): wsl --manage <distro> --set-sparse true, then one
       more fstrim so Windows deallocates the free blocks. If this WSL version
       refuses it or asks for --allow-unsafe, the script does NOT force it
       (MESQUITA's decision D5) and falls back to:
    5. Manual compaction (needs an elevated PowerShell): Optimize-VHD when
       Hyper-V is installed, otherwise diskpart "compact vdisk".
    6. Prints the disk size before and after. WSL stays off; open Ubuntu again
       when you want.

  -Check        read-only: sizes, sparse flag, labs running, admin rights; changes nothing
  -SkipCleanup  skip step 2 (e.g. when re-running elevated just to compact)
  -Yes          do not ask for confirmation
  -Distro / -ProjectPath  only needed if the script is not run from \\wsl.localhost\...
#>
param(
    [string]$Distro,
    [string]$ProjectPath,
    [switch]$Check,
    [switch]$SkipCleanup,
    [switch]$Yes
)

$ErrorActionPreference = 'Stop'
$env:WSL_UTF8 = '1'              # wsl.exe prints UTF-8 instead of UTF-16
Set-Location $env:USERPROFILE    # this script may live on \\wsl.localhost, which goes away

# Distro and project path from this script's own UNC path:
# \\wsl.localhost\<distro>\<project>\scripts\windows
if ($PSScriptRoot -match '^\\\\wsl(?:\.localhost|\$)\\([^\\]+)(\\.+)\\scripts\\windows$') {
    if (-not $Distro) { $Distro = $Matches[1] }
    if (-not $ProjectPath) { $ProjectPath = $Matches[2] -replace '\\', '/' }
}
if (-not $Distro -or -not $ProjectPath) {
    throw 'Run this script from \\wsl.localhost\<distro>\...\scripts\windows, or pass -Distro and -ProjectPath.'
}

function Step([string]$Text) { Write-Host "`n== $Text" -ForegroundColor Cyan }

function Invoke-WslBash([string]$Command, [switch]$Root) {
    $wslArgs = @('-d', $Distro)
    if ($Root) { $wslArgs += @('-u', 'root') }
    $wslArgs += @('--', 'bash', '-lc', $Command)
    & wsl.exe @wslArgs | Out-Host
    return $LASTEXITCODE
}

function Get-DistroVhd {
    $lxss = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Lxss'
    foreach ($key in Get-ChildItem $lxss) {
        $p = Get-ItemProperty $key.PSPath
        if ($p.DistributionName -eq $Distro) {
            $name = if ($p.VhdFileName) { $p.VhdFileName } else { 'ext4.vhdx' }
            return Join-Path ($p.BasePath -replace '^\\\\\?\\', '') $name
        }
    }
    throw "Distro '$Distro' not found in the WSL registry."
}

Add-Type -Namespace Win32 -Name Disk -MemberDefinition @'
[DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
public static extern uint GetCompressedFileSizeW(string lpFileName, out uint lpFileSizeHigh);
'@

# Bytes the file really occupies on disk (less than its length when sparse).
function Get-AllocatedBytes([string]$Path) {
    $high = [uint32]0
    $low = [Win32.Disk]::GetCompressedFileSizeW($Path, [ref]$high)
    return ([uint64]$high -shl 32) + [uint64]$low
}

function Test-Sparse([string]$Path) {
    return [bool]((Get-Item -LiteralPath $Path).Attributes -band [IO.FileAttributes]::SparseFile)
}

function Format-GB([uint64]$Bytes) { '{0:N2} GB' -f ($Bytes / 1GB) }

function Show-Disk([string]$Label) {
    $allocated = Get-AllocatedBytes $vhd
    $free = (Get-PSDrive -Name ($vhd.Substring(0, 1))).Free
    Write-Host ("{0}: VHDX occupies {1} on disk (length {2}), sparse: {3}; free on {4} {5}" -f `
        $Label, (Format-GB $allocated), (Format-GB (Get-Item -LiteralPath $vhd).Length),
        (Test-Sparse $vhd), $vhd.Substring(0, 2), (Format-GB $free))
    return $allocated
}

function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    return ([Security.Principal.WindowsPrincipal]$id).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-DistroRunning {
    $running = (& wsl.exe -l --running -q 2>$null) | ForEach-Object { $_.Trim() }
    return $running -contains $Distro
}

function Stop-Wsl {
    & wsl.exe --shutdown
    for ($i = 0; $i -lt 30 -and (Test-DistroRunning); $i++) { Start-Sleep -Seconds 2 }
    if (Test-DistroRunning) { throw 'WSL did not stop.' }
}

$vhd = Get-DistroVhd
Write-Host "Distro: $Distro | project: $ProjectPath"
Write-Host "VHDX:   $vhd"
Write-Host ("WSL:    {0}" -f ((& wsl.exe --version 2>$null | Select-Object -First 1)))

Step 'Before'
$before = Show-Disk 'Before'

# Labs running? (scripts/lab.sh status: name, project, service, state, ...)
$status = & wsl.exe -d $Distro -- bash -lc "cd '$ProjectPath' && scripts/lab.sh status"
$running = @($status | Where-Object { ($_ -split "`t")[3] -eq 'running' })
$platform = @(Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue).Count -gt 0
$admin = Test-Admin
$optimize = [bool](Get-Command Optimize-VHD -ErrorAction SilentlyContinue)
Write-Host "Running lab containers: $($running.Count) | platform on 3000: $platform | elevated: $admin | Optimize-VHD available: $optimize"

if ($Check) {
    Write-Host "`n-Check: nothing was changed."
    if (-not (Test-Sparse $vhd)) {
        Write-Host "The VHDX is not sparse: a normal run will try 'wsl --manage $Distro --set-sparse true' (never with --allow-unsafe)."
    }
    exit 0
}

if ($running.Count -gt 0) {
    Write-Host "A lab is running. Stop it first (platform, or: scripts/lab.sh down <lab>)." -ForegroundColor Yellow
    exit 5
}
if (-not $Yes) {
    $warn = if ($platform) { ' The platform (npm run dev) is running and will be stopped too.' } else { '' }
    $answer = Read-Host "This shuts WSL down (all your WSL terminals close).$warn Continue? [y/N]"
    if ($answer -notmatch '^(y|yes|s|sim)$') { Write-Host 'Cancelled.'; exit 1 }
}

if (-not $SkipCleanup) {
    Step 'Backups and cleanup inside WSL'
    $code = Invoke-WslBash "cd '$ProjectPath' && npm run -s db:backup -- --windows && scripts/lab.sh backup-home && scripts/disk-cleanup.sh --apply"
    if ($code -ne 0) { throw "Backups or cleanup failed (exit $code): nothing was compacted." }
    $code = Invoke-WslBash 'apt-get clean && journalctl --vacuum-size=100M >/dev/null; fstrim -av' -Root
    if ($code -ne 0) { Write-Host "Warning: root cleanup/fstrim returned $code" -ForegroundColor Yellow }
}

Step 'Stopping WSL'
Stop-Wsl

$method = $null
if (Test-Sparse $vhd) {
    $method = 'sparse (already)'
} else {
    Step "Making the VHDX sparse: wsl --manage $Distro --set-sparse true"
    $out = (& wsl.exe --manage $Distro --set-sparse true 2>&1 | Out-String).Trim()
    $code = $LASTEXITCODE
    if ($out) { Write-Host $out }
    if ($out -match 'allow-unsafe') {
        # Decision D5: never force it. Ask MESQUITA before ever using --allow-unsafe.
        Write-Host 'This WSL version only allows sparse VHDs with --allow-unsafe. Not using it (decision D5); falling back to manual compaction.' -ForegroundColor Yellow
    } elseif ($code -ne 0) {
        Write-Host "--set-sparse failed (exit $code); falling back to manual compaction." -ForegroundColor Yellow
    } elseif (Test-Sparse $vhd) {
        $method = 'sparse (set now)'
    }
}

if ($method) {
    Step 'Releasing free blocks (fstrim on the sparse disk)'
    $code = Invoke-WslBash 'fstrim -av' -Root
    if ($code -ne 0) { Write-Host "Warning: fstrim returned $code" -ForegroundColor Yellow }
    Stop-Wsl
} else {
    Step 'Manual compaction'
    if (-not $admin) {
        Write-Host 'Manual compaction needs an elevated PowerShell (Run as administrator). Run again with:' -ForegroundColor Yellow
        Write-Host "  powershell -ExecutionPolicy Bypass -File `"$PSCommandPath`" -SkipCleanup"
        $null = Show-Disk 'Now'
        exit 3
    }
    if ($optimize) {
        Optimize-VHD -Path $vhd -Mode Full
        $method = 'Optimize-VHD'
    } else {
        $script = Join-Path $env:TEMP 'compact-wsl-diskpart.txt'
        @("select vdisk file=`"$vhd`"", 'attach vdisk readonly', 'compact vdisk', 'detach vdisk', 'exit') |
            Set-Content -Path $script -Encoding ASCII
        & diskpart.exe /s $script | Out-Host
        Remove-Item $script -ErrorAction SilentlyContinue
        if ($LASTEXITCODE -ne 0) { throw "diskpart failed (exit $LASTEXITCODE)" }
        $method = 'diskpart compact vdisk'
    }
}

Step 'After'
$after = Show-Disk 'After'
$freed = if ($before -gt $after) { $before - $after } else { 0 }
Write-Host ("Method: {0}. Windows got back {1}." -f $method, (Format-GB $freed)) -ForegroundColor Green
Write-Host 'WSL is off. Open Ubuntu again when you want; the labs start as before.'
