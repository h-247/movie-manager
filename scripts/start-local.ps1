# Start Movie Watchlist Manager on a dynamically detected free port
$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path "$PSScriptRoot\..").Path
Set-Location $repoRoot

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "🎬 Movie Watchlist Manager - Local Server Launcher" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Function to find the next available TCP port
function Get-AvailablePort([int]$startPort = 3000) {
    $port = $startPort
    while ($port -lt 65535) {
        $inUse = $false

        # Check existing active connections / listening ports
        $tcpConn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($tcpConn) {
            $inUse = $true
        } else {
            # Try binding to verify the port is completely free
            try {
                $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)
                $listener.Start()
                $listener.Stop()
            } catch {
                $inUse = $true
            }
        }

        if (-not $inUse) {
            return $port
        }
        $port++
    }
    throw "No available port found."
}

# 1. Ensure local D1 database is ready
Write-Host "`n[1/3] Checking local D1 database..." -ForegroundColor Yellow
if (-not (Test-Path ".wrangler\state\v3\d1")) {
    Write-Host "Initializing local database migrations..." -ForegroundColor Gray
    cmd.exe /c "npm run db:migrate" | Out-Null
}
Write-Host "Local D1 database is ready." -ForegroundColor Green

# 2. Find available port
Write-Host "`n[2/3] Detecting available port..." -ForegroundColor Yellow
$freePort = Get-AvailablePort 3000
Write-Host "Found available port: $freePort (no conflict)" -ForegroundColor Green

$url = "http://localhost:$freePort"
Write-Host "`n[3/3] Starting Movie Watchlist Manager on $url..." -ForegroundColor Cyan

# Schedule browser launch
Start-Job -ScriptBlock {
    param($targetUrl)
    Start-Sleep -Seconds 2
    Start-Process $targetUrl
} -ArgumentList $url | Out-Null

Write-Host "`n==================================================" -ForegroundColor Green
Write-Host "🚀 Server is running at: $url" -ForegroundColor Green
Write-Host "   Press Ctrl+C to stop the server" -ForegroundColor Green
Write-Host "==================================================`n" -ForegroundColor Green

# Start dev server on the free port
npx vinext dev -p $freePort
