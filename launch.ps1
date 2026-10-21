$ErrorActionPreference = 'Stop'
$appFolder = $PSScriptRoot
$url = 'http://127.0.0.1:4173'
$nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
$nodeExecutable = if ($nodeCommand) { $nodeCommand.Source } else { $null }
if (-not $nodeExecutable) {
    $options = @(
        (Join-Path $env:ProgramFiles 'nodejs\node.exe'),
        (Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe')
    )
    $nodeExecutable = $options | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}
if (-not $nodeExecutable) { throw 'Node.js 18+ is required. Install it from https://nodejs.org/ and run start.cmd again.' }
$connected = $false
try {
    $service = Invoke-RestMethod "$url/api/system" -TimeoutSec 2
    if ($service.app -ne 'jingjie-cleaner') { throw 'Port 4173 is used by a different application.' }
    $connected = $true
} catch { }
if (-not $connected) {
    $serviceProcess = Start-Process -FilePath $nodeExecutable -ArgumentList ('"' + (Join-Path $appFolder 'server.mjs') + '"') -WorkingDirectory $appFolder -WindowStyle Hidden -PassThru
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 200
        try {
            $service = Invoke-RestMethod "$url/api/system" -TimeoutSec 1
            if ($service.app -eq 'jingjie-cleaner') { $connected = $true; break }
        } catch { }
        if ($serviceProcess.HasExited) { break }
    }
    if (-not $connected) { throw 'Could not start Jingjie. Check whether port 4173 is already in use.' }
    # The PID belongs only to the process this launcher created.
    @{ id = $serviceProcess.Id; started = $serviceProcess.StartTime.ToUniversalTime().Ticks; executable = $nodeExecutable } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $appFolder '.service-pid') -Encoding utf8
}
$edgeCandidates = @(
    (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe')
)
$edgeExecutable = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if ($edgeExecutable) {
    Start-Process -FilePath $edgeExecutable -ArgumentList "--app=$url", '--window-size=1320,900'
} else {
    Start-Process $url
}
