"""Live web drift audit: compares every deployable committed file with the live cPanel copy over FTPS.

8 Nov 2026: extended from 7 critical files to every file the deploy uploads, so "localhost/git is the
source of truth" can be proven. Line-ending-only differences are treated as equal for text files.
Credentials come from FF_FTP_* (local launcher) or FTP_SERVER/FTP_USERNAME/FTP_PASSWORD (GitHub secrets).
Exit code 0 = PASS, 2 = drift found.
"""
from __future__ import annotations
import fnmatch, ftplib, hashlib, os, ssl, subprocess, sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
HOST = os.environ.get('FF_FTP_HOST') or os.environ.get('FTP_SERVER') or 'p3plzcpnl505060.prod.phx3.secureserver.net'
USER = os.environ.get('FF_FTP_USER') or os.environ.get('FTP_USERNAME') or 'deploy@familyandflats.com'
PASSWORD = os.environ.get('FF_FTP_PASSWORD') or os.environ.get('FTP_PASSWORD') or ''
# Same exclusions as .github/workflows/deploy.yml: these never go live.
EXCLUDE = ['.git*', '*/.git*', '.github/*', '_familyflats_redesign_stage/*', 'website-design-lab/*',
           '_to_delete/*', '_backup*/*', '*/_backup*/*', '*.md']
TEXT = ('.html', '.htm', '.css', '.js', '.json', '.txt', '.xml', '.php', '.svg', '.cms', '.webmanifest', '.htaccess')

def sha(b: bytes) -> str: return hashlib.sha256(b).hexdigest()
def norm(b: bytes) -> bytes: return b.replace(b'\r\n', b'\n')
def tracked() -> list[str]:
    out = subprocess.run(['git', '-c', 'core.quotepath=off', 'ls-files', '-z'], cwd=REPO, capture_output=True, check=True).stdout
    files = [p for p in out.decode('utf-8').split('\0') if p]
    return sorted(p for p in files if not any(fnmatch.fnmatch(p, x) for x in EXCLUDE))
def blob(path: str) -> bytes:
    c = subprocess.run(['git', 'show', f'HEAD:{path}'], cwd=REPO, capture_output=True)
    if c.returncode: raise RuntimeError(f'missing committed file: {path}')
    return c.stdout

def main() -> None:
    if not PASSWORD: raise RuntimeError('FTP password is required (FF_FTP_PASSWORD or FTP_PASSWORD)')
    ftp = ftplib.FTP_TLS(context=ssl._create_unverified_context(), timeout=60)
    ftp.connect(HOST, 21); ftp.login(USER, PASSWORD); ftp.prot_p(); ftp.set_pasv(True)
    files = tracked(); drift = []; same = 0
    try:
        for path in files:
            chunks: list[bytes] = []
            try: ftp.retrbinary('RETR ' + path, chunks.append)
            except Exception as exc:
                drift.append((path, 'MISSING_LIVE', str(exc)[:80])); continue
            live, want = b''.join(chunks), blob(path)
            if sha(live) == sha(want) or (path.lower().endswith(TEXT) and sha(norm(live)) == sha(norm(want))): same += 1
            else: drift.append((path, 'DIFF', 'live content differs from committed HEAD'))
    finally:
        try: ftp.quit()
        except Exception: pass
    print(f'CHECKED={len(files)} SAME={same} DRIFT={len(drift)}')
    print('LIVE_WEB_DRIFT=PASS' if not drift else 'LIVE_WEB_DRIFT=FAIL')
    for item in drift: print('|'.join(item))
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a', encoding='utf-8') as fh:
            fh.write(f'## Live web drift audit\n\nChecked {len(files)} files: {same} identical, {len(drift)} different.\n\n')
            for p, kind, note in drift[:200]: fh.write(f'- `{p}`: {kind} ({note})\n')
    raise SystemExit(0 if not drift else 2)

if __name__ == '__main__': main()
