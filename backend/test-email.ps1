$admin = Read-Host "ADMIN_TOKEN"
$base = "https://signals.lknzmzd.xyz"

Write-Host "Checking email status..."
Invoke-RestMethod -Uri "$base/admin/email/status" -Headers @{ Authorization = "Bearer $admin" }

$to = Read-Host "Test recipient email"
$body = @{
  to = $to
  subject = "LKNZMZD Signals — V2.7 test"
  title = "Email control layer online"
  preheader = "This is a controlled test send from LKNZMZD Signals V2.7."
  body_text = "This is a test from the LKNZMZD Signals email control layer.\n\nIf this arrived correctly, Resend + Cloudflare Worker + Supabase campaign logging are connected."
  cta_url = "https://lknzmzd.xyz/updates.html"
  cta_label = "Open Signals Feed"
} | ConvertTo-Json

Write-Host "Sending test email..."
Invoke-RestMethod `
  -Uri "$base/admin/email/test" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $admin" } `
  -Body $body
