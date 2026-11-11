#!/usr/bin/env python3
"""Instrument Play-only WebView readiness without logging user data.

This is diagnostic code only: it does not change readiness thresholds or
report success on placeholders. It logs DOM lengths / load state and native
network state to identify a failing home or XAUWar load.
"""
from pathlib import Path

def apply(root: Path) -> None:
    path=root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java'
    data=path.read_text(encoding='utf-8')
    marker='''            if(++xauContentPolls>=68){
                showFailure("EMPTY","Konten "+labels[tab]+" belum dapat ditampilkan. Periksa koneksi lalu coba lagi.");'''
    if data.count(marker)!=1:
        raise RuntimeError(f'Play readiness probe changed: expected one anchor; got {data.count(marker)}')
    diagnostic='''            if(xauContentPolls==0||xauContentPolls==12||xauContentPolls==36||xauContentPolls==65){
                final int observedPoll=xauContentPolls;
                final int observedTab=tab;
                final String status="poll="+observedPoll+" tab="+observedTab+" progress="+target.getProgress()
                    +" online="+nativeOnline+" validated="+nativeValidated;
                target.evaluateJavascript("(function(){var a=document.querySelector('#app');var b=document.body;"
                    +"var r=a?a.getBoundingClientRect():null;"
                    +"return [document.readyState,!!a,a?(a.innerText||'').length:0,r?Math.round(r.height):0,"
                    +"b?(b.innerText||'').length:0,location.pathname]})()",
                    snapshot->Log.i("MMPLAY_DIAG",status+" dom="+snapshot));
            }
            if(++xauContentPolls>=68){
                Log.w("MMPLAY_DIAG","timeout tab="+tab+" progress="+target.getProgress()
                    +" online="+nativeOnline+" validated="+nativeValidated);
                showFailure("EMPTY","Konten "+labels[tab]+" belum dapat ditampilkan. Periksa koneksi lalu coba lagi.");'''
    path.write_text(data.replace(marker,diagnostic,1),encoding='utf-8')

if __name__=='__main__':
    import sys
    apply(Path(sys.argv[1] if len(sys.argv)>1 else 'android439'))
    print('Play diagnostics active: no user data; readiness semantics unchanged')
