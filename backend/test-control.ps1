# LKNZMZD Signals V2.7 control endpoint tests
# Usage from backend folder:
#   $env:LKNZMZD_SIGNALS_ADMIN_TOKEN="your-admin-token"
#   .\test-control.ps1

$BaseUrl = "https://signals.lknzmzd.xyz"
$AdminToken = $env:LKNZMZD_SIGNALS_ADMIN_TOKEN

Write-Host "[1] Health" -ForegroundColor Cyan
Invoke-RestMethod -Uri "$BaseUrl/health"

Write-Host "[2] Public count" -ForegroundColor Cyan
Invoke-RestMethod -Uri "$BaseUrl/count"

Write-Host "[3] Subscribe test" -ForegroundColor Cyan
$body = @{
  email = "control-test@example.com"
  interests = @("All Updates", "Tools")
  source = "v2.7-control-test"
  consent_version = "signals-v1"
} | ConvertTo-Json
Invoke-RestMethod -Uri "$BaseUrl/subscribe" -Method POST -ContentType "application/json" -Headers @{ Origin = "https://lknzmzd.xyz" } -Body $body

Write-Host "[4] Unsubscribe test" -ForegroundColor Cyan
$unsub = @{ email = "control-test@example.com"; source = "v2.7-control-test" } | ConvertTo-Json
Invoke-RestMethod -Uri "$BaseUrl/unsubscribe" -Method POST -ContentType "application/json" -Headers @{ Origin = "https://lknzmzd.xyz" } -Body $unsub

if ($AdminToken) {
  Write-Host "[5] Admin counts" -ForegroundColor Cyan
  Invoke-RestMethod -Uri "$BaseUrl/admin/counts" -Headers @{ Authorization = "Bearer $AdminToken" }

  Write-Host "[6] CSV export to lknzmzd-signals-active.csv" -ForegroundColor Cyan
  curl.exe -L -H "Authorization: Bearer $AdminToken" "$BaseUrl/admin/export?format=csv&status=active" -o lknzmzd-signals-active.csv
} else {
  Write-Host "Skipping admin tests. Set `$env:LKNZMZD_SIGNALS_ADMIN_TOKEN first." -ForegroundColor Yellow
}
