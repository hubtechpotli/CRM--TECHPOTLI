# Native PostgreSQL setup (Windows, no Docker)
# Run from PowerShell — you will be prompted for the postgres superuser password
# (the password you chose when PostgreSQL 16 was installed)

$ErrorActionPreference = "Stop"
$psql = "C:\Program Files\PostgreSQL\16\bin\psql.exe"

if (-not (Test-Path $psql)) {
    Write-Host "PostgreSQL 16 not found at $psql" -ForegroundColor Red
    Write-Host "Install from: winget install PostgreSQL.PostgreSQL.16"
    exit 1
}

Write-Host "Creating techpotli user and techpotli_os database..." -ForegroundColor Cyan
Write-Host "Enter the postgres superuser password when prompted." -ForegroundColor Yellow

& $psql -U postgres -h localhost -p 5432 -f "$PSScriptRoot\init-native-postgres.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Done! Update backend/.env with:" -ForegroundColor Green
    Write-Host "DATABASE_URL=postgresql://techpotli:techpotli@localhost:5432/techpotli_os?schema=public"
    Write-Host ""
    Write-Host "Then run:" -ForegroundColor Green
    Write-Host "  cd backend"
    Write-Host "  npx prisma migrate deploy"
    Write-Host "  npx prisma db seed"
}
