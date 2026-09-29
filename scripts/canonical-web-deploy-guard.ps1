$ErrorActionPreference = 'Stop'
$repo = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location $repo
$branch = 'main'
$head = (git rev-parse HEAD).Trim()
$current = "$(git branch --show-current)".Trim()
$remote = (git ls-remote origin "refs/heads/$branch" | ForEach-Object { ($_ -split '\s+')[0] }).Trim()
if (-not $remote) { throw 'BLOCKED: cannot resolve origin/main' }
if ($current -ne $branch) { throw "BLOCKED: web deployment must originate from main, current branch is $current" }
if ($head -ne $remote) { throw "BLOCKED: local web HEAD $head is not origin/main $remote" }
$dirty = @(git status --porcelain=v1)
if ($dirty.Count -gt 0) { throw 'BLOCKED: public-web worktree is not clean. Commit/reconcile changes before deployment.' }
$htaccess = Get-Content '.htaccess' -Raw
$gateway = Get-Content '_ff_fpup_gateway\index.php' -Raw
foreach ($token in @('employee','integrations')) {
  if ($htaccess -notmatch $token) { throw "BLOCKED: .htaccess is missing $token routing" }
  if ($gateway -notmatch $token) { throw "BLOCKED: PHP gateway is missing $token allowlist routing" }
}
Write-Output 'CANONICAL_WEB_DEPLOY_GUARD=PASS'
Write-Output "CANONICAL_WEB_COMMIT=$head"
