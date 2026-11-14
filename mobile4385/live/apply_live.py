from pathlib import Path
import shutil
import sys


def patch(path, edits):
    content = path.read_text()
    for before, after in edits:
        if content.count(before) != 1:
            raise ValueError(f"{path}: anchor missing or ambiguous: {before[:100]!r}")
        content = content.replace(before, after, 1)
    path.write_text(content)


def apply(root):
    here = Path(__file__).resolve().parent
    source = root / 'app/src/main'
    java = source / 'java/com/marketmarney/mobile'
    shutil.copyfile(here / 'LiveCapture.java', java / 'LiveCapture.java')
    shutil.copyfile(here / 'LiveCaptureTest.java', root / 'app/src/androidTest/java/com/marketmarney/mobile/LiveCaptureTest.java')
    for name in ('reels-live.js', 'reels-live.css'):
        shutil.copyfile(here / name, source / 'assets' / name)
    patch(source / 'AndroidManifest.xml', [
        ('    <application', '''    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
    <uses-feature android:name="android.hardware.microphone" android:required="false" />
    <application''')])
    patch(java / 'Recovery414.java', [
        ('"/berita-detail.html"}', '"/berita-detail.html","/live.html"}')])
    patch(java / 'MainActivity.java', [
        ('    private WebView web;', '    private WebView web;\n    private final LiveCapture liveCapture = new LiveCapture(this);'),
        ('asset("reels433.css")', 'asset("reels433.css")+"\\n"+asset("reels-live.css")'),
        ('asset("reels433.js")', 'asset("reels433.js")+"\\n"+asset("reels-live.js")'),
        ('!"/beranda-trader.html".equals(expected.getPath())'.replace('\\/', '/'),
         '(!"/beranda-trader.html".equals(expected.getPath()) && !"/live.html".equals(expected.getPath()))'),
        ('        web.setWebChromeClient(new WebChromeClient(){', '''        final WebView mediaOwner = web;
        web.setWebChromeClient(new WebChromeClient(){
            @Override public void onPermissionRequest(android.webkit.PermissionRequest request){
                liveCapture.request(mediaOwner, web, request);
            }
            @Override public void onPermissionRequestCanceled(android.webkit.PermissionRequest request){
                liveCapture.canceled(request);
            }'''),
        ('    @Override protected void onActivityResult(int request,int result,Intent data){', '''    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] grants){
        super.onRequestPermissionsResult(code, permissions, grants);
        if(code == LiveCapture.MEDIA_REQUEST) liveCapture.result(web);
    }
    @Override protected void onActivityResult(int request,int result,Intent data){'''),
        ('            @Override public void onPageStarted(WebView v,String url,android.graphics.Bitmap favicon){',
         '''            @Override public void onPageStarted(WebView v,String url,android.graphics.Bitmap favicon){
                liveCapture.invalidate(v);'''),
        ('    private void disposeWeb(){', '    private void disposeWeb(){\n        liveCapture.invalidate(web);'),
        ('    @Override protected void onStop(){flushWebSession();', '''    @Override protected void onStop(){
        liveCapture.invalidate(web);
        if(web != null && LiveCapture.hostPage(web.getUrl())){
            String end = "(function(){var stage=document.querySelector('#hostStage.is-active');"
                    +"if(stage){var button=document.getElementById('endButton');if(button)button.click();return;}"
                    +"var preview=document.getElementById('localVideo');if(preview&&preview.srcObject){"
                    +"preview.srcObject.getTracks().forEach(function(track){track.stop()});location.replace('/live.html')}})()";
            web.evaluateJavascript(end, null);
        }
        flushWebSession();''')
    ])


if __name__ == '__main__':
    apply(Path(sys.argv[1]))
