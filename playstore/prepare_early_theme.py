#!/usr/bin/env python3
"""Prevent public website theme controls from flashing in Play Android WebView.

This patch touches only a reconstructed Play candidate. Website deployment and
4.39 beta APK are unaffected. Exact anchors prevent silent drift.
"""
from pathlib import Path

def apply(root:Path):
    path=root/'app/src/main/java/com/marketmarney/mobile/MainActivity.java'
    src=path.read_text(encoding='utf-8')
    method='''    private void enforcePlayEarlyLight(WebView target){
        if(destroyed||target!=web)return;
        // Exact selectors observed on the public MarketMarney HTML. Scoped to
        // this Android WebView; the website remains user-selectable.
        String css="#mmThemeSwitch,.mm-theme-switch,[data-mm-theme-choice],"
            +".sh-theme-switch,#shTheme,.mm80-themes,.j-theme,[data-theme-toggle]"
            +"{display:none!important;visibility:hidden!important}";
        String script="(function(){var root=document.documentElement;if(!root)return;"
            +"var s=document.getElementById('mm-play-early-light');"
            +"if(!s){s=document.createElement('style');s.id='mm-play-early-light';"
            +"s.textContent="+JSONObject.quote(css)+";(document.head||root).appendChild(s);}"
            +"root.setAttribute('data-mm-theme','light');root.setAttribute('data-theme','light');"
            +"root.style.setProperty('color-scheme','light','important');})()";
        target.evaluateJavascript(script,null);
    }
'''
    needle='    private void adapt(WebView v,String url){'
    if src.count(needle)!=1:
        raise RuntimeError('Expected one adapt method')
    src=src.replace(needle,method+needle,1)
    old='''            @Override public void onPageCommitVisible(WebView v,String url){if(v==web&&own(url)){pageReady(v,url);endLaunchAnimation(true,"first-frame");}}'''
    new='''            @Override public void onPageCommitVisible(WebView v,String url){
                if(v==web&&own(url)){
                    enforcePlayEarlyLight(v);
                    pageReady(v,url);
                    endLaunchAnimation(true,"first-frame");
                }
            }'''
    if src.count(old)!=1:
        raise RuntimeError('Expected one onPageCommitVisible handler')
    path.write_text(src.replace(old,new,1),encoding='utf-8')

if __name__=='__main__':
    import sys
    apply(Path(sys.argv[1] if len(sys.argv)>1 else 'android439'))
    print('Play candidate only: native early light-theme controls guard applied')
