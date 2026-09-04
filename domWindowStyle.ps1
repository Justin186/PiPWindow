param(
    [string]$title = "PiPWindow",
    [switch]$watchDrag,
    [double]$aspectWidth = 2,
    [double]$aspectHeight = 1,
    [int]$initialWidth = 320,
    [int]$initialHeight = 120
)
$aspectRatio = $aspectWidth / $aspectHeight
$minWidth = 200
$minHeight = [Math]::Ceiling($minWidth / $aspectRatio)
$logFile = Join-Path $env:TEMP "PiPW-domWindowStyle.log"
Set-Content -Path $logFile -Value "$(Get-Date -Format o) started title=[$title]" -Encoding UTF8
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class DomWindowUtils {
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int maxCount);
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
    [DllImport("user32.dll")] public static extern int GetWindowLong(IntPtr hWnd, int index);
    [DllImport("user32.dll")] public static extern int SetWindowLong(IntPtr hWnd, int index, int value);
    [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr insertAfter, int x, int y, int cx, int cy, uint flags);
    [DllImport("user32.dll")] public static extern bool GetCursorPos(out Point point);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out Rect rect);
    [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int key);
    [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool InvalidateRect(IntPtr hWnd, IntPtr rect, bool erase);
    [DllImport("user32.dll")] public static extern bool UpdateWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern int GetSystemMetrics(int index);
    [DllImport("dwmapi.dll")] public static extern int DwmSetWindowAttribute(IntPtr hWnd, int attribute, ref int value, int valueSize);
    [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] public static extern int PrivateExtractIcons(string fileName, int iconIndex, int width, int height, IntPtr[] phicon, IntPtr[] piconid, uint nIcons, uint flags);
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [StructLayout(LayoutKind.Sequential)] public struct Point { public int X; public int Y; }
    [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left; public int Top; public int Right; public int Bottom; }
    public const int GWL_STYLE = -16;
    public const int WS_CAPTION = 0x00C00000;
    public const int WS_BORDER = 0x00800000;
    public const int WS_THICKFRAME = 0x00040000;
    public const int WS_MINIMIZEBOX = 0x00020000;
    public const int WS_MAXIMIZEBOX = 0x00010000;
    public const int WS_SYSMENU = 0x00080000;
    public const int DWMWA_WINDOW_CORNER_PREFERENCE = 33;
    public const int DWMWCP_ROUND = 2;
    public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
    public const uint SWP_NOMOVE = 0x0002;
    public const uint SWP_NOSIZE = 0x0001;
    public const uint SWP_SHOWWINDOW = 0x0040;
    public const uint SWP_FRAMECHANGED = 0x0020;
    public const uint SWP_NOZORDER = 0x0004;
    public const uint SWP_NOACTIVATE = 0x0010;
}
"@
$processId = (Get-Process -Name cloudmusic -ErrorAction SilentlyContinue).Id
$matchedHwnd = [IntPtr]::Zero
$callback = {
    param([IntPtr]$hWnd, [IntPtr]$lParam)
    $text = New-Object System.Text.StringBuilder 256
    [DomWindowUtils]::GetWindowText($hWnd, $text, $text.Capacity) | Out-Null
    if ($text.ToString() -ne $title) { return $true }
    $windowProcessId = 0
    [DomWindowUtils]::GetWindowThreadProcessId($hWnd, [ref]$windowProcessId) | Out-Null
    if ($processId -notcontains $windowProcessId) { return $true }
    $script:matchedHwnd = $hWnd
    $style = [DomWindowUtils]::GetWindowLong($hWnd, [DomWindowUtils]::GWL_STYLE)
    $style = $style -band (-bnot ([DomWindowUtils]::WS_CAPTION -bor [DomWindowUtils]::WS_BORDER -bor [DomWindowUtils]::WS_THICKFRAME -bor [DomWindowUtils]::WS_MINIMIZEBOX -bor [DomWindowUtils]::WS_MAXIMIZEBOX -bor [DomWindowUtils]::WS_SYSMENU))
    [DomWindowUtils]::SetWindowLong($hWnd, [DomWindowUtils]::GWL_STYLE, $style) | Out-Null
    $cornerPreference = [DomWindowUtils]::DWMWCP_ROUND
    [DomWindowUtils]::DwmSetWindowAttribute($hWnd, [DomWindowUtils]::DWMWA_WINDOW_CORNER_PREFERENCE, [ref]$cornerPreference, 4) | Out-Null
    $windowRect = New-Object DomWindowUtils+Rect
    [DomWindowUtils]::GetWindowRect($hWnd, [ref]$windowRect) | Out-Null
    $windowWidth = $initialWidth
    $windowHeight = $initialHeight
    $screenWidth = [DomWindowUtils]::GetSystemMetrics(0)
    $screenHeight = [DomWindowUtils]::GetSystemMetrics(1)
    $windowLeft = [Math]::Max(0, [int](($screenWidth - $windowWidth) / 2))
    $windowTop = [Math]::Max(0, [int](($screenHeight - $windowHeight) / 2))
    [DomWindowUtils]::SetWindowPos($hWnd, [DomWindowUtils]::HWND_TOPMOST, $windowLeft, $windowTop, $windowWidth, $windowHeight, [DomWindowUtils]::SWP_SHOWWINDOW -bor [DomWindowUtils]::SWP_FRAMECHANGED) | Out-Null
    [DomWindowUtils]::InvalidateRect($hWnd, [IntPtr]::Zero, $true) | Out-Null
    [DomWindowUtils]::UpdateWindow($hWnd) | Out-Null
    Add-Content -Path $logFile -Value "$(Get-Date -Format o) matched hwnd=$hWnd process=$windowProcessId styled=true"
    Write-Host "已设置 DOM 窗口无边框并置顶: $hWnd"
    return $false
}
[DomWindowUtils]::EnumWindows($callback, [IntPtr]::Zero) | Out-Null
if (-not (Select-String -Path $logFile -Pattern "styled=true" -Quiet)) {
    Add-Content -Path $logFile -Value "$(Get-Date -Format o) matched=false"
}
# 设置窗口图标：从网易云主程序 exe 提取图标，WM_SETICON(ICON_BIG/ICON_SMALL) 设给小窗
if ($matchedHwnd -ne [IntPtr]::Zero) {
    try {
        $ncmPath = (Get-Process -Name cloudmusic -ErrorAction SilentlyContinue | Where-Object { $_.Path } | Select-Object -First 1).Path
        if ($ncmPath) {
            $bigIcon = New-Object 'IntPtr[]' 1
            $smallIcon = New-Object 'IntPtr[]' 1
            $iconIds = New-Object 'IntPtr[]' 1
            $okBig = [DomWindowUtils]::PrivateExtractIcons($ncmPath, 0, 32, 32, $bigIcon, $iconIds, 1, 0)
            $okSmall = [DomWindowUtils]::PrivateExtractIcons($ncmPath, 0, 16, 16, $smallIcon, $iconIds, 1, 0)
            if ($okBig -gt 0) { [DomWindowUtils]::SendMessage($matchedHwnd, 0x0080, [IntPtr]1, $bigIcon[0]) | Out-Null }
            if ($okSmall -gt 0) { [DomWindowUtils]::SendMessage($matchedHwnd, 0x0080, [IntPtr]0, $smallIcon[0]) | Out-Null }
            Add-Content -Path $logFile -Value "$(Get-Date -Format o) icon=big:$okBig,small:$okSmall exe=[$ncmPath]"
        } else {
            Add-Content -Path $logFile -Value "$(Get-Date -Format o) icon=skipped exe-path-unavailable"
        }
    } catch {
        Add-Content -Path $logFile -Value "$(Get-Date -Format o) icon-error=$($_.Exception.Message)"
    }
}
if ($watchDrag -and $matchedHwnd -ne [IntPtr]::Zero) {
    Add-Content -Path $logFile -Value "$(Get-Date -Format o) drag-watcher=true hwnd=$matchedHwnd"
    $wasDown = $false
    while ([DomWindowUtils]::IsWindow($matchedHwnd)) {
        $isDown = ([DomWindowUtils]::GetAsyncKeyState(0x01) -band 0x8000) -ne 0
        if ($isDown -and -not $wasDown) {
            $cursorStart = New-Object DomWindowUtils+Point
            $windowStart = New-Object DomWindowUtils+Rect
            [DomWindowUtils]::GetCursorPos([ref]$cursorStart) | Out-Null
            [DomWindowUtils]::GetWindowRect($matchedHwnd, [ref]$windowStart) | Out-Null
            if ($cursorStart.X -ge $windowStart.Left -and $cursorStart.X -lt $windowStart.Right -and $cursorStart.Y -ge $windowStart.Top -and $cursorStart.Y -lt $windowStart.Bottom) {
                $resizeMargin = 8
                $resizeLeft = $cursorStart.X -lt ($windowStart.Left + $resizeMargin)
                $resizeRight = $cursorStart.X -ge ($windowStart.Right - $resizeMargin)
                $resizeTop = $cursorStart.Y -lt ($windowStart.Top + $resizeMargin)
                $resizeBottom = $cursorStart.Y -ge ($windowStart.Bottom - $resizeMargin)
                $resizeMode = $resizeLeft -or $resizeRight -or $resizeTop -or $resizeBottom
                while (([DomWindowUtils]::GetAsyncKeyState(0x01) -band 0x8000) -ne 0 -and [DomWindowUtils]::IsWindow($matchedHwnd)) {
                    $cursor = New-Object DomWindowUtils+Point
                    [DomWindowUtils]::GetCursorPos([ref]$cursor) | Out-Null
                    $deltaX = $cursor.X - $cursorStart.X
                    $deltaY = $cursor.Y - $cursorStart.Y
                    if ($resizeMode) {
                        $x = $windowStart.Left
                        $y = $windowStart.Top
                        $startWidth = $windowStart.Right - $windowStart.Left
                        $startHeight = $windowStart.Bottom - $windowStart.Top
                        $width = $startWidth
                        $height = $startHeight
                        $horizontalScale = 1
                        $verticalScale = 1
                        if ($resizeLeft -or $resizeRight) {
                            $candidateWidth = if ($resizeLeft) { $startWidth - $deltaX } else { $startWidth + $deltaX }
                            $horizontalScale = $candidateWidth / $startWidth
                        }
                        if ($resizeTop -or $resizeBottom) {
                            $candidateHeight = if ($resizeTop) { $startHeight - $deltaY } else { $startHeight + $deltaY }
                            $verticalScale = $candidateHeight / $startHeight
                        }
                        if (($resizeLeft -or $resizeRight) -and ($resizeTop -or $resizeBottom)) {
                            if ([Math]::Abs($horizontalScale - 1) -ge [Math]::Abs($verticalScale - 1)) { $verticalScale = $horizontalScale }
                            else { $horizontalScale = $verticalScale }
                        }
                        $scale = if ($resizeLeft -or $resizeRight) { $horizontalScale } else { $verticalScale }
                        $width = $startWidth * $scale
                        $height = $width / $aspectRatio
                        if ($resizeLeft) { $x = $windowStart.Right - $width }
                        if ($resizeTop) { $y = $windowStart.Bottom - $height }
                        if ($width -lt $minWidth) { $width = $minWidth; $height = $width / $aspectRatio }
                        if ($height -lt $minHeight) { $height = $minHeight; $width = $height * $aspectRatio }
                        if ($resizeLeft) { $x = $windowStart.Right - $width }
                        if ($resizeTop) { $y = $windowStart.Bottom - $height }
                        [DomWindowUtils]::SetWindowPos($matchedHwnd, [IntPtr]::Zero, $x, $y, $width, $height, [DomWindowUtils]::SWP_NOZORDER -bor [DomWindowUtils]::SWP_NOACTIVATE) | Out-Null
                    } else {
                        $x = $windowStart.Left + $deltaX
                        $y = $windowStart.Top + $deltaY
                        [DomWindowUtils]::SetWindowPos($matchedHwnd, [IntPtr]::Zero, $x, $y, 0, 0, [DomWindowUtils]::SWP_NOSIZE -bor [DomWindowUtils]::SWP_NOZORDER -bor [DomWindowUtils]::SWP_NOACTIVATE) | Out-Null
                    }
                    [System.Threading.Thread]::Sleep(8)
                }
            }
        }
        $wasDown = $isDown
        [System.Threading.Thread]::Sleep(8)
    }
}
