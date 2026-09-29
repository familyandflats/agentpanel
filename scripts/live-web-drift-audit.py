from __future__ import annotations
import ftplib, hashlib, os, ssl, subprocess
from io import BytesIO
from pathlib import Path
REPO=Path(__file__).resolve().parents[1]
HOST=os.environ.get('FF_FTP_HOST','p3plzcpnl505060.prod.phx3.secureserver.net')
USER=os.environ.get('FF_FTP_USER','deploy@familyandflats.com')
PASSWORD=os.environ.get('FF_FTP_PASSWORD','')
CRITICAL=['.htaccess','_ff_fpup_gateway/index.php','header.html','footer.html','index.html','robots.txt','sitemap.xml']
def sha(b:bytes)->str:return hashlib.sha256(b).hexdigest()
def git_blob(path:str)->bytes:
 c=subprocess.run(['git','show',f'HEAD:{path}'],cwd=REPO,capture_output=True)
 if c.returncode: raise RuntimeError(f'missing committed file: {path}')
 return c.stdout
def main():
 if not PASSWORD: raise RuntimeError('FF_FTP_PASSWORD is required')
 ftp=ftplib.FTP_TLS(context=ssl._create_unverified_context(),timeout=60); ftp.connect(HOST,21); ftp.login(USER,PASSWORD); ftp.prot_p(); ftp.set_pasv(True)
 drift=[]
 try:
  for path in CRITICAL:
   chunks=[]
   try: ftp.retrbinary('RETR '+path,chunks.append)
   except Exception as exc: drift.append((path,'MISSING_LIVE',str(exc))); continue
   if sha(b''.join(chunks))!=sha(git_blob(path)): drift.append((path,'DIFF','live checksum differs from committed HEAD'))
 finally:
  try: ftp.quit()
  except Exception: pass
 print('LIVE_WEB_DRIFT=PASS' if not drift else 'LIVE_WEB_DRIFT=FAIL')
 for item in drift: print('|'.join(item))
 raise SystemExit(0 if not drift else 2)
if __name__=='__main__': main()
