# TechPotli — one-command local start (no Docker required)
# Usage: .\scripts\start-local.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"

Write-Host "=== TechPotli Local Start ===" -ForegroundColor Cyan

# 1. Start embedded PostgreSQL in background if not already listening on 5433
$dbRunning = $false
try {
  $conn = Get-NetTCPConnection -LocalPort 5433 -State Listen -ErrorAction SilentlyContinue
  if ($conn) { $dbRunning = $true }
} catch { }

if (-not $dbRunning) {
  Write-Host "Starting embedded PostgreSQL on port 5433..." -ForegroundColor Yellow
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backend'; npm run db:start" -WindowStyle Normal
  Write-Host "Waiting 8s for database..." -ForegroundColor Gray
  Start-Sleep -Seconds 8
} else {
  Write-Host "PostgreSQL already running on 5433" -ForegroundColor Green
}

# 2. Run migrations
Write-Host "Applying database migrations..." -ForegroundColor Yellow
Push-Location $backend
npm run db:migrate
if ($LASTEXITCODE -ne 0) {
  Write-Host "Migration failed. Is the database running? Try: cd backend; npm run db:start" -ForegroundColor Red
  Pop-Location
  exit 1
}
Pop-Location

# 3. Start backend API
Write-Host "Starting backend API on :3001..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backend'; npm run start:dev" -WindowStyle Normal

Start-Sleep -Seconds 4

# 4. Start frontend
Write-Host "Starting frontend on :3000..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontend'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "=== Ready ===" -ForegroundColor Green
Write-Host "  App:     http://localhost:3000"
Write-Host "  API:     http://localhost:3001/api"
Write-Host "  Health:  http://localhost:3001/api/health"
Write-Host "  Swagger: http://localhost:3001/api/docs"
Write-Host "  Login:   admin@techpotli.com / Admin@123"
Write-Host ""
Write-Host "Optional (install separately for full AI/events):" -ForegroundColor Gray
Write-Host "  Ollama:  https://ollama.com  (then: ollama pull llama3.2)"
Write-Host "  Redis:   for cron jobs"
Write-Host "  Docker:  for full Kafka/Redpanda stack"
