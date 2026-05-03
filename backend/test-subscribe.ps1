$body = @{
  email = "test@example.com"
  interests = @("All Updates", "Robotics")
  source = "manual-test"
  consent_version = "signals-v1"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://signals.lknzmzd.xyz/subscribe" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{ Origin = "https://lknzmzd.xyz" } `
  -Body $body
