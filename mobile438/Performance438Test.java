package com.marketmarney.mobile;

import android.content.ComponentName;
import android.content.Context;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageInfo;
import android.view.WindowManager;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

public class Performance438Test {
    private Context context;

    @Before public void setup(){context=InstrumentationRegistry.getInstrumentation().getTargetContext();}

    private String asset(String name)throws Exception{
        try(InputStream in=context.getAssets().open(name);ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] buffer=new byte[8192];int read;
            while((read=in.read(buffer))!=-1)out.write(buffer,0,read);
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }

    @Test public void reelsUseRealBufferAndSwipeDirection()throws Exception{
        for(String name:new String[]{"reels46.js","social411/app.js","social411/bundle427.js"}){
            String script=asset(name);
            assertTrue(name,script.contains("function bufferedAhead(st)"));
            assertTrue(name,script.contains("function activeBufferReady()"));
            assertTrue(name,script.contains("primary=scrollDirection>=0?1:-1"));
            assertTrue(name,script.contains("bufferedAhead(st)>=reserve"));
            assertTrue(name,script.contains("data-mm438-primed"));
            assertTrue(name,script.contains("releaseDelay=1700"));
            assertTrue(name,script.contains("scrollActivity"));
            assertTrue(name,script.contains("scheduleBudget(40)"));
        }
    }

    @Test public void reelRecoveryPrefersSoftResumeBeforeReload()throws Exception{
        for(String name:new String[]{"reels46.js","social411/app.js","social411/bundle427.js"}){
            String script=asset(name);
            assertTrue(name,script.contains("st.softRecoveryCount<1"));
            assertTrue(name,script.contains("observedBuffer=bufferedAhead(st)"));
            assertTrue(name,script.contains("data-mm438-soft"));
            assertTrue(name,script.contains("data-mm438-buffering"));
            assertTrue(name,script.contains("st.seeking"));
            assertTrue(name,script.contains("v.addEventListener('progress'"));
            assertTrue(name,script.contains("v.addEventListener('seeked'"));
            assertFalse(name,script.contains("location.reload()"));
        }
        String css=asset("adaptive438.css");
        assertTrue(css.contains("contain:layout paint style"));
        assertTrue(css.contains("data-mm438-soft"));
        assertTrue(css.contains("data-mm438-slow"));
        assertTrue(css.contains("prefers-reduced-motion"));
    }

    @Test public void nativeShellUsesResizeAndBackgroundPreload()throws Exception{
        PackageInfo packageInfo=context.getPackageManager().getPackageInfo(context.getPackageName(),0);
        assertEquals("com.marketmarney.mobile.beta438",context.getPackageName());
        assertEquals("4.38.0-beta",packageInfo.versionName);
        ActivityInfo activityInfo=context.getPackageManager().getActivityInfo(new ComponentName(context,MainActivity.class),0);
        int adjust=activityInfo.softInputMode&WindowManager.LayoutParams.SOFT_INPUT_MASK_ADJUST;
        assertEquals(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE,adjust);
        Method preload=MainActivity.class.getDeclaredMethod("preloadSocialAssets");
        Field executor=MainActivity.class.getDeclaredField("socialAssetExecutor");
        assertNotNull(preload);assertNotNull(executor);
    }
}
