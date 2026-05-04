# update_helper.ps1 — Swaps a staged update over the running installation.
# Spawned as a detached process by updater.py so it outlives the app.
#
# Usage (internal — called by updater.py):
#   powershell.exe -NonInteractive -ExecutionPolicy Bypass -File update_helper.ps1 <NewPath> <CurrentPath>
param(
    [Parameter(Mandatory)][string]$New,
    [Parameter(Mandatory)][string]$Current
)

# Give the parent process time to fully exit before touching its files.
Start-Sleep -Seconds 3

try {
    Copy-Item -Recurse -Force "$New\*" "$Current\"
    Start-Process -FilePath (Join-Path $Current "CVMAnalytics.exe")
} catch {
    # Swap failed — leave current installation intact, write error log.
    $log = Join-Path $env:LOCALAPPDATA "CVMAnalytics\update_error.log"
    $_ | Out-File -FilePath $log -Encoding utf8 -Append
}
