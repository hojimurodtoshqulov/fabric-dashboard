# Registers a daily Windows Task Scheduler job for the 1C sync agent.
# Run time comes from SYNC_TIME in .env (default 07:00).
# Usage: install-schedule.bat            — install / update
#        install-schedule.bat -Remove    — uninstall

param([switch]$Remove)

$ErrorActionPreference = "Stop"
$TaskName = "Selxozmash 1C Sync"
$AgentDir = $PSScriptRoot

if ($Remove) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Task '$TaskName' o'chirildi."
    exit 0
}

if (-not (Test-Path (Join-Path $AgentDir ".env"))) {
    Write-Host "XATO: .env fayl topilmadi. Avval .env.example dan nusxa olib to'ldiring." -ForegroundColor Red
    exit 1
}

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
    Write-Host "XATO: Node.js topilmadi. nodejs.org dan LTS versiyasini o'rnating." -ForegroundColor Red
    exit 1
}

$syncTime = "07:00"
$line = Get-Content (Join-Path $AgentDir ".env") | Where-Object { $_ -match '^\s*SYNC_TIME\s*=' } | Select-Object -First 1
if ($line) { $syncTime = ($line -split '=', 2)[1].Trim() }
if ($syncTime -notmatch '^\d{1,2}:\d{2}$') {
    Write-Host "XATO: SYNC_TIME noto'g'ri formatda: '$syncTime' (masalan 07:00)" -ForegroundColor Red
    exit 1
}

$action   = New-ScheduledTaskAction -Execute $node -Argument "`"$AgentDir\index.js`"" -WorkingDirectory $AgentDir
$trigger  = New-ScheduledTaskTrigger -Daily -At $syncTime
# StartWhenAvailable: if the PC was off at SYNC_TIME, run as soon as it is turned on.
$settings = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 30) `
    -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings `
    -Description "SELXOZMASH: 1C dan savdo va qarzlarni har kuni Fabric Automation'ga yuborish" -Force | Out-Null

Write-Host ""
Write-Host "Tayyor! '$TaskName' har kuni soat $syncTime da ishga tushadi." -ForegroundColor Green
Write-Host "Kompyuter o'sha paytda o'chiq bo'lsa - yoqilganda avtomatik ishlaydi."
Write-Host "Loglar: $AgentDir\logs\"
Write-Host ""
Write-Host "Hozir sinab ko'rish:  schtasks /run /tn `"$TaskName`""
