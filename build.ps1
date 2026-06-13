#!/usr/bin/env pwsh
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ROOT_DIR   = Get-Location
$BP_DIR     = Join-Path $ROOT_DIR "ExNihilo_BP"
$RP_DIR     = Join-Path $ROOT_DIR "ExNihilo_RP"
$DIST_DIR   = Join-Path $ROOT_DIR "dist"
$STAGING_DIR = Join-Path $DIST_DIR "staging"

$manifest   = Get-Content (Join-Path $BP_DIR "manifest.json") | ConvertFrom-Json
$BP_VERSION = $manifest.header.version

$ARCHIVE_PATH  = Join-Path $DIST_DIR "ExNihilo_Bedrock-${BP_VERSION}.zip"
$MCADDON_PATH  = Join-Path $DIST_DIR "ExNihilo_Bedrock-${BP_VERSION}.mcaddon"

Write-Host "[1/5] Installing BP dependencies (if needed) and compiling TypeScript..."
if (-not (Test-Path (Join-Path $ROOT_DIR "node_modules"))) {
    npm install
}
npm run build

Write-Host "[2/5] Preparing clean staging directory..."
if (Test-Path $STAGING_DIR) { Remove-Item $STAGING_DIR -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $STAGING_DIR "ExNihilo_BP") | Out-Null
New-Item -ItemType Directory -Path (Join-Path $STAGING_DIR "ExNihilo_RP") | Out-Null

$excludesBP = @(
    ".git", ".idea", "node_modules", "src",
    "package.json", "package-lock.json", "tsconfig.json",
    "*.tsbuildinfo", ".DS_Store"
)

$excludesRP = @(".git", ".idea", "node_modules", ".DS_Store", "texts\*.json")

function Copy-Filtered {
    param(
        [string]$Source,
        [string]$Destination,
        [string[]]$Exclude
    )
    Get-ChildItem -Path $Source -Recurse |
        Where-Object {
            $item = $_
            -not ($Exclude | Where-Object {
                $item.FullName -like "*\$_*" -or $item.Name -like $_
            })
        } |
        ForEach-Object {
            $relative = $_.FullName.Substring($Source.Length).TrimStart('\', '/')
            $target   = Join-Path $Destination $relative
            if ($_.PSIsContainer) {
                New-Item -ItemType Directory -Path $target -Force | Out-Null
            } else {
                $targetDir = Split-Path $target -Parent
                if (-not (Test-Path $targetDir)) {
                    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
                }
                Copy-Item -Path $_.FullName -Destination $target -Force
            }
        }
}

Copy-Filtered -Source $BP_DIR -Destination (Join-Path $STAGING_DIR "ExNihilo_BP") -Exclude $excludesBP
Copy-Filtered -Source $RP_DIR -Destination (Join-Path $STAGING_DIR "ExNihilo_RP") -Exclude $excludesRP

Write-Host "[3/5] Converting JSON translations to .lang files..."
$TEXTS_SRC = Join-Path $RP_DIR "texts"
$TEXTS_DST = Join-Path $STAGING_DIR "ExNihilo_RP\texts"
New-Item -ItemType Directory -Path $TEXTS_DST -Force | Out-Null

# Copy languages.json as-is
Copy-Item (Join-Path $TEXTS_SRC "languages.json") (Join-Path $TEXTS_DST "languages.json") -Force

# Convert all other .json to .lang
Get-ChildItem -Path $TEXTS_SRC -Filter "*.json" | Where-Object { $_.BaseName -ne "languages" } | ForEach-Object {
    $jsonFile = $_.FullName
    $langFile = Join-Path $TEXTS_DST "$($_.BaseName).lang"
    $data = Get-Content $jsonFile -Raw | ConvertFrom-Json
    $lines = $data.PSObject.Properties | ForEach-Object {
        $value = $_.Value.Replace("`n", "\n")
        "$($_.Name)=$value"
    }
    $lines | Set-Content -Path $langFile -Encoding UTF8
    Write-Host "  Converted: $($_.Name) -> $($_.BaseName).lang"
}

Write-Host "[4/5] Copying LICENSE into BP and RP..."
Copy-Item (Join-Path $ROOT_DIR "LICENSE") (Join-Path $STAGING_DIR "ExNihilo_BP\LICENSE")
Copy-Item (Join-Path $ROOT_DIR "LICENSE") (Join-Path $STAGING_DIR "ExNihilo_RP\LICENSE")

if (-not (Test-Path $DIST_DIR)) { New-Item -ItemType Directory -Path $DIST_DIR | Out-Null }

Write-Host "[5/5] Creating archives..."
if (Test-Path $ARCHIVE_PATH) { Remove-Item $ARCHIVE_PATH }
if (Test-Path $MCADDON_PATH) { Remove-Item $MCADDON_PATH }
Compress-Archive -Path (Join-Path $STAGING_DIR "ExNihilo_BP"), (Join-Path $STAGING_DIR "ExNihilo_RP") `
                 -DestinationPath $ARCHIVE_PATH
Compress-Archive -Path (Join-Path $STAGING_DIR "ExNihilo_BP"), (Join-Path $STAGING_DIR "ExNihilo_RP") `
                 -DestinationPath $MCADDON_PATH

Write-Host "Done: $ARCHIVE_PATH"
Write-Host "Done: $MCADDON_PATH"
