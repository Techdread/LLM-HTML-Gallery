#!/usr/bin/env pwsh

Write-Host "🚀 Starting HTML generation import process..." -ForegroundColor Green

$onePageDir = Join-Path $PSScriptRoot "one-page"
$outputDir = Join-Path $PSScriptRoot "src\data\html-files"

Write-Host "📁 Source: $onePageDir" -ForegroundColor Cyan
Write-Host "📁 Output: $outputDir" -ForegroundColor Cyan

if (-not (Test-Path $onePageDir)) {
    Write-Host "❌ Source directory not found: $onePageDir" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
}

$processedCount = 0
$skippedCount = 0

function Generate-Id {
    param($projectName, $modelName)
    
    $cleanProject = $projectName -replace '[^a-zA-Z0-9]+', '-' -replace '^-+|-+$', ''
    $cleanModel = $modelName -replace '[^a-zA-Z0-9]+', '-' -replace '^-+|-+$', ''
    
    return "$cleanProject-$cleanModel".ToLower()
}

function Extract-Tags {
    param($htmlContent)
    
    $tags = @()
    
    if ($htmlContent -match 'three\.js|THREE\.') { $tags += @('Three.js', '3D Graphics') }
    if ($htmlContent -match '<canvas') { $tags += 'Canvas' }
    if ($htmlContent -match 'requestAnimationFrame|animate') { $tags += 'Animation' }
    if ($htmlContent -match 'particle|Particle') { $tags += 'Particles' }
    if ($htmlContent -match 'WebGL|gl_') { $tags += @('WebGL', 'Shaders') }
    if ($htmlContent -match 'noise|Noise') { $tags += 'Procedural Generation' }
    if ($htmlContent -match 'sphere|planet') { $tags += 'Astronomy' }
    if ($htmlContent -match 'simulation|physics') { $tags += 'Simulation' }
    if ($htmlContent -match 'game|Game') { $tags += 'Game' }
    if ($htmlContent -match 'city|building') { $tags += 'Architecture' }
    
    if ($tags.Count -eq 0) {
        $tags = @('Interactive', 'Visualization')
    }
    
    return $tags | Select-Object -Unique
}

function Generate-Description {
    param($tags)
    
    $tagStr = ($tags -join ', ').ToLower()
    
    if ($tags -contains 'Three.js') {
        return "An interactive 3D visualization built with Three.js featuring $tagStr."
    }
    elseif ($tags -contains 'Canvas') {
        return "A dynamic canvas-based visualization with $tagStr."
    }
    else {
        return "An interactive web application featuring $tagStr."
    }
}

function Process-HtmlFile {
    param($filePath, $modelName)
    
    try {
        $fileName = [System.IO.Path]::GetFileNameWithoutExtension($filePath)
        $htmlContent = Get-Content -Path $filePath -Raw -Encoding UTF8
        
        # Generate title from HTML or filename
        $titleMatch = [regex]::Match($htmlContent, '<title[^>]*>([^<]+)</title>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
        if ($titleMatch.Success -and $titleMatch.Groups[1].Value.Trim() -ne 'Document') {
            $title = $titleMatch.Groups[1].Value.Trim()
        }
        else {
            $title = $fileName -replace '[-_]', ' ' -replace '\b\w', { $args[0].Value.ToUpper() }
        }
        
        $tags = Extract-Tags -htmlContent $htmlContent
        $description = Generate-Description -tags $tags
        $id = Generate-Id -projectName $fileName -modelName $modelName
        
        $outputPath = Join-Path $outputDir "$id.json"
        
        if (Test-Path $outputPath) {
            Write-Host "⏭️  Skipping existing: $id" -ForegroundColor Yellow
            $script:skippedCount++
            return
        }
        
        $jsonData = @{
            id = $id
            title = $title
            htmlContent = $htmlContent
            metadata = @{
                model = $modelName
                prompt = "Imported from one-page directory"
                timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                tags = $tags
                description = $description
            }
        }
        
        $jsonString = $jsonData | ConvertTo-Json -Depth 10
        Set-Content -Path $outputPath -Value $jsonString -Encoding UTF8
        
        Write-Host "✅ Generated: $id.json" -ForegroundColor Green
        $script:processedCount++
    }
    catch {
        Write-Host "❌ Error processing $filePath : $($_.Exception.Message)" -ForegroundColor Red
        $script:skippedCount++
    }
}

# Process all model directories
Get-ChildItem -Path $onePageDir -Directory | ForEach-Object {
    $modelName = $_.Name
    Write-Host "🔍 Processing model: $modelName" -ForegroundColor Magenta
    
    # Find HTML files in this model directory
    Get-ChildItem -Path $_.FullName -Recurse -Filter "*.html" | ForEach-Object {
        # Skip if it's part of a multi-file project and not index.html
        $parentDir = $_.Directory
        $isMultiFile = (Get-ChildItem -Path $parentDir).Count -gt 1 -and (Test-Path (Join-Path $parentDir "index.html"))
        
        if ($isMultiFile -and $_.Name -ne "index.html") {
            return # Skip non-index files in multi-file projects
        }
        
        Process-HtmlFile -filePath $_.FullName -modelName $modelName
    }
}

Write-Host ""
Write-Host "✅ Import complete!" -ForegroundColor Green
Write-Host "📊 Processed: $processedCount files" -ForegroundColor Cyan
Write-Host "⏭️  Skipped: $skippedCount files" -ForegroundColor Yellow