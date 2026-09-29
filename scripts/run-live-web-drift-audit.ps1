$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repo
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\canonical-web-deploy-guard.ps1
if ($LASTEXITCODE -ne 0) { throw 'Canonical web deployment guard failed.' }
Write-Host ''
Write-Host 'FAMILY&FLATS - LIVE WEB DRIFT AUDIT' -ForegroundColor Cyan
Write-Host 'Compares critical live cPanel files with committed canonical main. Password is not stored.'
$secure = Read-Host 'FTP password' -AsSecureString
$bstr = [IntPtr]::Zero
try {
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  $env:FF_FTP_PASSWORD = $plain
  python scripts\live-web-drift-audit.py
  if ($LASTEXITCODE -ne 0) { throw 'Live web drift detected.' }
  Write-Host 'LIVE WEB DRIFT AUDIT PASSED' -ForegroundColor Green
}
finally {
  Remove-Item Env:FF_FTP_PASSWORD -ErrorAction SilentlyContinue
  $plain = $null
  if ($bstr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}
Read-Host 'Press Enter to close'
