param([Parameter(Mandatory=$true)][string]$ResultDirectory)
$ErrorActionPreference = 'Stop'
$result = @{ exitCode=$null; output=''; error=''; timedOut=$false }
$process = New-Object System.Diagnostics.Process
try {
    $process.StartInfo = New-Object System.Diagnostics.ProcessStartInfo
    $process.StartInfo.FileName = Join-Path $env:SystemRoot 'System32\DISM.exe'
    # This worker only checks recorded component health. It cannot repair or clean.
    $process.StartInfo.Arguments = '/Online /Cleanup-Image /CheckHealth /English'
    $process.StartInfo.UseShellExecute = $false
    $process.StartInfo.CreateNoWindow = $true
    $process.StartInfo.RedirectStandardOutput = $true
    $process.StartInfo.RedirectStandardError = $true
    [void]$process.Start()
    $stdout = $process.StandardOutput.ReadToEndAsync()
    $stderr = $process.StandardError.ReadToEndAsync()
    if (-not $process.WaitForExit(90000)) { $result.timedOut=$true; $process.Kill() }
    $process.WaitForExit()
    $result.output = $stdout.Result + "`n" + $stderr.Result
    if (-not $result.timedOut) { $result.exitCode=$process.ExitCode }
} catch { $result.error=$_.Exception.Message }
finally { $process.Dispose() }
$utf8 = New-Object System.Text.UTF8Encoding($false)
$json = $result | ConvertTo-Json -Compress
[IO.File]::WriteAllText((Join-Path $ResultDirectory 'result.tmp'), $json, $utf8)
[IO.File]::Move((Join-Path $ResultDirectory 'result.tmp'), (Join-Path $ResultDirectory 'result.json'))
