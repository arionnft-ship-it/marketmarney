package com.marketmarney.mobile;

import android.app.Instrumentation;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Rect;
import android.os.SystemClock;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.webkit.WebView;
import android.widget.TextView;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.File;
import java.io.FileOutputStream;
import java.lang.reflect.Field;
import java.util.LinkedHashMap;
import java.util.List;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.PixelCopy;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONTokener;
import org.junit.Test;
import static org.junit.Assert.*;

/** Exercises the ordinary launcher, Android input and display, using real publisher content. */
public final class HomeColdStartTest {
    @org.junit.Rule public final org.junit.rules.Timeout limit=org.junit.rules.Timeout.seconds(75);
    private Instrumentation inst;
    private MainActivity activity;
    private WebView web;
    private File output;
    private final Map<String,HomeNews.Story> stories=new LinkedHashMap<>();
    private final Map<String,HomeNews.Story> fresh=new LinkedHashMap<>();
    private static String plain(String s){return s.replace('\u00a0',' ').replaceAll("\\s+"," ").trim();}
    private void index(Map<String,HomeNews.Story> into,List<HomeNews.Story> rows){
        for(HomeNews.Story s:rows)into.put(plain(s.title),s);
    }
    private Object field(String name){
        try{Field f=MainActivity.class.getDeclaredField(name);f.setAccessible(true);return f.get(activity);}
        catch(Exception e){throw new AssertionError(e);}
    }
    private JSONArray evaluate(String script) throws Exception {
        CountDownLatch latch=new CountDownLatch(1); AtomicReference<String> val=new AtomicReference<>();
        inst.runOnMainSync(()->web.evaluateJavascript(script,s->{val.set(s);latch.countDown();}));
        if(!latch.await(3,TimeUnit.SECONDS))return new JSONArray();
        Object result=new JSONTokener(val.get()).nextValue();
        return result instanceof JSONArray?(JSONArray)result:new JSONArray();
    }
    private static final class Hit {
        final HomeNews.Story story; final int x,y; final String surface;
        Hit(HomeNews.Story s,int x,int y,String kind){story=s;this.x=x;this.y=y;surface=kind;}
    }
    private static boolean clipped(View v,Rect r){
        return v!=null&&v.isShown()&&v.getGlobalVisibleRect(r)&&r.width()>4&&r.height()>4;
    }
    private Hit findHeadline() throws Exception {
        AtomicReference<Hit> found=new AtomicReference<>();
        AtomicReference<Boolean> nativeHome=new AtomicReference<>();
        inst.runOnMainSync(()->{
            HomeNewsView h=(HomeNewsView)field("homeNewsView"); nativeHome.set(h!=null&&h.isShown());
            if(!nativeHome.get())return;
            TextView t=h.findViewWithTag("home-headline"); Rect r=new Rect();
            if(!clipped(t,r))return;
            HomeNews.Story s=stories.get(plain(t.getText().toString())); if(s==null)return;
            int[] offset=new int[2]; activity.getWindow().getDecorView().getLocationOnScreen(offset);
            found.set(new Hit(s,r.centerX()+offset[0],r.centerY()+offset[1],"native"));
        });
        if(nativeHome.get())return found.get();
        JSONArray hits=evaluate("(function(){return Array.from(document.querySelectorAll('#app #headlineCarousel h2,#app .mm90-story h3,#app .card[data-id] h3')).map(n=>{var r=n.getBoundingClientRect(),x=(Math.max(0,r.left)+Math.min(innerWidth,r.right))/2,y=(Math.max(0,r.top)+Math.min(innerHeight,r.bottom))/2,e=document.elementFromPoint(x,y);return e&&(e===n||n.contains(e))&&r.height>5?[n.innerText,x,y,innerWidth]:[]}).filter(a=>a.length)})()");
        int[] loc=new int[2],width=new int[1];inst.runOnMainSync(()->{web.getLocationOnScreen(loc);width[0]=web.getWidth();});
        for(int i=0;i<hits.length();i++){
            JSONArray c=hits.getJSONArray(i);HomeNews.Story s=stories.get(plain(c.getString(0)));if(s==null)continue;
            double scale=width[0]/c.getDouble(3);
            return new Hit(s,loc[0]+(int)(c.getDouble(1)*scale),loc[1]+(int)(c.getDouble(2)*scale),"web");
        }
        return null;
    }
    private void capture(String file) throws Exception {
        progress("copy window pixels for "+file);
        CountDownLatch copied=new CountDownLatch(1);
        AtomicReference<Bitmap> image=new AtomicReference<>();
        AtomicReference<Integer> status=new AtomicReference<>();
        inst.runOnMainSync(()->{
            View content=activity.getWindow().getDecorView();
            Bitmap snapshot=Bitmap.createBitmap(content.getWidth(),content.getHeight(),Bitmap.Config.ARGB_8888);
            image.set(snapshot);
            PixelCopy.request(activity.getWindow(),snapshot,code->{status.set(code);copied.countDown();},
                new Handler(Looper.getMainLooper()));
        });
        assertTrue("PixelCopy callback within 5s",copied.await(5,TimeUnit.SECONDS));
        assertEquals("Android window pixel copy",Integer.valueOf(PixelCopy.SUCCESS),status.get());
        Bitmap bitmap=image.get();
        try(FileOutputStream out=new FileOutputStream(new File(output,file))){
            assertTrue("Encode display pixels",bitmap.compress(Bitmap.CompressFormat.PNG,100,out));
        }finally{bitmap.recycle();}
    }
    private void progress(String message){
        Bundle note=new Bundle();note.putString("stream","HOME_QA "+message+"\n");inst.sendStatus(2,note);
    }
    private void tap(Hit h){
        long down=SystemClock.uptimeMillis();
        MotionEvent press=MotionEvent.obtain(down,down,MotionEvent.ACTION_DOWN,h.x,h.y,0);
        MotionEvent lift=MotionEvent.obtain(down,down+70,MotionEvent.ACTION_UP,h.x,h.y,0);
        press.setSource(android.view.InputDevice.SOURCE_TOUCHSCREEN);lift.setSource(android.view.InputDevice.SOURCE_TOUCHSCREEN);
        try{inst.sendPointerSync(press);SystemClock.sleep(70);inst.sendPointerSync(lift);}
        finally{press.recycle();lift.recycle();}
    }
    private String detailPassage(HomeNews.Story story) throws Exception {
        AtomicReference<String> nativeText=new AtomicReference<>();
        inst.runOnMainSync(()->{
            HomeNewsView h=(HomeNewsView)field("homeNewsView");
            if(h==null||!h.isReading())return;
            TextView t=h.findViewWithTag("home-story-body");
            if(clipped(t,new Rect()))nativeText.set(plain(t.getText().toString()));
        });
        String body=plain(story.body),s=nativeText.get();
        if(s!=null&&s.length()>=80&&s.equals(body))return s.substring(0,80);
        if(s!=null)return null;
        // Inspect text in the viewport and require a passage that is absent from the card preview.
        JSONArray texts=evaluate("(function(){let a=[],w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),n;while(n=w.nextNode()){let t=(n.textContent||'').trim();if(t.length<50)continue;let p=n.parentElement;if(!p||p.closest('script,style'))continue;let r=document.createRange();r.selectNodeContents(n);let v=Array.from(r.getClientRects()).some(q=>q.height>3&&q.top<innerHeight&&q.bottom>0&&q.left<innerWidth&&q.right>0);if(v)a.push(t)}return a})()");
        for(int i=0;i<texts.length();i++){
            String text=plain(texts.getString(i));
            for(int j=0;j+54<=text.length();j+=15){
                String piece=text.substring(j,j+54);
                if(body.contains(piece)&&!plain(story.summary).contains(piece)&&!plain(story.title).contains(piece))return piece;
            }
        }
        return null;
    }
    @Test public void publishedHeadlineOpensAndAndroidBackReturnsToRealHome() throws Exception {
        inst=InstrumentationRegistry.getInstrumentation();
        android.content.Context ctx=inst.getTargetContext();
        output=new File(ctx.getExternalFilesDir(null),"qa-home");assertTrue(output.mkdirs()||output.isDirectory());
        index(stories,HomeNews.parse(HomeNews.read(ctx.getAssets().open("home-edition.json"))));
        Intent normal=ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        assertNotNull("launcher activity",normal);normal.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK);
        progress("launch app");
        activity=(MainActivity)inst.startActivitySync(normal);web=(WebView)field("web");
        try {
            progress("read current public feed");
            try{index(fresh,HomeNews.parse(HomeNews.download()));}catch(Exception e){android.util.Log.i("MMAPP_HOME","QA public feed: "+e.getClass().getSimpleName());}
            progress("current public rows="+fresh.size());
            stories.putAll(fresh);
            long deadline=SystemClock.elapsedRealtime()+12000;Hit hit=null;
            while(hit==null&&SystemClock.elapsedRealtime()<deadline){hit=findHeadline();if(hit==null)SystemClock.sleep(100);}
            assertNotNull("Real publisher headline visible through the ordinary launcher",hit);
            progress("headline "+hit.story.id+" on "+hit.surface);
            capture("home.png");tap(hit);
            String passage=null;deadline=SystemClock.elapsedRealtime()+11000;
            while(passage==null&&SystemClock.elapsedRealtime()<deadline){passage=detailPassage(hit.story);if(passage==null)SystemClock.sleep(120);}
            assertNotNull("Android touch opens body of "+hit.story.id,passage);capture("article.png");
            inst.sendKeyDownUpSync(KeyEvent.KEYCODE_BACK);
            Hit returned=null;deadline=SystemClock.elapsedRealtime()+9000;
            while(returned==null&&SystemClock.elapsedRealtime()<deadline){returned=findHeadline();if(returned==null)SystemClock.sleep(120);}
            assertNotNull("Android Back returns to publisher headlines",returned);capture("returned.png");
            JSONObject proof=new JSONObject().put("id",hit.story.id).put("headline",hit.story.title).put("passage",passage)
                .put("surface",hit.surface).put("livePublisherMatched",fresh.containsKey(plain(hit.story.title)))
                .put("latestPublicRows",fresh.size()).put("returnedToHeadline",returned.story.title);
            try(FileOutputStream out=new FileOutputStream(new File(output,"article-proof.json"))){
                out.write(proof.toString(2).getBytes(java.nio.charset.StandardCharsets.UTF_8));
            }
        }finally{inst.runOnMainSync(activity::finish);}
    }
}
