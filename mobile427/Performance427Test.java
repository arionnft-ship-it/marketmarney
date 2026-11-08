package com.marketmarney.mobile;

import android.app.Instrumentation;
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Map;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

/** Local-only speed/stability checks. No account, upload or production write. */
public class Performance427Test {
    private Instrumentation inst;
    private MainActivity activity;

    private void ui(Runnable action){inst.runOnMainSync(action);}
    private Object field(String name){
        try{Field f=MainActivity.class.getDeclaredField(name);f.setAccessible(true);return f.get(activity);}
        catch(Exception error){throw new RuntimeException(error);}
    }
    private String asset(String name)throws Exception{
        try(InputStream in=activity.getAssets().open(name);ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] buffer=new byte[8192];int read;while((read=in.read(buffer))!=-1)out.write(buffer,0,read);
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }
    private static int count(String source,String token){int n=0,from=0;while((from=source.indexOf(token,from))>=0){n++;from+=token.length();}return n;}

    @Before public void setup(){
        inst=InstrumentationRegistry.getInstrumentation();
        activity=(MainActivity)inst.startActivitySync(new Intent(inst.getTargetContext(),MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK).putExtra("startTab",1));
        ui(()->{WebView web=(WebView)field("web");if(web!=null)web.stopLoading();});
    }
    @After public void cleanup(){if(activity!=null)ui(()->activity.finish());}

    @Test public void lightControllerDoesNotObserveFeedOrChatDom()throws Exception{
        String script=asset("light425.js");
        assertEquals(1,count(script,"new MutationObserver"));
        assertFalse(script.contains("bodyObserver"));
        assertFalse(script.contains("appObserver"));
        assertTrue(script.contains("data-mm-perf"));
        assertFalse(script.contains("subtree: true"));
        assertFalse(script.contains("setInterval("));
    }

    @Test public void localPagesUseSingleImmutableBundles()throws Exception{
        String[][] pages={
            {"social411/page.html","/__android411/social/bundle427.css","/__android411/social/bundle427.js"},
            {"group48/page.html","/__android48/group/bundle427.css","/__android48/group/bundle427.js"},
            {"profile49/page.html","/__android49/profile/bundle427.css","/__android49/profile/bundle427.js"},
        };
        String map=asset("resources49-map.json");
        for(String[] page:pages){
            String html=asset(page[0]);
            assertEquals(1,count(html,page[1]));
            assertEquals(1,count(html,page[2]));
            assertTrue(map.contains(page[1]));
            assertTrue(map.contains(page[2]));
        }
        assertTrue(asset("social411/bundle427.css").length()>10000);
        assertTrue(asset("social411/bundle427.js").length()>10000);
    }

    @Test public void openingAndWebViewUseFastLimits()throws Exception{
        Field limit=StartupOverlay.class.getDeclaredField("SAFETY_LIMIT_MS");limit.setAccessible(true);
        assertTrue(limit.getLong(null)<=1800L);
        ui(()->{
            WebView web=(WebView)field("web");
            assertNotNull(web);
            assertEquals(WebSettings.LOAD_DEFAULT,web.getSettings().getCacheMode());
        });
    }

    @Test public void immutableAssetsAndHtmlHaveCorrectCachePolicy()throws Exception{
        AppResources49 resources=(AppResources49)field("appResources");
        assertNotNull(resources);
        WebResourceResponse css=resources.respond(request("/__android411/social/bundle427.css"),"test");
        WebResourceResponse html=resources.respond(request("/beranda-trader.html"),"test");
        assertNotNull(css);assertNotNull(html);
        assertTrue(css.getResponseHeaders().get("Cache-Control").contains("immutable"));
        assertEquals("no-store",html.getResponseHeaders().get("Cache-Control"));
    }

    @Test public void reportIdentifiesSpeedRelease(){
        ui(()->{
            try{Method m=MainActivity.class.getDeclaredMethod("appReport");m.setAccessible(true);
                assertTrue(((String)m.invoke(activity)).contains("4.27.0-beta"));
            }catch(Exception error){throw new RuntimeException(error);}
        });
    }

    private static WebResourceRequest request(String path){
        return new WebResourceRequest(){
            private final Uri uri=Uri.parse("https://marketmarney.com"+path);
            @Override public Uri getUrl(){return uri;}
            @Override public boolean isForMainFrame(){return false;}
            @Override public boolean isRedirect(){return false;}
            @Override public boolean hasGesture(){return false;}
            @Override public String getMethod(){return "GET";}
            @Override public Map<String,String> getRequestHeaders(){return Collections.emptyMap();}
        };
    }
}
