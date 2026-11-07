"""Upload-picker change only, on verified 4.14 source. No account/backend edits."""
from pathlib import Path
import json,hashlib,re,shutil,sys
base=Path(sys.argv[1]) if len(sys.argv)>1 else Path('android43')
root=Path(__file__).resolve().parent;java=base/'app/src/main/java/com/marketmarney/mobile'
preserved={str(p.relative_to(base)):hashlib.sha256(p.read_bytes()).hexdigest() for p in (base/'app/src/main/assets').rglob('*') if p.is_file()}
for name in ['StartupOverlay.java','AndroidGoogleLogin.java','AppResources49.java','Recovery414.java']:
 p=java/name;preserved[str(p.relative_to(base))]=hashlib.sha256(p.read_bytes()).hexdigest()
p=java/'MainActivity.java';s=p.read_text()
def once(a,b):
 global s
 if s.count(a)!=1:raise RuntimeError('Source changed: '+a[:110])
 s=s.replace(a,b,1)
once('    private ValueCallback<Uri[]> fileCallback;', '''    private ValueCallback<Uri[]> fileCallback;
    private WebView fileOwner;
    private String fileOwnerUrl;
    private GalleryPicker415.Selection fileSelection;
    private int fileRequestCode=-1, fileSequence=4100;
    private java.util.concurrent.ExecutorService fileValidator;
    private java.util.concurrent.Future<?> fileValidation;
    private Runnable fileTimeout;
    private void finishFileSelection(Uri[] result){
        ValueCallback<Uri[]> callback=fileCallback;fileCallback=null;
        fileOwner=null;fileOwnerUrl=null;fileSelection=null;fileRequestCode=-1;
        if(fileTimeout!=null){frame.removeCallbacks(fileTimeout);fileTimeout=null;}
        if(fileValidation!=null){fileValidation.cancel(true);fileValidation=null;}
        if(callback!=null)callback.onReceiveValue(result);
    }
    private boolean filePageCurrent(){
        return !destroyed&&fileCallback!=null&&fileOwner==web&&web!=null
            &&Recovery414.sameDocument(fileOwnerUrl,web.getUrl());
    }
    private boolean chooseFile(WebView source,ValueCallback<Uri[]> callback,WebChromeClient.FileChooserParams params){
        if(destroyed||source!=web||!own(source.getUrl())||params==null){callback.onReceiveValue(null);return true;}
        if(fileCallback!=null){callback.onReceiveValue(null);return true;}
        GalleryPicker415.Selection choice=new GalleryPicker415.Selection(params.getAcceptTypes(),params.getMode(),params.isCaptureEnabled());
        fileCallback=callback;fileOwner=source;fileOwnerUrl=source.getUrl();fileSelection=choice;
        fileSequence=fileSequence>=65000?4100:fileSequence+1;fileRequestCode=fileSequence;
        try{startActivityForResult(GalleryPicker415.create(this,choice,params),fileRequestCode);return true;}
        catch(ActivityNotFoundException primary){
            if(choice.visual){try{startActivityForResult(GalleryPicker415.fallback(choice),fileRequestCode);return true;}catch(RuntimeException fallback){/* fail closed below */}}
        }catch(RuntimeException failure){/* No handler or invalid platform request. */}
        finishFileSelection(null);Toast.makeText(this,"Galeri tidak dapat dibuka. Coba kembali.",Toast.LENGTH_SHORT).show();return true;
    }
    private void receiveFileSelection(int request,int result,Intent data){
        if(request!=fileRequestCode||fileCallback==null)return;
        if(!filePageCurrent()||result!=RESULT_OK){finishFileSelection(null);return;}
        final Uri[] selected;
        try{selected=GalleryPicker415.parse(result,data,fileSelection.limit);}
        catch(RuntimeException invalid){finishFileSelection(null);Toast.makeText(this,"Pilihan berkas tidak valid atau terlalu banyak.",Toast.LENGTH_LONG).show();return;}
        if(selected==null){finishFileSelection(null);return;}
        final ValueCallback<Uri[]> expected=fileCallback;
        final GalleryPicker415.Selection choice=fileSelection;
        if(fileValidator==null)fileValidator=java.util.concurrent.Executors.newSingleThreadExecutor();
        fileTimeout=()->{if(fileCallback==expected){finishFileSelection(null);Toast.makeText(this,"Berkas belum dapat dibaca. Pilih kembali dari galeri.",Toast.LENGTH_LONG).show();}};
        frame.postDelayed(fileTimeout,12000);
        fileValidation=fileValidator.submit(()->{
            Uri[] accepted=null;String failure=null;
            try{accepted=GalleryPicker415.validate(getApplicationContext(),choice,selected);}
            catch(RuntimeException e){failure=e instanceof IllegalArgumentException?e.getMessage():"Berkas tidak dapat dibaca. Pilih kembali.";}
            final Uri[] output=accepted;final String message=failure;
            runOnUiThread(()->{
                if(fileCallback!=expected)return;
                boolean current=filePageCurrent();finishFileSelection(current?output:null);
                if(current&&message!=null)Toast.makeText(this,message,Toast.LENGTH_LONG).show();
            });
        });
    }''')
once('        if(fileCallback!=null){fileCallback.onReceiveValue(null);fileCallback=null;}', '        finishFileSelection(null);')
once('                if(v!=web)return;clearOffline();beginPageWait(v);', '                if(v!=web)return;if(fileOwner==v)finishFileSelection(null);clearOffline();beginPageWait(v);')
a=s.index('            @Override public boolean onShowFileChooser(');b=s.index('            @Override public void onShowCustomView(',a)
s=s[:a]+'''            @Override public boolean onShowFileChooser(WebView v,ValueCallback<Uri[]> cb,FileChooserParams params){
                return chooseFile(v,cb,params);
            }
'''+s[b:]
a=s.index('    @Override protected void onActivityResult(');b=s.index('    private boolean handleAppBack()',a)
s=s[:a]+'''    @Override protected void onActivityResult(int request,int result,Intent data){
        super.onActivityResult(request,result,data);receiveFileSelection(request,result,data);
    }
'''+s[b:]
once('        super.onCreate(state);', '        super.onCreate(state);\n        if(state!=null)fileSequence=state.getInt("gallerySequence",4100);')
once('state.putInt("selectedTab",tab);','state.putInt("selectedTab",tab);state.putInt("gallerySequence",fileSequence);')
once('disposeWeb();if(google!=null)google.close();super.onDestroy();','disposeWeb();if(fileValidator!=null)fileValidator.shutdownNow();if(google!=null)google.close();super.onDestroy();')
s=s.replace('4.14.0-beta','4.15.0-beta').replace('MarketMarneyAndroid/4.14 AppShell','MarketMarneyAndroid/4.15 AppShell').replace("version:'4.14'","version:'4.15'").replace("dataset.mmAndroid='414'","dataset.mmAndroid='415'")
p.write_text(s);shutil.copy2(root/'GalleryPicker415.java',java/'GalleryPicker415.java')
p=base/'app/build.gradle';g=p.read_text();assert "applicationId 'com.marketmarney.mobile.beta414'" in g
g=g.replace("applicationId 'com.marketmarney.mobile.beta414'","applicationId 'com.marketmarney.mobile.beta415'").replace('versionCode 18','versionCode 19').replace("versionName '4.14.0-beta'","versionName '4.15.0-beta'")
g+='\ndependencies { androidTestImplementation "androidx.test.uiautomator:uiautomator:2.3.0" }\n';p.write_text(g)
p=base/'app/src/main/res/values/strings.xml';p.write_text(re.sub(r'(<string name="app_name">)[^<]+',r'\g<1>Marney 4.15 Galeri',p.read_text()))
for rel,h in preserved.items():assert hashlib.sha256((base/rel).read_bytes()).hexdigest()==h,rel
manifest=(base/'app/src/main/AndroidManifest.xml').read_text()
assert not any(x in manifest for x in ['READ_MEDIA_IMAGES','READ_MEDIA_VIDEO','READ_EXTERNAL_STORAGE','WRITE_EXTERNAL_STORAGE','MANAGE_EXTERNAL_STORAGE'])
assert 'MIXED_CONTENT_NEVER_ALLOW' in s and 'handler.cancel()' in s and 'addJavascriptInterface' not in s
assert 'labels={"Beranda","Berita","XAUWar","Market Live","Social Marney"}' in s
Path('preserved415.json').write_text(json.dumps(preserved,indent=2))
print('PASS:',len(preserved),'assets/shared classes preserved; no broad gallery/storage permission')
