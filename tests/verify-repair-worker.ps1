$ErrorActionPreference = 'Stop'
$sourcePath = Join-Path $PSScriptRoot '..\repair-system.ps1'
$source = [IO.File]::ReadAllText($sourcePath)
$tokens = $null; $errors = $null
[System.Management.Automation.Language.Parser]::ParseFile($sourcePath, [ref]$tokens, [ref]$errors) | Out-Null
if ($errors.Count) { throw ($errors | Out-String) }
# Replace every native repair invocation with deterministic in-process fixtures.
$source = $source.Replace('& "$env:SystemRoot\System32\ipconfig.exe"', 'Test-Dns')
$source = $source.Replace('& "$env:SystemRoot\System32\Dism.exe"', 'Test-Dism')
$source = $source.Replace('& "$env:SystemRoot\System32\sfc.exe"', 'Test-Sfc')
if ($source -match '&\s*"\$env:SystemRoot' -or $source -notmatch 'Test-Dns' -or $source -notmatch 'Test-Dism' -or $source -notmatch 'Test-Sfc') { throw 'Unsafe test substitution' }
$source = $source.Replace('function Get-SystemFreeBytes {', 'function Unused-SystemFreeBytes {')
if ($source -match 'function Get-SystemFreeBytes') { throw 'Unsafe disk fixture substitution' }
function Get-SystemFreeBytes { if ($script:testCase -eq 'lowdisk') { return 1GB }; return 20GB }
function Test-Dns { $script:executed.Add('dns'); 'Successfully flushed the DNS Resolver Cache.'; $global:LASTEXITCODE=0 }
function Test-Dism {
    if ($args -contains '/ScanHealth') { $script:executed.Add('dism-verify'); if ($script:testCase -eq 'verifybad') { 'The component store is repairable.' } else { 'No component store corruption detected.' }; $global:LASTEXITCODE=0 }
    else { $script:executed.Add('dism'); 'The restore operation completed successfully.'; $global:LASTEXITCODE=$script:dismCode }
}
function Test-Sfc {
    if ($args -contains '/verifyonly') { $script:executed.Add('sfc-verify'); if ($script:testCase -eq 'sfcverifybad') { 'Windows Resource Protection found integrity violations.' } else { 'Windows 资源保护未找到任何完整性违规。' } }
    else { $script:executed.Add('sfc'); $script:sfcOutput }
    $global:LASTEXITCODE=0
}
$fixture = Join-Path $PSScriptRoot ('..\work\worker-fixture-' + [Guid]::NewGuid().ToString())
[IO.Directory]::CreateDirectory($fixture) | Out-Null
foreach ($case in @('dns', 'full', 'failure', 'reboot', 'healthy', 'repaired', 'unfixed', 'verifybad', 'sfcverifybad', 'lowdisk')) {
    $script:testCase=$case
    $directory = Join-Path $fixture $case
    [IO.Directory]::CreateDirectory($directory) | Out-Null
    $script:executed = New-Object 'System.Collections.Generic.List[string]'
    $script:dismCode = if ($case -eq 'failure') { 87 } elseif ($case -eq 'reboot') { 3010 } else { 0 }
    $script:sfcOutput = switch ($case) { 'repaired' { 'Windows 资源保护找到了损坏文件并成功修复了这些文件。' } 'unfixed' { 'Windows Resource Protection found corrupt files but was unable to fix some of them.' } 'full' { 'Synthetic unknown SFC output' } default { 'Windows 资源保护未找到任何完整性违规。' } }
    $actions = if ($case -eq 'dns') { 'flush-dns' } else { 'flush-dns,repair-components' }
    & ([scriptblock]::Create($source)) -JobDirectory $directory -Actions $actions
    $result = Get-Content -LiteralPath (Join-Path $directory 'progress.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    $expected = if ($case -in @('dns','healthy','repaired')) { 'completed' } elseif ($case -in @('failure','unfixed','verifybad','sfcverifybad','lowdisk')) { 'failed' } else { 'review' }
    if ($result.status -ne $expected) { throw "Unexpected $case status: $($result | ConvertTo-Json -Depth 8)" }
    $order = $script:executed -join ','
    $expectedOrder = if ($case -eq 'dns') { 'dns' } elseif ($case -eq 'lowdisk') { '' } elseif ($case -in @('failure','reboot')) { 'dns,dism,sfc,sfc-verify' } elseif ($case -in @('full','unfixed')) { 'dns,dism,dism-verify,sfc' } else { 'dns,dism,dism-verify,sfc,sfc-verify' }
    if ($order -ne $expectedOrder) { throw "Unexpected order: $order" }
    if ($case -eq 'reboot' -and $result.steps[1].message -notmatch '重启') { throw 'Missing reboot notice' }
    if ($case -eq 'failure' -and $result.steps[1].exitCode -ne 87) { throw 'Missing failure code' }
    if (-not $result.finishedAt) { throw 'Missing finish time' }
    Write-Output "PASS worker $case : selected order, status, exit codes and persistence"
}
Write-Output 'No native repair or elevation was executed.'
