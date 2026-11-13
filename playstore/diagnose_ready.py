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
    updated=data.replace(marker,diagnostic,1)
    # Play candidate only: capture paint-state facts, never text, URLs, cookies
    # or any user identifier. A DOM-ready callback alone is not proof of paint.
    method='''    private void reportPlayRender(WebView target,String stage){
        if(destroyed||target!=web||!own(target.getUrl()))return;
        String js="(function(){function st(e){if(!e)return null;"
            +"var s=getComputedStyle(e),r=e.getBoundingClientRect();"
            +"return [e.tagName,(e.id||'').slice(0,32),Math.round(r.x),Math.round(r.y),"
            +"Math.round(r.width),Math.round(r.height),s.display,s.visibility,s.opacity,"
            +"s.contentVisibility,s.color,s.backgroundColor,s.zIndex];}"
            +"var a=document.querySelector('#app');"
            +"var n=document.elementFromPoint(innerWidth/2,innerHeight/2);"
            +"return [document.readyState,innerWidth,innerHeight,document.visibilityState,"
            +"st(document.documentElement),st(document.body),st(a),"
            +"st(a&&a.firstElementChild),st(n),a?a.children.length:-1]})()";
        target.evaluateJavascript(js,result->Log.i("MMPLAY_RENDER",
            stage+" tab="+tab+" native="+target.getWidth()+"x"+target.getHeight()
            +" visible="+target.getVisibility()+" alpha="+target.getAlpha()
            +" parent="+(target.getParent()==frame)+" frame="+frame.getWidth()+"x"+frame.getHeight()
            +" children="+frame.getChildCount()+" dom="+result));
    }
'''
    anchor="    private void probeXauVisible(WebView target,String url,long token){"
    if updated.count(anchor)!=1:
        raise RuntimeError('Render diagnostic method insertion anchor changed')
    updated=updated.replace(anchor,method+anchor,1)
    ready='''        Log.i("MMPLAY_PAGE","ready tab="+tab+" path="+Uri.parse(url).getPath());'''
    hook='''        Log.i("MMPLAY_PAGE","ready tab="+tab+" path="+Uri.parse(url).getPath());
        reportPlayRender(target,"ready");
        final int observedTab=tab;
        frame.postDelayed(()->{
            if(!destroyed&&web==target&&tab==observedTab)reportPlayRender(target,"after-2s");
        },1800);'''
    if updated.count(ready)!=1:
        raise RuntimeError('Cannot attach post-readiness render snapshot')
    updated=updated.replace(ready,hook,1)
    path.write_text(updated,encoding='utf-8')

if __name__=='__main__':
    import sys
    apply(Path(sys.argv[1] if len(sys.argv)>1 else 'android439'))
    print('Play diagnostics active: no user data; readiness semantics unchanged')
