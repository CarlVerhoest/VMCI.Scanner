#Requires -Version 7
<#
.SYNOPSIS
    Generates the VMCI Scanner logo files (SVG and PNG) and the favicon / PWA icons.

.DESCRIPTION
    The logo is the VMCI braces `{ }` used as a scan frame around a page, with a scan line through
    it, next to the wordmark "vmci scanner". Its geometry lives in this script only: the SVG files
    and the PNG files are both produced from the $shapes table below, so they cannot drift apart.
    The same geometry is repeated once by hand in src/components/ScannerLogo.tsx (the theme-aware
    inline logo in the app header) - change both together.

    Output, all under frontend/VMCI.Scanner.App/public:
      logos/logo-square-{light,dark}.{svg,png}   icon only, transparent
      logos/logo-long-{light,dark}.{svg,png}     icon + wordmark, transparent
      favicon.svg                                icon, follows the browser's light/dark preference
      pwa-192x192.png  pwa-512x512.png  apple-touch-icon.png   icon on white, padded (maskable)

    Windows only (System.Drawing). The wordmark is set in Arial Bold / Arial.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$public = Join-Path $repoRoot 'frontend\VMCI.Scanner.App\public'
$logos = Join-Path $public 'logos'
New-Item -ItemType Directory -Force $logos | Out-Null

# Colours sampled from the VMCI logo (../VMCI/frontend/VMCI.App/public/logos); "scan" is the
# brighter green of the scan line.
$palettes = @{
    light = @{ grey = '#888888'; green = '#4B5C09'; scan = '#84A410' }
    dark  = @{ grey = '#AEAEAE'; green = '#84A410'; scan = '#A9CF1F' }
}

# The icon on a 64 x 64 grid. Paths use absolute M / L / C / Z only, so the small parser below can
# replay them into a GDI+ path. Stroked shapes have a width; a shape without one is filled.
$shapes = @(
    @{ color = 'grey'; width = 4.5; d = 'M19 9 C14 9 12 11 12 16 L12 25 C12 29 9.5 32 5 32 C9.5 32 12 35 12 39 L12 48 C12 53 14 55 19 55' }
    @{ color = 'grey'; width = 4.5; d = 'M45 9 C50 9 52 11 52 16 L52 25 C52 29 54.5 32 59 32 C54.5 32 52 35 52 39 L52 48 C52 53 50 55 45 55' }
    @{ color = 'green'; width = 2.5; d = 'M22 12 L36 12 L42 18 L42 52 L22 52 Z' }
    @{ color = 'green'; width = 2; d = 'M26.5 21 L34 21' }
    @{ color = 'green'; width = 2; d = 'M26.5 26 L37.5 26' }
    @{ color = 'grey'; width = 2; opacity = 0.55; d = 'M26.5 39 L37.5 39' }
    @{ color = 'grey'; width = 2; opacity = 0.55; d = 'M26.5 44 L37.5 44' }
    @{ color = 'scan'; opacity = 0.22; d = 'M23.5 32 L40.5 32 L40.5 36 L23.5 36 Z' }
    @{ color = 'scan'; width = 3; d = 'M17 32 L47 32' }
)

$iconSize = 64
# Wordmark, in the same 64-high grid, to the right of the icon.
$wordX = 72
$wordBaseline = 43
$wordSize = 30
$longWidth = 262
$fontFamily = 'Arial'

function ConvertTo-GraphicsPath([string]$d) {
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $tokens = [regex]::Matches($d, '[MLCZ]|-?\d+(?:\.\d+)?') | ForEach-Object Value
    $current = $null
    $next = {
        $point = [System.Drawing.PointF]::new([single]$tokens[$script:i], [single]$tokens[$script:i + 1])
        $script:i += 2
        $point
    }
    $script:i = 0
    while ($script:i -lt $tokens.Count) {
        $command = $tokens[$script:i]
        $script:i++
        switch ($command) {
            'M' { $path.StartFigure(); $current = & $next }
            'L' { $to = & $next; $path.AddLine($current, $to); $current = $to }
            'C' { $c1 = & $next; $c2 = & $next; $to = & $next; $path.AddBezier($current, $c1, $c2, $to); $current = $to }
            'Z' { $path.CloseFigure() }
        }
    }
    $path
}

function Get-Color([string]$hex, $opacity) {
    $alpha = if ($null -eq $opacity) { 255 } else { [int][math]::Round(255 * $opacity) }
    [System.Drawing.Color]::FromArgb($alpha, [System.Drawing.ColorTranslator]::FromHtml($hex))
}

function Add-Icon([System.Drawing.Graphics]$graphics, $palette) {
    foreach ($shape in $shapes) {
        $color = Get-Color $palette[$shape.color] $shape.opacity
        $path = ConvertTo-GraphicsPath $shape.d
        if ($shape.width) {
            $pen = [System.Drawing.Pen]::new($color, [single]$shape.width)
            $pen.LineJoin = 'Round'
            $pen.StartCap = 'Round'
            $pen.EndCap = 'Round'
            $graphics.DrawPath($pen, $path)
            $pen.Dispose()
        }
        else {
            $brush = [System.Drawing.SolidBrush]::new($color)
            $graphics.FillPath($brush, $path)
            $brush.Dispose()
        }
        $path.Dispose()
    }
}

function Add-Wordmark([System.Drawing.Graphics]$graphics, $palette) {
    $family = [System.Drawing.FontFamily]::new($fontFamily)
    $format = [System.Drawing.StringFormat]::new([System.Drawing.StringFormat]::GenericTypographic)
    $format.FormatFlags = $format.FormatFlags -bor [System.Drawing.StringFormatFlags]::MeasureTrailingSpaces
    $x = [single]$wordX
    foreach ($part in @(
            @{ text = 'vmci '; style = [System.Drawing.FontStyle]::Bold; color = $palette.green }
            @{ text = 'scanner'; style = [System.Drawing.FontStyle]::Regular; color = $palette.grey }
        )) {
        # AddString positions the top of the em box, the SVG <text> positions the baseline.
        $ascent = $wordSize * $family.GetCellAscent($part.style) / $family.GetEmHeight($part.style)
        $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
        $path.AddString($part.text, $family, [int]$part.style, [single]$wordSize,
            [System.Drawing.PointF]::new($x, [single]($wordBaseline - $ascent)), $format)
        $brush = [System.Drawing.SolidBrush]::new((Get-Color $part.color $null))
        $graphics.FillPath($brush, $path)
        $brush.Dispose()
        $path.Dispose()

        $font = [System.Drawing.Font]::new($family, [single]$wordSize, $part.style, [System.Drawing.GraphicsUnit]::Pixel)
        $x += $graphics.MeasureString($part.text, $font, [System.Drawing.PointF]::new(0, 0), $format).Width
        $font.Dispose()
    }
    $format.Dispose()
    $family.Dispose()
}

# -Background: $null for transparent. -Inset: fraction of the canvas the icon occupies (maskable
# PWA icons keep their content inside the central 80 %).
function Save-Png([string]$file, [int]$width, [int]$height, $palette, [switch]$Wordmark, $Background, [double]$Inset = 1) {
    $bitmap = [System.Drawing.Bitmap]::new($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = 'AntiAlias'
    $graphics.PixelOffsetMode = 'HighQuality'
    if ($Background) { $graphics.Clear((Get-Color $Background $null)) } else { $graphics.Clear([System.Drawing.Color]::Transparent) }

    $scale = $height / $iconSize * $Inset
    $graphics.TranslateTransform([single](($width - $width * $Inset) / 2), [single](($height - $height * $Inset) / 2))
    $graphics.ScaleTransform([single]$scale, [single]$scale)
    Add-Icon $graphics $palette
    if ($Wordmark) { Add-Wordmark $graphics $palette }

    $graphics.Dispose()
    $bitmap.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Dispose()
    Write-Host "  $([System.IO.Path]::GetRelativePath($repoRoot, $file))"
}

# -Palette: a light/dark palette, or $null to emit classes that follow prefers-color-scheme.
function Get-IconSvg($palette) {
    $lines = foreach ($shape in $shapes) {
        $opacity = if ($shape.opacity) { " opacity=`"$($shape.opacity)`"" } else { '' }
        if ($shape.width) {
            $paint = if ($palette) { "stroke=`"$($palette[$shape.color])`"" } else { "class=`"$($shape.color)`"" }
            "  <path d=`"$($shape.d)`" fill=`"none`" $paint stroke-width=`"$($shape.width)`" stroke-linecap=`"round`" stroke-linejoin=`"round`"$opacity/>"
        }
        else {
            $paint = if ($palette) { "fill=`"$($palette[$shape.color])`"" } else { "class=`"$($shape.color)-fill`"" }
            "  <path d=`"$($shape.d)`" $paint$opacity/>"
        }
    }
    $lines -join "`n"
}

function Save-Svg([string]$file, [int]$width, [string[]]$body) {
    $svg = @(
        "<svg xmlns=`"http://www.w3.org/2000/svg`" viewBox=`"0 0 $width $iconSize`" width=`"$width`" height=`"$iconSize`" role=`"img`" aria-label=`"VMCI Scanner`">"
        $body
        '</svg>'
        ''
    ) -join "`n"
    Set-Content -LiteralPath $file -Value $svg -NoNewline -Encoding utf8NoBOM
    Write-Host "  $([System.IO.Path]::GetRelativePath($repoRoot, $file))"
}

Write-Host '== Logos' -ForegroundColor Cyan
foreach ($mode in 'light', 'dark') {
    $palette = $palettes[$mode]
    $icon = Get-IconSvg $palette
    $wordmark = "  <text x=`"$wordX`" y=`"$wordBaseline`" font-family=`"$fontFamily, Helvetica, sans-serif`" font-size=`"$wordSize`">" +
        "<tspan font-weight=`"700`" fill=`"$($palette.green)`">vmci</tspan><tspan fill=`"$($palette.grey)`"> scanner</tspan></text>"

    Save-Svg (Join-Path $logos "logo-square-$mode.svg") $iconSize $icon
    Save-Svg (Join-Path $logos "logo-long-$mode.svg") $longWidth $icon, $wordmark
    Save-Png (Join-Path $logos "logo-square-$mode.png") 512 512 $palette
    Save-Png (Join-Path $logos "logo-long-$mode.png") ($longWidth * 2) ($iconSize * 2) $palette -Wordmark
}

Write-Host '== Favicon and PWA icons' -ForegroundColor Cyan
$light = $palettes.light
$dark = $palettes.dark
$style = @(
    '  <style>'
    "    .grey { stroke: $($light.grey) } .green { stroke: $($light.green) } .scan { stroke: $($light.scan) } .scan-fill { fill: $($light.scan) }"
    '    @media (prefers-color-scheme: dark) {'
    "      .grey { stroke: $($dark.grey) } .green { stroke: $($dark.green) } .scan { stroke: $($dark.scan) } .scan-fill { fill: $($dark.scan) }"
    '    }'
    '  </style>'
) -join "`n"
Save-Svg (Join-Path $public 'favicon.svg') $iconSize $style, (Get-IconSvg $null)
Save-Png (Join-Path $public 'pwa-192x192.png') 192 192 $light -Background '#FFFFFF' -Inset 0.76
Save-Png (Join-Path $public 'pwa-512x512.png') 512 512 $light -Background '#FFFFFF' -Inset 0.76
Save-Png (Join-Path $public 'apple-touch-icon.png') 180 180 $light -Background '#FFFFFF' -Inset 0.76

Write-Host 'Logos generated.' -ForegroundColor Green
