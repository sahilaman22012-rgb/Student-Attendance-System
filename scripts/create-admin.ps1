$ErrorActionPreference = "Stop"
$PSNativeCommandUseErrorActionPreference = $false

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Push-Location $repoRoot

$savedAdminEmail = $env:BOOTSTRAP_ADMIN_EMAIL
$savedAdminPassword = $env:BOOTSTRAP_ADMIN_PASSWORD
$email = $null
$password = $null
$confirmedPassword = $null
$securePassword = $null
$confirmPassword = $null
$passwordPointer = [IntPtr]::Zero
$confirmPointer = [IntPtr]::Zero

try {
    $composeJson = docker compose config --format json
    if ($LASTEXITCODE -ne 0) {
        throw "Could not read the resolved Compose configuration."
    }

    try {
        $composeConfig = $composeJson | ConvertFrom-Json
    }
    catch {
        throw "Could not parse the resolved Compose configuration."
    }

    $databasePassword = [string]$composeConfig.services.db.environment.POSTGRES_PASSWORD
    if ([string]::IsNullOrWhiteSpace($databasePassword)) {
        throw "Compose resolved an empty database password."
    }

    Write-Host "Checking the existing database container..."
    $databaseId = docker compose ps -q db
    if ($LASTEXITCODE -ne 0) {
        throw "Could not inspect the database container."
    }
    if ([string]::IsNullOrWhiteSpace($databaseId)) {
        docker compose up -d db
    }
    else {
        $databaseState = docker inspect --format '{{.State.Status}}' $databaseId 2>$null
        if ($LASTEXITCODE -eq 0 -and $databaseState.Trim() -ne "running") {
            docker compose start db
        }
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Could not start the database. The persistent database volume was not removed."
    }

    $databaseReady = $false
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        docker compose exec -T db pg_isready -U attendiq -d attendiq *> $null
        if ($LASTEXITCODE -eq 0) {
            $databaseReady = $true
            break
        }
        Start-Sleep -Seconds 2
    }
    if (-not $databaseReady) {
        throw "The database did not become ready. No database volume was removed."
    }

    $sqlPassword = $databasePassword.Replace("'", "''")
    $sql = "ALTER ROLE attendiq WITH PASSWORD '$sqlPassword';"
    docker compose exec -T db psql -U attendiq -d attendiq -v ON_ERROR_STOP=1 -c $sql *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "Could not synchronize the database role password. The database volume was not removed."
    }
    $sql = $null
    $sqlPassword = $null
    $databasePassword = $null

    Write-Host "Verifying a fresh backend-to-database connection before restarting the API..."
    docker compose run --rm --no-deps backend python -c "from sqlalchemy import text; from app.db.session import engine; c=engine.connect(); assert c.execute(text('SELECT 1')).scalar_one()==1; c.close()" *> $null
    if ($LASTEXITCODE -ne 0) {
        throw "A fresh backend container could not connect to PostgreSQL. The backend was not recreated and no admin was created."
    }

    Write-Host "Restarting only the backend so it uses the current database settings..."
    docker compose up -d --no-deps --force-recreate backend
    if ($LASTEXITCODE -ne 0) {
        throw "Could not restart the backend."
    }

    $backendId = docker compose ps -q backend
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($backendId)) {
        throw "The backend container was not created."
    }

    $backendReady = $false
    for ($attempt = 0; $attempt -lt 45; $attempt++) {
        $healthStatus = docker inspect --format '{{.State.Health.Status}}' $backendId 2>$null
        if ($LASTEXITCODE -eq 0 -and $healthStatus.Trim() -eq "healthy") {
            $backendReady = $true
            break
        }
        Start-Sleep -Seconds 2
    }
    if (-not $backendReady) {
        docker compose ps -a
        docker compose logs --tail 60 backend
        throw "The backend did not become healthy. No administrator was created."
    }

    Write-Host "Database and backend connection verified. Now create the first administrator."
    $email = (Read-Host "Administrator email").Trim()
    if ($email -notmatch '^[^@\s]+@[^@\s]+\.[^@\s]+$') {
        throw "Enter a valid email address."
    }

    $securePassword = Read-Host "Choose an administrator password (12-72 UTF-8 bytes)" -AsSecureString
    $confirmPassword = Read-Host "Enter the same password again" -AsSecureString
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $confirmPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($confirmPassword)
    $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $confirmedPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($confirmPointer)

    if ($password -cne $confirmedPassword) {
        throw "The passwords did not match. No administrator was created."
    }

    $passwordBytes = [Text.Encoding]::UTF8.GetByteCount($password)
    if ($passwordBytes -lt 12 -or $passwordBytes -gt 72) {
        throw "Password must be between 12 and 72 UTF-8 bytes."
    }

    $env:BOOTSTRAP_ADMIN_EMAIL = $email
    $env:BOOTSTRAP_ADMIN_PASSWORD = $password
    docker compose exec -T `
        -e BOOTSTRAP_ADMIN_EMAIL `
        -e BOOTSTRAP_ADMIN_PASSWORD `
        backend python -m app.db.bootstrap_admin
    if ($LASTEXITCODE -ne 0) {
        throw "Administrator creation failed. The backend-to-database connection was verified first."
    }

    Write-Host "Administrator created successfully. Open http://localhost:8080 to sign in."
}
finally {
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    if ($confirmPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($confirmPointer)
    }
    if ($securePassword) {
        $securePassword.Dispose()
    }
    if ($confirmPassword) {
        $confirmPassword.Dispose()
    }
    $password = $null
    $confirmedPassword = $null
    $env:BOOTSTRAP_ADMIN_EMAIL = $savedAdminEmail
    $env:BOOTSTRAP_ADMIN_PASSWORD = $savedAdminPassword
    Pop-Location
}
