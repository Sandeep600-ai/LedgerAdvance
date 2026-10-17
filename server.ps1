param(
    [int]$Port = 8080
)

$root = $PSScriptRoot
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")

try {
    $listener.Start()
    Write-Output "LEDGER ADVANCE HTTP Server running at http://localhost:$Port/"
    Write-Output "Root directory: $root"
} catch {
    Write-Error "Failed to start HttpListener: $_"
    exit 1
}

while ($listener.IsListening) {
    try {
        $context = $listener.GetContext()
        $req = $context.Request
        $res = $context.Response

        # Add CORS headers
        $res.AddHeader("Access-Control-Allow-Origin", "*")
        $res.AddHeader("Access-Control-Allow-Methods", "GET, OPTIONS, POST")
        $res.AddHeader("Access-Control-Allow-Headers", "Content-Type")

        if ($req.HttpMethod -eq "OPTIONS") {
            $res.StatusCode = 200
            $res.Close()
            continue
        }

        $rawPath = $req.Url.LocalPath.TrimStart('/')
        if ([string]::IsNullOrWhiteSpace($rawPath)) {
            $rawPath = "index.html"
        }

        # 1. API Route: quote-live or api/quote
        if ($rawPath -eq ".netlify/functions/quote-live" -or $rawPath -eq "api/quote") {
            $symbol = $req.QueryString["symbol"]
            if ([string]::IsNullOrWhiteSpace($symbol)) {
                $symbol = "INFY"
            }
            $symbol = $symbol.ToUpper().Trim()

            $snapshotFile = [System.IO.Path]::Combine($root, "data", "snapshot.json")
            if ([System.IO.File]::Exists($snapshotFile)) {
                $snapJson = [System.IO.File]::ReadAllText($snapshotFile, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
                $targetTicker = $null
                if ($symbol -eq "INFY" -and $null -ne $snapJson.deepDive) {
                    $targetTicker = [PSCustomObject]@{
                        symbol = "INFY"
                        name = $snapJson.deepDive.name
                        price = $snapJson.deepDive.quote.close
                        change = $snapJson.deepDive.quote.change
                        changePercent = $snapJson.deepDive.quote.changePercent
                        previousClose = $snapJson.deepDive.quote.previousClose
                        volume = $snapJson.deepDive.quote.volume
                        lastMarketSession = if ($null -ne $snapJson.deepDive.lastMarketSession) { $snapJson.deepDive.lastMarketSession } else { "2026-10-14" }
                    }
                } elseif ($null -ne $snapJson.universe.$symbol) {
                    $u = $snapJson.universe.$symbol
                    $targetTicker = [PSCustomObject]@{
                        symbol = $symbol
                        name = $u.name
                        price = $u.price
                        change = $u.change
                        changePercent = $u.changePercent
                        previousClose = $u.previousClose
                        volume = $u.volume
                        lastMarketSession = if ($null -ne $u.lastMarketSession) { $u.lastMarketSession } else { "2026-10-14" }
                    }
                }

                if ($null -ne $targetTicker) {
                    # Determine market state in US Eastern Time
                    $nowUtc = [DateTime]::UtcNow
                    $etTime = $nowUtc.AddHours(-4) # EDT (UTC-4)
                    $etMinutes = $etTime.Hour * 60 + $etTime.Minute
                    $isWeekday = ($etTime.DayOfWeek -ne [DayOfWeek]::Saturday -and $etTime.DayOfWeek -ne [DayOfWeek]::Sunday)

                    $isMarketOpen = ($isWeekday -and $etMinutes -ge 570 -and $etMinutes -le 960)
                    $marketState = if ($isMarketOpen) { "Live" } elseif ($isWeekday -and $etMinutes -ge 240 -and $etMinutes -lt 570) { "Pre-Market" } elseif ($isWeekday -and $etMinutes -gt 960 -and $etMinutes -le 1200) { "After-Hours" } else { "Closed" }

                    $quoteObj = [PSCustomObject]@{
                        symbol = $targetTicker.symbol
                        name = $targetTicker.name
                        price = [double]$targetTicker.price
                        change = [double]$targetTicker.change
                        changePercent = [double]$targetTicker.changePercent
                        previousClose = [double]$targetTicker.previousClose
                        volume = [long]$targetTicker.volume
                        is_market_open = $isMarketOpen
                        market_state = $marketState
                        lastMarketSession = $targetTicker.lastMarketSession
                        datetime = "$($targetTicker.lastMarketSession) 16:00:00"
                        timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
                    }

                    $respJson = $quoteObj | ConvertTo-Json
                    $bytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
                    $res.ContentType = "application/json; charset=utf-8"
                    $res.ContentLength64 = $bytes.Length
                    $res.StatusCode = 200
                    $res.OutputStream.Write($bytes, 0, $bytes.Length)
                    $res.Close()
                    continue
                }
            }
        }

        # 2. API Route: /api/quotes or /.netlify/functions/quotes
        if ($rawPath -eq "api/quotes" -or $rawPath -eq ".netlify/functions/quotes") {
            $snapshotFile = [System.IO.Path]::Combine($root, "data", "snapshot.json")
            if ([System.IO.File]::Exists($snapshotFile)) {
                $snapJson = [System.IO.File]::ReadAllText($snapshotFile, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
                $quotesMap = @{}
                foreach ($prop in $snapJson.universe.PSObject.Properties) {
                    $u = $prop.Value
                    $quotesMap[$prop.Name] = [PSCustomObject]@{
                        symbol = $prop.Name
                        name = $u.name
                        price = [double]$u.price
                        change = [double]$u.change
                        changePercent = [double]$u.changePercent
                        previousClose = [double]$u.previousClose
                        lastMarketSession = if ($null -ne $u.lastMarketSession) { $u.lastMarketSession } else { "2026-10-14" }
                    }
                }
                $respJson = $quotesMap | ConvertTo-Json -Depth 5
                $bytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
                $res.ContentType = "application/json; charset=utf-8"
                $res.ContentLength64 = $bytes.Length
                $res.StatusCode = 200
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.Close()
                continue
            }
        }

        # 3. API Route: /.netlify/functions/data or /api/data
        if ($rawPath -eq ".netlify/functions/data" -or $rawPath -eq "api/data") {
            $snapshotFile = [System.IO.Path]::Combine($root, "data", "snapshot.json")
            if ([System.IO.File]::Exists($snapshotFile)) {
                $bytes = [System.IO.File]::ReadAllBytes($snapshotFile)
                $res.ContentType = "application/json; charset=utf-8"
                $res.ContentLength64 = $bytes.Length
                $res.StatusCode = 200
                $res.OutputStream.Write($bytes, 0, $bytes.Length)
                $res.Close()
                continue
            }
        }

        # 4. API Route: /.netlify/functions/alphavantage-series or /api/alphavantage-series
        # Local dev: returns time series from snapshot.json (no external API call needed locally).
        if ($rawPath -eq ".netlify/functions/alphavantage-series" -or $rawPath -eq "api/alphavantage-series") {
            $symbol = $req.QueryString["symbol"]
            if ([string]::IsNullOrWhiteSpace($symbol)) { $symbol = "INFY" }
            $symbol = $symbol.ToUpper().Trim()

            $snapshotFile = [System.IO.Path]::Combine($root, "data", "snapshot.json")
            $localTimeSeries = @()
            if ([System.IO.File]::Exists($snapshotFile)) {
                $snapJson = [System.IO.File]::ReadAllText($snapshotFile, [System.Text.Encoding]::UTF8) | ConvertFrom-Json
                if ($symbol -eq "INFY" -and $null -ne $snapJson.deepDive -and $null -ne $snapJson.deepDive.timeSeries) {
                    $localTimeSeries = $snapJson.deepDive.timeSeries
                } elseif ($null -ne $snapJson.universe.$symbol -and $null -ne $snapJson.universe.$symbol.timeSeries) {
                    $localTimeSeries = $snapJson.universe.$symbol.timeSeries
                }
            }

            $avResultObj = [PSCustomObject]@{
                symbol     = $symbol
                timeSeries = $localTimeSeries
                source     = "Snapshot (Twelve Data) - Local Dev"
                fetchedAt  = [DateTime]::UtcNow.ToString("o")
            }
            $respJson = $avResultObj | ConvertTo-Json -Depth 10
            $bytes = [System.Text.Encoding]::UTF8.GetBytes($respJson)
            $res.ContentType = "application/json; charset=utf-8"
            $res.ContentLength64 = $bytes.Length
            $res.StatusCode = 200
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
            $res.Close()
            continue
        }


        # 5. Resolve clean safe path (static files)
        $decoded = [System.Uri]::UnescapeDataString($rawPath)
        $filePath = [System.IO.Path]::Combine($root, $decoded.Replace('/', [System.IO.Path]::DirectorySeparatorChar))


        if ([System.IO.File]::Exists($filePath)) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime = switch ($ext) {
                ".html" { "text/html; charset=utf-8" }
                ".css"  { "text/css; charset=utf-8" }
                ".js"   { "application/javascript; charset=utf-8" }
                ".json" { "application/json; charset=utf-8" }
                ".svg"  { "image/svg+xml" }
                ".png"  { "image/png" }
                ".jpg"  { "image/jpeg" }
                ".ico"  { "image/x-icon" }
                Default { "application/octet-stream" }
            }

            $res.ContentType = $mime
            $res.ContentLength64 = $bytes.Length
            $res.StatusCode = 200
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $res.StatusCode = 404
            $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $decoded")
            $res.OutputStream.Write($errBytes, 0, $errBytes.Length)
        }
        $res.Close()
    } catch {
        # Continue loop on client disconnect
    }
}
