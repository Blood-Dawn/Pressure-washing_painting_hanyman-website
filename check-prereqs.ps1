# =============================================================================
# check-prereqs.ps1
#
# Run this script before starting the project to verify your machine has
# everything it needs. It checks only - it installs nothing.
#
# HOW TO RUN:
#   Open PowerShell 7 in the project folder and run:
#   .\check-prereqs.ps1
#
#   If you get a script execution error, run this first (one time only):
#   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
# =============================================================================

# ── Color helpers ─────────────────────────────────────────────────────────────

function Write-Pass   { param($msg) Write-Host "  [PASS] $msg" -ForegroundColor Green  }
function Write-Fail   { param($msg) Write-Host "  [MISS] $msg" -ForegroundColor Red    }
function Write-Warn   { param($msg) Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-Detail { param($msg) Write-Host "         $msg" -ForegroundColor Gray   }
function Write-Header { param($msg) Write-Host "`n$msg" -ForegroundColor Cyan          }

# Track overall result
$missing  = [System.Collections.Generic.List[string]]::new()
$warnings = [System.Collections.Generic.List[string]]::new()

# ─────────────────────────────────────────────────────────────────────────────

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Project Prerequisites Check" -ForegroundColor Cyan
Write-Host "  Handyman & Landscaping Website" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan


# =============================================================================
# 1. POWERSHELL VERSION
# =============================================================================
Write-Header "1. PowerShell"

$psVersion = $PSVersionTable.PSVersion
$psMajor   = $psVersion.Major

if ($psMajor -ge 7) {
    Write-Pass "PowerShell $($psVersion.ToString())"
} elseif ($psMajor -ge 5) {
    Write-Warn "PowerShell $($psVersion.ToString()) is installed, but version 7+ is recommended"
    Write-Detail "Download: https://github.com/PowerShell/PowerShell/releases/latest"
    $warnings.Add("PowerShell 7+ (you have $($psVersion.ToString()))")
} else {
    Write-Fail "PowerShell version too old: $($psVersion.ToString())"
    $missing.Add("PowerShell 7+ (download: https://github.com/PowerShell/PowerShell/releases/latest)")
}


# =============================================================================
# 2. NODE.JS  (required: 18+)
# =============================================================================
Write-Header "2. Node.js  (required: version 18 or higher)"

$nodeCmd = Get-Command node -ErrorAction SilentlyContinue

if ($null -eq $nodeCmd) {
    Write-Fail "Node.js not found"
    Write-Detail "Download: https://nodejs.org  (choose the LTS version)"
    $missing.Add("Node.js 18+  ->  https://nodejs.org")
} else {
    # node --version returns "v20.11.1" - strip the leading v and split on dots
    $nodeRaw     = (node --version 2>$null).TrimStart('v')
    $nodeParts   = $nodeRaw -split '\.'
    $nodeMajor   = [int]$nodeParts[0]

    if ($nodeMajor -ge 18) {
        Write-Pass "Node.js v$nodeRaw"
        Write-Detail "Path: $($nodeCmd.Source)"
    } elseif ($nodeMajor -ge 16) {
        Write-Warn "Node.js v$nodeRaw is installed but this project requires version 18+"
        Write-Detail "Upgrade at: https://nodejs.org"
        $warnings.Add("Node.js needs upgrading (you have v$nodeRaw, need 18+)  ->  https://nodejs.org")
    } else {
        Write-Fail "Node.js v$nodeRaw is too old (need 18+)"
        Write-Detail "Upgrade at: https://nodejs.org"
        $missing.Add("Node.js 18+  (you have v$nodeRaw)  ->  https://nodejs.org")
    }
}


# =============================================================================
# 3. NPM  (comes bundled with Node.js)
# =============================================================================
Write-Header "3. npm  (comes with Node.js)"

$npmCmd = Get-Command npm -ErrorAction SilentlyContinue

if ($null -eq $npmCmd) {
    Write-Fail "npm not found (it should come with Node.js - try reinstalling Node)"
    $missing.Add("npm  (reinstall Node.js from https://nodejs.org to get npm)")
} else {
    $npmVersion = (npm --version 2>$null).Trim()
    Write-Pass "npm v$npmVersion"
    Write-Detail "Path: $($npmCmd.Source)"
}


# =============================================================================
# 4. GIT  (required for version control and GitHub upload)
# =============================================================================
Write-Header "4. Git  (required for version control and GitHub upload)"

$gitCmd = Get-Command git -ErrorAction SilentlyContinue

if ($null -eq $gitCmd) {
    Write-Fail "Git not found"
    Write-Detail "Download: https://git-scm.com/downloads"
    Write-Detail "During install, choose 'Git from the command line and also from 3rd-party software'"
    $missing.Add("Git  ->  https://git-scm.com/downloads")
} else {
    # git --version returns "git version 2.44.0.windows.1"
    $gitRaw     = (git --version 2>$null)
    $gitVersion = ($gitRaw -replace 'git version ', '').Trim()
    Write-Pass "Git $gitVersion"
    Write-Detail "Path: $($gitCmd.Source)"

    # Check if git user identity is configured (needed for commits)
    $gitUser  = (git config --global user.name  2>$null).Trim()
    $gitEmail = (git config --global user.email 2>$null).Trim()

    if ($gitUser -and $gitEmail) {
        Write-Detail "Git identity: $gitUser <$gitEmail>"
    } else {
        Write-Warn "Git user identity is not set up"
        Write-Detail "Run these two commands to set it up:"
        Write-Detail "  git config --global user.name  `"Your Name`""
        Write-Detail "  git config --global user.email `"you@example.com`""
        $warnings.Add("Git identity not configured (name/email needed to make commits)")
    }
}


# =============================================================================
# 5. INTERNET CONNECTIVITY
#    Checks reachability of the three external services this project depends on
# =============================================================================
Write-Header "5. Internet connectivity  (Supabase, SendGrid, Vercel)"

$services = @(
    @{ Name = "Supabase (database)"; Host = "supabase.com";   Port = 443 },
    @{ Name = "SendGrid (email)";    Host = "sendgrid.com";   Port = 443 },
    @{ Name = "Vercel (hosting)";    Host = "vercel.com";     Port = 443 },
    @{ Name = "GitHub";              Host = "github.com";     Port = 443 }
)

foreach ($svc in $services) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        # ConnectAsync with a 3-second timeout
        $connect = $tcp.ConnectAsync($svc.Host, $svc.Port)
        $timedOut = -not $connect.Wait(3000)
        $tcp.Close()

        if ($timedOut -or -not $connect.IsCompletedSuccessfully) {
            Write-Warn "$($svc.Name) - could not reach $($svc.Host)"
            $warnings.Add("Could not reach $($svc.Host) - check your internet connection or firewall")
        } else {
            Write-Pass "$($svc.Name) - reachable"
        }
    } catch {
        Write-Warn "$($svc.Name) - could not reach $($svc.Host)"
        $warnings.Add("Could not reach $($svc.Host) - check your internet connection")
    }
}


# =============================================================================
# 6. .ENV.LOCAL FILE
#    Warns if the file has not been created from .env.example yet
# =============================================================================
Write-Header "6. Environment variables file  (.env.local)"

$envFile    = Join-Path $PSScriptRoot ".env.local"
$envExample = Join-Path $PSScriptRoot ".env.example"

if (Test-Path $envFile) {
    # File exists - check that none of the values are still the placeholder text
    $envContent   = Get-Content $envFile -Raw
    $placeholders = @(
        "your-project.supabase.co",
        "your-anon-key-here",
        "your-service-role-key-here",
        "generate-a-random-string-here",
        "SG.your-api-key-here",
        "your-email@example.com"
    )

    $unfilled = $placeholders | Where-Object { $envContent -match [regex]::Escape($_) }

    if ($unfilled.Count -eq 0) {
        Write-Pass ".env.local exists and appears to be filled in"
    } else {
        Write-Warn ".env.local exists but still has placeholder values"
        foreach ($p in $unfilled) {
            Write-Detail "Still a placeholder: $p"
        }
        $warnings.Add(".env.local has $($unfilled.Count) value(s) that still need to be filled in")
    }
} else {
    Write-Warn ".env.local does not exist yet"
    Write-Detail "Copy .env.example to .env.local and fill in your real values:"
    Write-Detail "  Copy-Item .env.example .env.local"
    $warnings.Add(".env.local not created yet - copy from .env.example and fill in your keys")
}


# =============================================================================
# 7. NODE_MODULES
#    Checks if npm install has been run
# =============================================================================
Write-Header "7. Node modules  (npm install)"

$nodeModules = Join-Path $PSScriptRoot "node_modules"

if (Test-Path $nodeModules) {
    # Count top-level package folders as a sanity check
    $pkgCount = (Get-ChildItem $nodeModules -Directory -ErrorAction SilentlyContinue).Count
    Write-Pass "node_modules exists ($pkgCount packages installed)"
} else {
    Write-Warn "node_modules not found - dependencies not installed yet"
    Write-Detail "Run this in the project folder to install:"
    Write-Detail "  npm install"
    $warnings.Add("Run 'npm install' to install project dependencies")
}


# =============================================================================
# 8. OPTIONAL: VS CODE
# =============================================================================
Write-Header "8. VS Code  (optional, recommended editor)"

$codeCmd = Get-Command code -ErrorAction SilentlyContinue

if ($null -ne $codeCmd) {
    $codeVersion = (code --version 2>$null | Select-Object -First 1).Trim()
    Write-Pass "VS Code $codeVersion"
    Write-Detail "Path: $($codeCmd.Source)"
} else {
    Write-Host "  [    ] VS Code not found (optional)" -ForegroundColor DarkGray
    Write-Detail "Download if you want it: https://code.visualstudio.com"
}


# =============================================================================
# SUMMARY
# =============================================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SUMMARY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if ($missing.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host ""
    Write-Host "  Everything looks good. You are ready to run the project." -ForegroundColor Green
    Write-Host ""
    Write-Host "  Next step: run 'npm run dev' in this folder." -ForegroundColor Green
    Write-Host ""
} else {

    if ($missing.Count -gt 0) {
        Write-Host ""
        Write-Host "  REQUIRED - must be installed before the project will run:" -ForegroundColor Red
        foreach ($item in $missing) {
            Write-Host "    - $item" -ForegroundColor Red
        }
    }

    if ($warnings.Count -gt 0) {
        Write-Host ""
        Write-Host "  ACTION NEEDED - project may not work correctly until these are addressed:" -ForegroundColor Yellow
        foreach ($item in $warnings) {
            Write-Host "    - $item" -ForegroundColor Yellow
        }
    }

    Write-Host ""
    if ($missing.Count -gt 0) {
        Write-Host "  Come back and re-run this script after you have installed the missing items." -ForegroundColor Cyan
    } else {
        Write-Host "  No required items are missing. Address the warnings above when ready." -ForegroundColor Cyan
    }
    Write-Host ""
}
