"""Read-only device smoke: real guest pages, never submits credentials or writes content."""
from pathlib import Path
import subprocess,time,xml.etree.ElementTree as E,json
OUT=Path('device44');OUT.mkdir(exist_ok=True)
PKG='com.marketmarney.mobile.beta44'
LABELS={'Beranda','Berita','Market Live','Social Marney'}
results=[]
def adb(*args,timeout=45,check=True):
    p=subprocess.run(['adb',*args],capture_output=True,timeout=timeout)
    if check and p.returncode:raise RuntimeError(p.stderr.decode(errors='replace') or p.stdout.decode(errors='replace'))
    return p.stdout
def dump(tab):
    adb('shell','uiautomator','dump','/sdcard/window44.xml')
    raw=adb('exec-out','cat','/sdcard/window44.xml');(OUT/f'tab-{tab}.xml').write_bytes(raw)
    root=E.fromstring(raw)
    texts=[n.attrib.get('text','') for n in root.iter()]+[n.attrib.get('content-desc','') for n in root.iter()]
    return root,'\n'.join(texts)
def check(name,value):
    if not value:raise AssertionError(name)
    results.append(name);print('PASS:',name,flush=True)
adb('install','-r','apk/Marney44.apk',timeout=90)
adb('shell','wm','size','480x900');adb('shell','wm','density','180')
(OUT/'webview.txt').write_bytes(adb('shell','dumpsys','webviewupdate'))
try:
    for tab in range(4):
        adb('shell','am','force-stop',PKG);adb('logcat','-c')
        adb('shell','am','start','-W','-n',PKG+'/com.marketmarney.mobile.MainActivity','--ei','startTab',str(tab))
        time.sleep(7);last='';root=None;ready=False
        for attempt in range(9):
            root,last=dump(tab)
            ready=(tab==0 and ('MarketMarney' in last or 'Market Intelligence' in last) and 'Beranda' in last) or (tab==1 and 'NEWSROOM' in last and 'artikel' in last and 'Belum terhubung' not in last) or (tab==2 and ('Market Intelligence Desk' in last or 'TRADINGVIEW / CHART TERMINAL' in last)) or (tab==3 and 'Cerita pasar.' in last and 'Linimasa' in last)
            if ready:break
            time.sleep(4)
        (OUT/f'tab-{tab}.png').write_bytes(adb('exec-out','screencap','-p'))
        check(f'Tab {tab}: process running',bool(adb('shell','pidof',PKG).strip()))
        check(f'Tab {tab}: four native destinations',LABELS.issubset({n.attrib.get('content-desc','') for n in root.iter()}))
        check(f'Tab {tab}: expected page',ready)
        check(f'Tab {tab}: no 404','Halaman ini tidak ditemukan.' not in last and 'MARKETMARNEY / 404' not in last)
        logs=adb('logcat','-d','-s','AndroidRuntime:E');(OUT/f'errors-{tab}.txt').write_bytes(logs)
        check(f'Tab {tab}: no fatal crash',('Process: '+PKG).encode() not in logs)
        if tab==3:
            check('Social: all top sections',all(t in last for t in ['Linimasa','Reels','Pesan','Jelajah','Profil']))
            check('Social: guest still requires authentication','Masuk dengan email' in last)
    (OUT/'RESULT.txt').write_text('PASS: APK installed and real guest pages verified. Authenticated feed, login and writes are not tested by this job.')
finally:
    (OUT/'results.json').write_text(json.dumps({'passed_count':len(results),'checks':results,'real_google_login_tested':False,'production_content_changed':False},indent=2))
    (OUT/'chromium-errors.txt').write_bytes(adb('logcat','-d','-s','chromium:E',check=False))
