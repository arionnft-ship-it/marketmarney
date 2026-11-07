from pathlib import Path
import sys
base=Path(sys.argv[1]) if len(sys.argv)>1 else Path('android43')
p=base/'app/src/main/java/com/marketmarney/mobile/StartupOverlay.java';s=p.read_text()
a='    private float appliedScale=-1;'
b='''    private float appliedScale=-1;
    private final android.view.ViewTreeObserver.OnPreDrawListener firstDraw=()->{
        if(getViewTreeObserver().isAlive())getViewTreeObserver().removeOnPreDrawListener(this.firstDrawListener());
        startArtwork();return true;
    };
    private android.view.ViewTreeObserver.OnPreDrawListener firstDrawListener(){return firstDraw;}'''
assert s.count(a)==1;s=s.replace(a,b,1)
s=s.replace('name.setSingleLine(true);','name.setMaxLines(1);name.setHorizontallyScrolling(false);')
s=s.replace('caption.setSingleLine(true);','caption.setMaxLines(1);caption.setHorizontallyScrolling(false);')
s=s.replace('description.setSingleLine(true);','description.setMaxLines(1);description.setHorizontallyScrolling(false);')
a='@Override protected void onAttachedToWindow(){super.onAttachedToWindow();requestApplyInsets();startArtwork();}'
b='''@Override protected void onAttachedToWindow(){
        super.onAttachedToWindow();requestApplyInsets();
        // Starting an ImageView property animator before attachment/layout can
        // capture an empty drawable layer. Wait for the first real pre-draw.
        if(motionAllowed(getContext()))getViewTreeObserver().addOnPreDrawListener(firstDraw);
        else{started=true;settle();}
    }'''
assert s.count(a)==1;s=s.replace(a,b,1)
a='private void cancelArtwork(){for(View v:animated)v.animate().cancel();}'
b='private void cancelArtwork(){if(getViewTreeObserver().isAlive())getViewTreeObserver().removeOnPreDrawListener(firstDraw);for(View v:animated)v.animate().cancel();}'
assert a in s;s=s.replace(a,b,1)
s=s.replace('if(fade&&motionAllowed(getContext())&&isAttachedToWindow())','if(fade&&motionAllowed(getContext())&&isAttachedToWindow()&&isLaidOut())')
s=s.replace('p.setStyle(Paint.Style.FILL);p.setShader(base);','p.setStyle(Paint.Style.FILL);p.setAlpha(255);p.setShader(base);')
p.write_text(s)
tests=base/'app/src/androidTest/java/com/marketmarney/mobile'
p=tests/'Opening416Test.java';s=p.read_text()
s=s.replace('private final AtomicInteger removed=new AtomicInteger();','private final AtomicInteger removed=new AtomicInteger();private final java.util.concurrent.atomic.AtomicLong removedAt=new java.util.concurrent.atomic.AtomicLong();')
s=s.replace('new StartupOverlay(activity,removed::incrementAndGet)','new StartupOverlay(activity,()->{removedAt.set(SystemClock.uptimeMillis());removed.incrementAndGet();})')
a='@Test public void readyPageDoesNotWaitForReferenceSequence(){show();long start=SystemClock.uptimeMillis();ui(()->overlay.finish(true,"test-ready"));awaitRemoved(1000);assertTrue(SystemClock.uptimeMillis()-start<1000);}'
b='''@Test public void readyPageDoesNotWaitForReferenceSequence(){show();final long[] start={0};ui(()->{start[0]=SystemClock.uptimeMillis();overlay.finish(true,"test-ready");});awaitRemoved(1500);assertTrue("No minimum 3.8-second hold",removedAt.get()-start[0]<1000);}'''
assert a in s;s=s.replace(a,b,1)
a='assertTrue(part("name").getAlpha()>before[0]+.3f);'
b='assertTrue("Logo visible after reveal",part("logo").getAlpha()>.9f);assertTrue(part("name").getAlpha()>before[0]+.3f);'
assert a in s;s=s.replace(a,b,1)
a='View v=part(n);Rect r=new Rect(0,0,v.getWidth(),v.getHeight());overlay.offsetDescendantRectToMyCoords(v,r);'
b='View v=part(n);int[] parent=new int[2],child=new int[2];overlay.getLocationOnScreen(parent);v.getLocationOnScreen(child);Rect r=new Rect(child[0]-parent[0],child[1]-parent[1],child[0]-parent[0]+v.getWidth(),child[1]-parent[1]+v.getHeight());'
assert a in s;s=s.replace(a,b,1)
s=s.replace('assertEquals(0,n.getLayout().getEllipsisCount(0));','assertEquals(0,n.getLayout().getEllipsisCount(0));assertTrue(n.getPaint().measureText(n.getText().toString())<=n.getWidth()-n.getPaddingLeft()-n.getPaddingRight()+1);')
p.write_text(s)
# Fixture page commits and loadDataWithBaseURL are asynchronous. Wait for their
# own identity before testing upload/security; keep the production guards intact.
p=tests/'GalleryUi415Test.java';s=p.read_text()
a='  inst.runOnMainSync(()->assertEquals(FIXTURE_URL,((WebView)field("web")).getUrl()));'
b='''  final java.util.concurrent.atomic.AtomicBoolean committed=new java.util.concurrent.atomic.AtomicBoolean();
  for(int retry=0;retry<40&&!committed.get();retry++){inst.runOnMainSync(()->committed.set(FIXTURE_URL.equals(((WebView)field("web")).getUrl())));if(!committed.get())SystemClock.sleep(200);}
  inst.runOnMainSync(()->assertEquals(FIXTURE_URL,((WebView)field("web")).getUrl()));'''
assert a in s;s=s.replace(a,b,1);p.write_text(s)
p=tests/'AdaptGuardTest.java';s=p.read_text()
a='  SystemClock.sleep(600);js('
b='''  final java.util.concurrent.atomic.AtomicBoolean committed=new java.util.concurrent.atomic.AtomicBoolean();
  for(int retry=0;retry<40&&!committed.get();retry++){inst.runOnMainSync(()->{WebView w=(WebView)field("web");committed.set(url.equals(w.getUrl())&&w.getProgress()==100);});if(!committed.get())SystemClock.sleep(200);}
  assertTrue("Fixture URL committed",committed.get());SystemClock.sleep(200);js('''
assert a in s;s=s.replace(a,b,1)
a='  assertEquals("true",js("!!document.getElementById(\'mm43-social-style\')"));'
b='''  for(int retry=0;retry<30&&!"true".equals(js("!!document.getElementById('mm43-social-style')"));retry++)SystemClock.sleep(100);
  assertEquals("true",js("!!document.getElementById('mm43-social-style')"));'''
assert a in s;s=s.replace(a,b,1);p.write_text(s)
print('PASS: layout-ready animation, bounded labels and explicit asynchronous fixture readiness; no application security changes')
