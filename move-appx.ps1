param(
    [Parameter(Mandatory=$true)][string]$ResultDirectory,
    [Parameter(Mandatory=$true)][string]$PackageFullName,
    [Parameter(Mandatory=$true)][string]$TargetVolumeName
)
$ErrorActionPreference = 'Stop'
$result = @{ status='failed'; summary='迁移失败'; detail=''; output='' }
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
    $result.status = 'failed'; $result.summary = 'Windows 没有完成迁移'; $result.detail = $_.Exception.Message
    if (-not $result.detail) { $result.detail = '请确认目标盘正常、应用已关闭，并查看 Windows 应用设置中的错误。' }
    $result.output += $_ | Out-String
}
$json = $result | ConvertTo-Json -Compress -Depth 4
$temp = Join-Path $ResultDirectory 'result.tmp'
[IO.File]::WriteAllText($temp, $json, (New-Object System.Text.UTF8Encoding($false)))
[IO.File]::Move($temp, (Join-Path $ResultDirectory 'result.json'))
if ($result.status -eq 'completed') { exit 0 }
if ($result.status -eq 'review') { exit 2 }
exit 1
