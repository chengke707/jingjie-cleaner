param([Parameter(Mandatory=$true)][string]$JobDirectory, [Parameter(Mandatory=$true)][string]$Actions)
$ErrorActionPreference = 'Stop'
$selected = @($Actions.Split(','))
if ($selected.Count -lt 1 -or $selected.Count -gt 2 -or @($selected | Where-Object { $_ -notin @('flush-dns', 'repair-components') }).Count -gt 0) { exit 2 }
$progressFile = Join-Path $JobDirectory 'progress.json'
$utf8 = New-Object System.Text.UTF8Encoding($false)
$job = [ordered]@{ status='running'; pid=$PID; message='正在执行所选修复，请保持电脑开机。'; steps=@() }
foreach ($action in $selected) {
    if ($action -eq 'flush-dns') { $job.steps += [ordered]@{ id='dns'; title='清掉旧的网址解析缓存'; status='pending'; message='等待执行' } }
    if ($action -eq 'repair-components') {
        $job.steps += [ordered]@{ id='dism'; title='修复 Windows 组件库'; status='pending'; message='等待执行' }
        $job.steps += [ordered]@{ id='dism-verify'; title='深度复检 Windows 组件库'; status='pending'; message='等待执行' }
        $job.steps += [ordered]@{ id='sfc'; title='检查并修复 Windows 系统文件'; status='pending'; message='等待执行' }
        $job.steps += [ordered]@{ id='sfc-verify'; title='复检 Windows 系统文件'; status='pending'; message='等待执行' }
    }
}
function Save-Progress {
    $temp = Join-Path $JobDirectory 'progress.tmp'
    [IO.File]::WriteAllText($temp, ($job | ConvertTo-Json -Depth 8), $utf8)
    if ([IO.File]::Exists($progressFile)) { [IO.File]::Replace($temp, $progressFile, (Join-Path $JobDirectory 'progress.backup.json')) }
    else { [IO.File]::Move($temp, $progressFile) }
}
$mutex = New-Object System.Threading.Mutex($false, 'Global\JingjieSystemRepair')
$locked = $false
function Get-SystemFreeBytes { return (New-Object IO.DriveInfo([IO.Path]::GetPathRoot($env:SystemRoot))).AvailableFreeSpace }
try {
    try { $locked = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $locked = $true }
    if (-not $locked) { throw 'Another repair is already running. Wait for it to finish.' }
    Save-Progress
    if ($selected -contains 'repair-components' -and (Get-SystemFreeBytes) -lt 5GB) {
        $diskStep = $job.steps | Where-Object { $_.id -eq 'dism' }
        $diskStep.status='failed'; $diskStep.exitCode=112; $diskStep.message='系统盘空间不足，本次未启动系统修复。'
        throw '系统盘空间不足，请先释放至至少 5 GB（建议 10 GB）后重试。'
    }
    foreach ($step in $job.steps) {
        if ($step.id -in @('dism-verify','sfc-verify')) {
            $parentId = $step.id.Replace('-verify','')
            $parentStep = $job.steps | Where-Object { $_.id -eq $parentId }
            if ($parentStep.status -ne 'succeeded') { $step.status='skipped'; $step.message='前一步未成功完成，本次不宣称复检通过。'; Save-Progress; continue }
        }
        $step.status='running'; $step.message='正在执行，请稍候。系统文件修复可能需要较长时间。'; Save-Progress
        $log = Join-Path $JobDirectory ($step.id + '.log')
        try {
            # Fixed absolute executable paths prevent elevated PATH resolution.
            $global:LASTEXITCODE = 0
            if ($step.id -eq 'dns') { & "$env:SystemRoot\System32\ipconfig.exe" /flushdns 2>&1 | Out-File -LiteralPath $log -Encoding utf8 }
            if ($step.id -eq 'dism') { & "$env:SystemRoot\System32\Dism.exe" /Online /Cleanup-Image /RestoreHealth /English 2>&1 | Out-File -LiteralPath $log -Encoding utf8 }
            if ($step.id -eq 'dism-verify') { & "$env:SystemRoot\System32\Dism.exe" /Online /Cleanup-Image /ScanHealth /English 2>&1 | Out-File -LiteralPath $log -Encoding utf8 }
            if ($step.id -in @('sfc','sfc-verify')) {
                # SFC writes UTF-16 when redirected. Decode before saving readable UTF-8 logs.
                $previousEncoding = [Console]::OutputEncoding
                try {
                    [Console]::OutputEncoding = [Text.Encoding]::Unicode
                    if ($step.id -eq 'sfc') { & "$env:SystemRoot\System32\sfc.exe" /scannow 2>&1 | Out-File -LiteralPath $log -Encoding utf8 }
                    else { & "$env:SystemRoot\System32\sfc.exe" /verifyonly 2>&1 | Out-File -LiteralPath $log -Encoding utf8 }
                }
                finally { [Console]::OutputEncoding = $previousEncoding }
            }
            $step.exitCode=$LASTEXITCODE
            if ($LASTEXITCODE -eq 3010) { $step.status='review'; $step.message='操作完成，Windows 提示需要重启；本应用不会自动重启。' }
            elseif ($LASTEXITCODE -ne 0) { $step.status='failed'; $step.message="未成功完成（代码 $LASTEXITCODE），展开 Windows 输出查看原因。" }
            elseif ($step.id -in @('sfc','sfc-verify')) {
                $output = ([IO.File]::ReadAllText($log) -replace "`0", '')
                if ($output -match 'unable to fix|无法修复其中某些文件|无法修复其中一些文件|could not perform|无法执行请求的操作') { $step.status='failed'; $step.message='Windows 仍有无法修复的系统文件，或未能完成检查。请查看输出中的原因。' }
                elseif ($output -match 'did not find any integrity violations|未找到任何完整性(?:冲突|违规)|未發現任何完整性違規|沒有發現任何完整性違規') { $step.status='succeeded'; $step.message='Windows 未发现受保护系统文件损坏。' }
                elseif ($step.id -eq 'sfc-verify' -and $output -match 'found.*(?:corrupt|integrity violations)|找到.*(?:损坏|完整性违规)') { $step.status='failed'; $step.message='复检仍发现系统文件损坏，不能确认已修好。' }
                elseif ($step.id -eq 'sfc' -and $output -match 'successfully repaired|成功修复了这些文件') { $step.status='succeeded'; $step.message='Windows 报告已修复发现的受损系统文件，接下来进行复检。' }
                else { $step.status='review'; $step.message='系统文件检查已结束，但未能自动解读结论。请展开 Windows 输出确认结果。' }
            }
            elseif ($step.id -eq 'dism-verify') {
                $output = [IO.File]::ReadAllText($log)
                if ($output -match 'No component store corruption detected') { $step.status='succeeded'; $step.message='组件库深度复检通过。' }
                elseif ($output -match 'component store is repairable|component store cannot be repaired|component store is not repairable') { $step.status='failed'; $step.message='复检仍发现组件库损坏，不能确认已修好。' }
                else { $step.status='review'; $step.message='组件库复检没有完整结论，不能确认已修好。' }
            }
            else { $step.status='succeeded'; $step.message=$(if ($step.id -eq 'dns') { '旧的网址解析缓存已清除；是否恢复上网请重新打开网页确认。' } else { 'Windows 已报告组件库修复命令成功完成。' }) }
        } catch { $step.status='failed'; $step.message='执行失败：' + $_.Exception.Message }
        Save-Progress
    }
    $job.status = if (@($job.steps | Where-Object { $_.status -eq 'failed' }).Count) { 'failed' } elseif (@($job.steps | Where-Object { $_.status -eq 'review' }).Count) { 'review' } else { 'completed' }
    $job.message = if ($job.status -eq 'failed') { '所选操作已执行完，有项目未成功，请查看下方结果。' } elseif ($job.status -eq 'review') { '执行结束，有结果需要你查看。不会自动重启电脑。' } else { '所选操作已完成，请确认原来的问题是否消失。' }
} catch {
    $job.status='failed'; $job.message='修复未完成：' + $_.Exception.Message
    foreach ($step in $job.steps) { if ($step.status -in @('running','pending')) { $step.status='skipped' } }
} finally {
    $job.finishedAt=[DateTime]::UtcNow.ToString('o')
    Save-Progress
    if ($locked) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
