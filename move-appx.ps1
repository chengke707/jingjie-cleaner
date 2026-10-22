param(
    [Parameter(Mandatory=$true)][string]$ResultDirectory,
    [Parameter(Mandatory=$true)][string]$PackageFullName,
    [Parameter(Mandatory=$true)][string]$TargetVolumeName
)
$ErrorActionPreference = 'Stop'
$result = @{ status='failed'; summary='迁移失败'; detail=''; output='' }
$started = @{ status='running'; package=$PackageFullName; target=$TargetVolumeName; startedAt=(Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json -Compress
[IO.File]::WriteAllText((Join-Path $ResultDirectory 'started.json'), $started, [System.Text.UTF8Encoding]::new($false))
try {
    $target = Get-AppxVolume | Where-Object { $_.Name -eq $TargetVolumeName -and -not $_.IsOffline -and -not $_.IsSystemVolume } | Select-Object -First 1
    if (-not $target -or $target.PackageStorePath -notmatch '^[A-Za-z]:\\WindowsApps\\?$') { throw '目标盘未登记为可用的 Windows 应用迁移盘。' }
    $package = Get-AppxPackage -PackageTypeFilter Main | Where-Object { $_.PackageFullName -eq $PackageFullName -and -not $_.NonRemovable -and -not $_.IsFramework -and -not $_.IsResourcePackage } | Select-Object -First 1
    if (-not $package -or $package.InstallLocation -notlike "$env:SystemDrive\Program Files\WindowsApps\*") { throw '应用已变化或不支持迁移，请重新扫描后再试。' }
    Move-AppxPackage -Package $package.PackageFullName -Volume $target -Confirm:$false -ErrorAction Stop | Out-String | ForEach-Object { $result.output += $_ }
    $moved = Get-AppxPackage -PackageTypeFilter Main | Where-Object { $_.PackageFullName -eq $PackageFullName } | Select-Object -First 1
    if (-not $moved -or $moved.InstallLocation -notlike "$($target.PackageStorePath)*") {
        $result.status = 'review'; $result.summary = 'Windows 已执行迁移，但位置尚未确认'; $result.detail = '请重新扫描并在 Windows 设置中确认应用位置，打开应用测试后再清理 C 盘旧数据。'
    } else {
        $result.status = 'completed'; $result.summary = '应用已迁移并确认新位置'; $result.detail = "Windows 确认应用现位于 $($target.PackageStorePath)。打开应用测试正常后再处理旧数据。"
    }
} catch {
    $errorText = $_.Exception.ToString()
    $failureEvents = @()
    try {
        $since = (Get-Date).AddMinutes(-5)
        $failureEvents = @(Get-WinEvent -FilterHashtable @{ LogName='Microsoft-Windows-AppXDeploymentServer/Operational'; StartTime=$since } -ErrorAction Stop |
            Where-Object { $_.Level -le 2 -and $_.Message -match [regex]::Escape($target.PackageStorePath.Substring(0,2)) } |
            Select-Object -First 8 -ExpandProperty Message)
    } catch {}
    $diagnosticText = $failureEvents -join "`n"
    $result.status = 'failed'; $result.summary = 'Windows 没有完成迁移'; $result.detail = $_.Exception.Message
    if (-not $result.detail) { $result.detail = '请确认目标盘正常、应用已关闭，并查看 Windows 应用设置中的错误。' }
    if ($errorText -match '0x80073D21' -or $diagnosticText -match '0x80073D21') {
        $result.summary = 'Windows 禁止此应用或依赖安装到目标盘'
        $result.detail = "Windows 错误 0x80073D21：应用迁移所需的程序包系列被阻止部署到非系统盘。这不是净界权限不足；管理员授权无法解除此限制。当前应用仍在 C 盘。若要释放空间，只能在确认数据已同步/备份后卸载，再尝试把应用重新安装到目标盘；Windows 仍可能拒绝。"
        if ($diagnosticText) { $result.output += $diagnosticText + "`n" }
    } elseif ($errorText -match '0x80070005|Access is denied|拒绝访问') {
        $result.summary = 'Windows 权限不足，迁移未完成'
        $result.detail = 'Windows 返回访问被拒绝。请在管理员授权窗口选择“是”；如果已经授权仍失败，请检查 Windows 安全软件或受控文件夹访问拦截。应用当前仍在 C 盘。'
    }
    $result.output += $_ | Out-String
}
$json = $result | ConvertTo-Json -Compress -Depth 4
$temp = Join-Path $ResultDirectory 'result.tmp'
[IO.File]::WriteAllText($temp, $json, (New-Object System.Text.UTF8Encoding($false)))
[IO.File]::Move($temp, (Join-Path $ResultDirectory 'result.json'))
if ($result.status -eq 'completed') { exit 0 }
if ($result.status -eq 'review') { exit 2 }
exit 1
