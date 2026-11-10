package com.marketmarney.mobile;

import android.app.Instrumentation;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.os.SystemClock;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

public class Performance437Test {
    private Instrumentation inst;
    private Context context;
    private MainActivity activity;

    @Before public void setup(){
        inst=InstrumentationRegistry.getInstrumentation();
        context=inst.getTargetContext();
        Intent intent=new Intent(context,MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK)
            .putExtra("startTab",0);
        activity=(MainActivity)inst.startActivitySync(intent);
        SystemClock.sleep(250);
        inst.runOnMainSync(()->{
            try{
                Field field=MainActivity.class.getDeclaredField("launchOverlay");field.setAccessible(true);
                StartupOverlay overlay=(StartupOverlay)field.get(activity);if(overlay!=null)overlay.dispose();
            }catch(Exception e){throw new RuntimeException(e);}
        });
    }

    @After public void finish(){if(activity!=null)inst.runOnMainSync(()->activity.finish());}

    private String asset(String name)throws Exception{
        try(InputStream in=context.getAssets().open(name);ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] buffer=new byte[8192];int read;while((read=in.read(buffer))!=-1)out.write(buffer,0,read);
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }

    private Object field(String name)throws Exception{
        Field field=MainActivity.class.getDeclaredField(name);field.setAccessible(true);return field.get(activity);
    }

    @Test public void reelRecoveryIsBoundedAndPositionAware()throws Exception{
        for(String name:new String[]{"reels46.js","social411/app.js","social411/bundle427.js"}){
            String script=asset(name);
            assertTrue(name,script.contains("function recoverStall(st)"));
            assertTrue(name,script.contains("function scheduleStall(st)"));
            assertTrue(name,script.contains("st.recoveryCount>=2"));
            assertTrue(name,script.contains("Date.now()-st.lastRecoveryAt<18000"));
            assertTrue(name,script.contains("data-mm437-recovering"));
            assertTrue(name,script.contains("lastProgressTime"));
            assertTrue(name,script.contains("6500:4200"));
            assertFalse(name,script.contains("location.reload()"));
        }
        String css=asset("smooth437.css");
        assertTrue(css.contains("data-mm437-recovering"));
        assertTrue(css.contains("data-mm437-slow"));
        assertTrue(css.contains("prefers-reduced-motion"));
    }

    @Test public void socialAssetsLoadSafelyOnDemand()throws Exception{
        Method ensure=MainActivity.class.getDeclaredMethod("ensureSocialAssets");ensure.setAccessible(true);
        AtomicReference<Throwable> failure=new AtomicReference<>();
        inst.runOnMainSync(()->{try{ensure.invoke(activity);}catch(Throwable t){failure.set(t);}});
        if(failure.get()!=null)throw new AssertionError(failure.get());
        assertEquals(Boolean.TRUE,field("socialAssetsReady"));
        assertTrue(((String)field("socialCss")).length()>500);
        assertTrue(((String)field("socialScript")).length()>1000);
        assertTrue(((String)field("socialCssQuoted")).startsWith("\""));
    }

    @Test public void sessionAndRuntimeCoalescingAreDeclared()throws Exception{
        Method preload=MainActivity.class.getDeclaredMethod("preloadSocialAssets");
        Method flush=MainActivity.class.getDeclaredMethod("flushWebSession");
        Method dispatch=MainActivity.class.getDeclaredMethod("dispatchRuntimeState");
        assertNotNull(preload);assertNotNull(flush);assertNotNull(dispatch);
        assertNotNull(MainActivity.class.getDeclaredField("runtimeDispatchTask"));
        assertNotNull(MainActivity.class.getDeclaredField("lastRuntimeSignature"));
        assertNotNull(MainActivity.class.getDeclaredField("socialAssetExecutor"));
        AtomicReference<Throwable> failure=new AtomicReference<>();
        flush.setAccessible(true);
        inst.runOnMainSync(()->{try{flush.invoke(activity);}catch(Throwable t){failure.set(t);}});
        if(failure.get()!=null)throw new AssertionError(failure.get());
        PackageInfo info=context.getPackageManager().getPackageInfo(context.getPackageName(),0);
        assertEquals("com.marketmarney.mobile.beta437",context.getPackageName());
        assertEquals("4.37.0-beta",info.versionName);
    }
}
