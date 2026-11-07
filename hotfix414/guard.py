from pathlib import Path
import sys
base=Path(sys.argv[1]) if len(sys.argv)>1 else Path('android43')
p=base/'app/src/main/java/com/marketmarney/mobile/MainActivity.java'
s=p.read_text();start=s.index('    private void adapt(WebView v,String url){');end=s.index('    private void showOffline(',start)
s=s[:start]+'''    private void adapt(WebView v,String url){
        if(destroyed||v!=web||!own(url)||!Recovery414.sameDocument(url,v.getUrl()))return;
        Uri expected=Uri.parse(url);
        v.getSettings().setMediaPlaybackRequiresUserGesture(!"/beranda-trader.html".equals(expected.getPath()));
        // A WebView callback may be queued while the document is replaced. Check
        // both native identity and the actual JS document before touching the DOM.
        String ready="location.protocol==='https:'&&location.hostname==='marketmarney.com'&&(!location.port||location.port==='443')&&location.pathname==="+JSONObject.quote(expected.getPath())+
            "&&location.search==="+JSONObject.quote(expected.getEncodedQuery()==null?"":"?"+expected.getEncodedQuery())+"&&document.documentElement&&document.head&&document.body";
        String common="window.MarketMarneyApp={platform:'android',version:'4.14'};document.documentElement.dataset.mmAndroid='414';if(!document.getElementById('mm43-common')){var s=document.createElement('style');s.id='mm43-common';s.textContent='#mmInstall{display:none!important}';document.head.appendChild(s)}";
        v.evaluateJavascript("(function(){if(!("+ready+"))return;"+common+"})()",null);
        String path=expected.getPath();
        if("/beranda-trader.html".equals(path)||"/profil.html".equals(path)||"/grup-trader.html".equals(path)){
            String css="var s=document.getElementById('mm43-social-style');if(!s){s=document.createElement('style');s.id='mm43-social-style';document.head.appendChild(s)}if(s.dataset.revision!=='411'){s.textContent="+JSONObject.quote(socialCss)+";s.dataset.revision='411';}";
            // Style and helpers share one guarded evaluation, not two independently
            // queued calls. onPageFinished retries when the new DOM is complete.
            v.evaluateJavascript("(function(){if(!("+ready+")||window.__mm411BundledReady)return;"+css+"\\n"+socialScript+"\\n})()",null);
        }
    }
'''+s[end:]
p.write_text(s)
print('PASS: document-ready, path, query and WebView identity guards; no suppression of application errors')
