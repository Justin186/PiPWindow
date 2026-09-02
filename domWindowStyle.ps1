param(
    [string]$title = "PiPW DOM Window",
    [switch]$watchDrag
)
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
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [StructLayout(LayoutKind.Sequential)] public struct Point { public int X; public int Y; }
    [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left; public int Top; public int Right; public int Bottom; }
    public const int GWL_STYLE = -16;
    public const int WS_CAPTION = 0x00C00000;
    public const int WS_THICKFRAME = 0x00040000;
    public const int WS_MINIMIZEBOX = 0x00020000;
    public const int WS_MAXIMIZEBOX = 0x00010000;
    public const int WS_SYSMENU = 0x00080000;
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
    $style = $style -band (-bnot ([DomWindowUtils]::WS_CAPTION -bor [DomWindowUtils]::WS_THICKFRAME -bor [DomWindowUtils]::WS_MINIMIZEBOX -bor [DomWindowUtils]::WS_MAXIMIZEBOX -bor [DomWindowUtils]::WS_SYSMENU))
    [DomWindowUtils]::SetWindowLong($hWnd, [DomWindowUtils]::GWL_STYLE, $style) | Out-Null
    $windowRect = New-Object DomWindowUtils+Rect
    [DomWindowUtils]::GetWindowRect($hWnd, [ref]$windowRect) | Out-Null
    $windowWidth = 408
    $windowHeight = 204
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
                        $width = $windowStart.Right - $windowStart.Left
                        $height = $windowStart.Bottom - $windowStart.Top
                        if ($resizeLeft) { $x = $windowStart.Left + $deltaX; $width = $width - $deltaX }
                        if ($resizeRight) { $width = $width + $deltaX }
                        if ($resizeTop) { $y = $windowStart.Top + $deltaY; $height = $height - $deltaY }
                        if ($resizeBottom) { $height = $height + $deltaY }
                        if ($width -lt 200) { $width = 200; if ($resizeLeft) { $x = $windowStart.Right - $width } }
                        if ($height -lt 100) { $height = 100; if ($resizeTop) { $y = $windowStart.Bottom - $height } }
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
