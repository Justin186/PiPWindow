param(
    [string]$title = "PiPW DOM Window"
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
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
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
}
"@
$processId = (Get-Process -Name cloudmusic -ErrorAction SilentlyContinue).Id
$callback = {
    param([IntPtr]$hWnd, [IntPtr]$lParam)
    $text = New-Object System.Text.StringBuilder 256
    [DomWindowUtils]::GetWindowText($hWnd, $text, $text.Capacity) | Out-Null
    if ($text.ToString() -ne $title) { return $true }
    $windowProcessId = 0
    [DomWindowUtils]::GetWindowThreadProcessId($hWnd, [ref]$windowProcessId) | Out-Null
    if ($processId -notcontains $windowProcessId) { return $true }
    $style = [DomWindowUtils]::GetWindowLong($hWnd, [DomWindowUtils]::GWL_STYLE)
    $style = $style -band (-bnot ([DomWindowUtils]::WS_CAPTION -bor [DomWindowUtils]::WS_MINIMIZEBOX -bor [DomWindowUtils]::WS_MAXIMIZEBOX -bor [DomWindowUtils]::WS_SYSMENU))
    [DomWindowUtils]::SetWindowLong($hWnd, [DomWindowUtils]::GWL_STYLE, $style) | Out-Null
    [DomWindowUtils]::SetWindowPos($hWnd, [DomWindowUtils]::HWND_TOPMOST, 0, 0, 0, 0, [DomWindowUtils]::SWP_NOMOVE -bor [DomWindowUtils]::SWP_NOSIZE -bor [DomWindowUtils]::SWP_SHOWWINDOW -bor [DomWindowUtils]::SWP_FRAMECHANGED) | Out-Null
    Add-Content -Path $logFile -Value "$(Get-Date -Format o) matched hwnd=$hWnd process=$windowProcessId styled=true"
    Write-Host "已设置 DOM 窗口无边框并置顶: $hWnd"
    return $false
}
[DomWindowUtils]::EnumWindows($callback, [IntPtr]::Zero) | Out-Null
if (-not (Select-String -Path $logFile -Pattern "styled=true" -Quiet)) {
    Add-Content -Path $logFile -Value "$(Get-Date -Format o) matched=false"
}
