"""Read-only Android smoke: install, open actual pages, verify content and bottom nav."""
from pathlib import Path
import subprocess,time,xml.etree.ElementTree as E,json,re
OUT=Path('android-smoke43');OUT.mkdir(exist_ok=True)
PKG='com.marketmarney.mobile.beta43'
LABELS={'Beranda','Berita','Market Live','Social Marney'}
results=[]
def adb(*args,timeout=35,check=True):
    p=subprocess.run(['adb',*args],capture_output=True,timeout=timeout)
    if check and p.returncode:raise RuntimeError(p.stderr.decode(errors='replace') or p.stdout.decode(errors='replace'))
    return p.stdout

def dump(tab):
    adb('shell','uiautomator','dump','/sdcard/window43.xml')
    data=adb('exec-out','cat','/sdcard/window43.xml')
    (OUT/f'tab-{tab}.xml').write_bytes(data)
    root=E.fromstring(data)
    texts=[n.attrib.get('text','') for n in root.iter()]+[n.attrib.get('content-desc','') for n in root.iter()]
    return root,'\n'.join(texts)

def screen(tab):
    (OUT/f'tab-{tab}.png').write_bytes(adb('exec-out','screencap','-p'))

def check(name,value):
    if not value:raise AssertionError(name)
    results.append(name);print('PASS:',name,flush=True)

adb('install','-r','apk/Marney43.apk',timeout=80)
adb('shell','wm','size','480x900')
adb('shell','wm','density','180')
(OUT/'webview-provider.txt').write_bytes(adb('shell','dumpsys','webviewupdate'))
try:
    for tab in range(4):
        adb('shell','am','force-stop',PKG)
        adb('logcat','-c')
        adb('shell','am','start','-W','-n',PKG+'/com.marketmarney.mobile.MainActivity','--ei','startTab',str(tab))
        time.sleep(7)
        last='';root=None
        for attempt in range(7):
            root,last=dump(tab)
            ready=(tab==0 and ('MarketMarney' in last or 'Market Intelligence' in last) and ('BERANDA' in last or 'Beranda' in last)) or (tab==1 and 'NEWSROOM' in last and 'artikel' in last and 'Belum terhubung' not in last) or (tab==2 and ('Market Intelligence Desk' in last or 'TRADINGVIEW / CHART TERMINAL' in last)) or (tab==3 and 'Temukan komunitas Anda.' in last and 'Linimasa' in last)
            if ready:break
            time.sleep(4)
        screen(tab)
        check(f'Tab {tab}: process running',bool(adb('shell','pidof',PKG).strip()))
        check(f'Tab {tab}: all four navigation buttons',LABELS.issubset({n.attrib.get('content-desc','') for n in root.iter()}))
        check(f'Tab {tab}: no missing page', 'Halaman ini tidak ditemukan.' not in last and 'MARKETMARNEY / 404' not in last)
        check(f'Tab {tab}: no website boot error','Gagal terhubung ke server MarketMarney' not in last)
        check(f'Tab {tab}: expected page contents',ready)
        logs=adb('logcat','-d','-s','AndroidRuntime:E')
        (OUT/f'errors-{tab}.txt').write_bytes(logs)
        check(f'Tab {tab}: no fatal app crash',('Process: '+PKG).encode() not in logs)
        if tab==1:
            check('News: category chips available',all(x in last for x in ['Semua','Emas','Forex']))
        if tab==3:
            check('Social: account stays private for guest','Masuk dengan email' in last)
    (OUT/'RESULT.txt').write_text('PASS: Four tabs installed and actual page contents verified on Android emulator. Real Google login and authenticated posting not tested.')
finally:
    (OUT/'results.json').write_text(json.dumps({'checks_passed':results,'passed_count':len(results),'production_data_mutated':False,'real_google_login_tested':False},indent=2))
    (OUT/'chromium-errors.txt').write_bytes(adb('logcat','-d','-s','chromium:E',check=False))
