"""Apply the Play candidate's Home fallback after reconstructing the 4.38.5 Android tree."""
from pathlib import Path
from shutil import copyfile
import sys

root = Path(sys.argv[1])
here = Path(__file__).resolve().parent
pkg = Path("java/com/marketmarney/mobile")
source = root / "app/src/main" / pkg
p = source / "MainActivity.java"
src = p.read_text()

def once(before, after):
    global src
    if src.count(before) != 1:
        raise RuntimeError("Unexpected MainActivity baseline for " + before[:110])
    src = src.replace(before, after, 1)

once("    private long tvReadyToken;", """    private HomeNews homeNews;
    private HomeNewsView homeNewsView;
    private long homeProbeGeneration;
    private boolean homeProbing;
    private long tvReadyToken;""")
once("    private boolean marketmarneyTvDocument(String url){", '''    private boolean homeDocument(String url){
        if(tab!=HOME||!own(url))return false;
        Uri u=Uri.parse(url);
        String path=u.getPath(),hash=u.getFragment();
        return ("/index.html".equals(path)||"/".equals(path))&&u.getQuery()==null
            &&(hash==null||hash.isEmpty()||"mm-app-home".equals(hash));
    }
    private void clearHomeNews(){
        homeProbeGeneration++;
        homeProbing=false;
        if(homeNewsView!=null){
            frame.removeView(homeNewsView);
            homeNewsView=null;
        }
        if(web!=null)web.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_AUTO);
    }
    private void showHomeNews(){
        if(destroyed||web==null||tab!=HOME||homeNewsView!=null)return;
        if(homeNews==null)homeNews=new HomeNews(this,(rows,stored,stamp)->{
            if(homeNewsView==null)return;
            homeNewsView.setNews(rows,stored,stamp);
            if(mainFailed)homeNewsView.setStatus("Koneksi ke Beranda belum tersedia.");
            if(!rows.isEmpty()){
                endLaunchAnimation(true,"home-news");
                Log.i("MMAPP_HOME","native articles="+rows.size()+" saved="+stored);
            }
        });
        homeNewsView=new HomeNewsView(this,()->{
            if(homeNews!=null)homeNews.open(true);
            if(web!=null&&homeDocument(lastUrl))web.reload();
        });
        web.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS);
        frame.addView(homeNewsView,new FrameLayout.LayoutParams(-1,-1));
        homeNews.open(false);
    }
    private void probeHome(WebView target,String url,long generation,int attempt){
        if(destroyed||generation!=homeProbeGeneration||target!=web||homeNewsView==null
                ||mainFailed||!homeDocument(target.getUrl()))return;
        // A publisher headline with visible text and pixels must be in the viewport.
        // A loaded empty #app, a hero wordmark, a menu or a loading message is insufficient.
        String read="(function(){var nodes=document.querySelectorAll('#app #headlineCarousel h2,#app .mm90-story h3,#app .card[data-id] h3');"
            +"for(var i=0;i<nodes.length;i++){var n=nodes[i],r=n.getBoundingClientRect();"
            +"if(!(n.innerText||'').trim()||r.width<30||r.height<10)continue;"
            +"var l=Math.max(0,r.left),t=Math.max(0,r.top),b=Math.min(innerHeight,r.bottom),right=Math.min(innerWidth,r.right);"
            +"if(b-t<8||right-l<20)continue;var hit=document.elementFromPoint((l+right)/2,(t+b)/2);"
            +"if(hit&&(hit===n||n.contains(hit))&&getComputedStyle(n).visibility==='visible')return true;}return false;})()";
        target.evaluateJavascript(read,result->{
            if(destroyed||generation!=homeProbeGeneration||target!=web||homeNewsView==null
                    ||mainFailed||!homeDocument(target.getUrl()))return;
            if("true".equals(result)&&!homeNewsView.isReading()&&!homeNewsView.hasBeenUsed()){
                clearHomeNews();completePageReady(target,url);endLaunchAnimation(true,"home-web-headline");
                Log.i("MMAPP_HOME","web headline visible");return;
            }
            if(attempt<18)frame.postDelayed(()->probeHome(target,url,generation,attempt+1),360);
            else homeProbing=false;
        });
    }
    private boolean marketmarneyTvDocument(String url){''')
once('    private long tvReadyToken;', '    private String verifiedHomeUrl="";\n    private long tvReadyToken;')
once('                clearHomeNews();completePageReady(target,url);endLaunchAnimation(true,"home-web-headline");', '                verifiedHomeUrl=url;clearHomeNews();completePageReady(target,url);endLaunchAnimation(true,"home-web-headline");')
once('        if(marketmarneyTvDocument(url)){','''        if(homeDocument(url)&&homeDocument(target.getUrl())){
            if(Recovery414.sameDocument(url,verifiedHomeUrl)){completePageReady(target,url);return;}
            showHomeNews();
            completePageReady(target,url);
            if(!homeProbing){
                homeProbing=true;
                probeHome(target,url,homeProbeGeneration,0);
            }
            return;
        }
        if(marketmarneyTvDocument(url)){''')
once('        resetTvReadyProbe();\n        boolean pending=', '        if(selected!=HOME){clearHomeNews();verifiedHomeUrl="";}\n        resetTvReadyProbe();\n        boolean pending=')
once('if(destroyed||web!=target||firstPaint||offline!=null)return;', 'if(destroyed||web!=target||firstPaint||offline!=null||homeNewsView!=null)return;')
once('        String current=web.getUrl();\n        if(url.equals(current)', '''        String current=web.getUrl();
        if(homeDocument(url))showHomeNews();else clearHomeNews();
        if(url.equals(current)''')
once('                if(v!=web)return;resetTvReadyProbe();lastAdaptedDocument=', '''                if(v!=web)return;
                verifiedHomeUrl="";
                if(homeDocument(url)){
                    homeProbeGeneration++;homeProbing=false;showHomeNews();
                }else clearHomeNews();
                resetTvReadyProbe();lastAdaptedDocument=''')
once('                boolean next=tab==SOCIAL&&"mm44-reels"', '''                if(!homeDocument(url)){verifiedHomeUrl="";if(homeNewsView!=null)clearHomeNews();}
                boolean next=tab==SOCIAL&&"mm44-reels"''')
once('            lastUrl=own(web.getUrl())?web.getUrl():BASE+paths[tab];resumePage(web);', '''            lastUrl=own(web.getUrl())?web.getUrl():BASE+paths[tab];resumePage(web);
            if(homeDocument(lastUrl))pageReady(web,lastUrl);''')
once('                Log.i("MM45_NAV","shared index tab=', '''                if(homeDocument(document))pageReady(target,document);
                Log.i("MM45_NAV","shared index tab=''')
once('                if(restored){lastUrl=web.getUrl();firstPaint=true;progress.setVisibility(View.GONE);}', '''                if(restored){lastUrl=web.getUrl();firstPaint=true;progress.setVisibility(View.GONE);if(homeDocument(lastUrl))pageReady(web,lastUrl);}''')
once('        LinearLayout box=column();box.setGravity(Gravity.CENTER);box.setPadding(dp(24),dp(18),dp(24),dp(18));box.setBackground(DepthStyle423.screen(this,true));','''        if(homeDocument(lastUrl)){
            showHomeNews();
            if(homeNewsView!=null)homeNewsView.setStatus("Koneksi ke Beranda belum tersedia.");
            return;
        }
        LinearLayout box=column();box.setGravity(Gravity.CENTER);box.setPadding(dp(24),dp(18),dp(24),dp(18));box.setBackground(DepthStyle423.screen(this,true));''')
once('if(allowRecovery&&online&&validated&&offline!=null&&mainFailed&&recoverableNetworkFailure()){','if(allowRecovery&&online&&validated&&(offline!=null||homeNewsView!=null)&&mainFailed&&recoverableNetworkFailure()){')
once('if(!destroyed&&nativeOnline&&nativeValidated&&offline!=null&&mainFailed&&recoverableNetworkFailure())recoverPage();','if(!destroyed&&nativeOnline&&nativeValidated&&(offline!=null||homeNewsView!=null)&&mainFailed&&recoverableNetworkFailure()){if(homeNewsView!=null&&homeNews!=null)homeNews.open(true);recoverPage();}')
once('        if(tab!=selected||web==null){navigate(selected);return;}', '''        if(tab!=selected||web==null){navigate(selected);return;}
        if(selected==HOME&&homeNewsView!=null){if(!homeNewsView.goBack())homeNewsView.scrollTo(0,0);return;}''')
once('        if(pendingIndexTab!=-1){navigate(HOME);return true;}','        if(homeNewsView!=null&&homeNewsView.goBack())return true;\n        if(pendingIndexTab!=-1){navigate(HOME);return true;}')
once('    @Override protected void onDestroy(){destroyed=true;', '    @Override protected void onDestroy(){destroyed=true;if(homeNews!=null)homeNews.close();clearHomeNews();')
p.write_text(src)
for name in ("HomeNews.java", "HomeNewsView.java"):
    copyfile(here/name,source/name)
copyfile(here/"home-edition.json",root/"app/src/main/assets/home-edition.json")
copyfile(here/"HomeDisplayTest.java",root/"app/src/androidTest"/pkg/"HomeDisplayTest.java")
