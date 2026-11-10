package com.marketmarney.mobile;

import android.app.Instrumentation;
import android.content.ComponentCallbacks2;
import android.content.Intent;
import android.content.pm.PackageInfo;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import org.junit.Test;
import static org.junit.Assert.*;

/** Focused runtime checks for MarketMarney 4.35 recovery and memory policy. */
public class Stability435Test {
    private String asset(String name)throws Exception{
        try(InputStream in=InstrumentationRegistry.getInstrumentation().getTargetContext().getAssets().open(name);
            ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] buffer=new byte[8192];
            int count;
            while((count=in.read(buffer))!=-1)out.write(buffer,0,count);
            return out.toString("UTF-8");
        }
    }

    private Field field(String name)throws Exception{
        Field field=MainActivity.class.getDeclaredField(name);
        field.setAccessible(true);
        return field;
    }

    private Method method(String name,Class<?>... types)throws Exception{
        Method method=MainActivity.class.getDeclaredMethod(name,types);
        method.setAccessible(true);
        return method;
    }

    @Test public void reelsReleaseOffscreenBuffersOnMemoryPressure()throws Exception{
        for(String name:new String[]{"reels46.js","social411/app.js","social411/bundle427.js"}){
            String script=asset(name);
            assertTrue(script.contains("function memoryPressure(event)"));
            assertTrue(script.contains("mm45:memory-pressure"));
            assertTrue(script.contains("c===active&&level<40"));
            assertTrue(script.contains("removeEventListener('mm45:memory-pressure',memoryPressure)"));
        }

        String packageName=InstrumentationRegistry.getInstrumentation().getTargetContext().getPackageName();
        PackageInfo info=InstrumentationRegistry.getInstrumentation().getTargetContext().getPackageManager().getPackageInfo(packageName,0);
        assertEquals("com.marketmarney.mobile.beta435",packageName);
        assertEquals("4.35.0-beta",info.versionName);
    }

    @Test public void networkRecoveryIsBoundedAndLifecycleAware()throws Exception{
        Instrumentation inst=InstrumentationRegistry.getInstrumentation();
        Intent intent=new Intent(inst.getTargetContext(),MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK)
            .putExtra("startTab",0);
        MainActivity activity=(MainActivity)inst.startActivitySync(intent);
        try{
            Method recoverable=method("recoverableFailure",String.class);
            for(String code:new String[]{"DNS","TIMEOUT","NETWORK","UNAVAILABLE"})
                assertEquals(code,Boolean.TRUE,recoverable.invoke(activity,code));
            for(String code:new String[]{"TLS","HTTP 401","HTTP 503","RENDER"})
                assertEquals(code,Boolean.FALSE,recoverable.invoke(activity,code));

            Method schedule=method("scheduleNetworkRetry");
            Method cancel=method("cancelNetworkRetry");
            Field resumed=field("activityResumed");
            Field validated=field("networkValidated");
            Field failed=field("mainFailed");
            Field failureCode=field("failureCode");
            Field streak=field("networkFailureStreak");
            Field task=field("networkRetryTask");
            assertNotNull(field("web").get(activity));

            inst.runOnMainSync(()->{
                try{
                    resumed.setBoolean(activity,true);
                    validated.setBoolean(activity,true);
                    failed.setBoolean(activity,true);
                    failureCode.set(activity,"DNS");
                    streak.setInt(activity,1);
                    schedule.invoke(activity);
                }catch(Exception e){throw new RuntimeException(e);}
            });
            assertNotNull("validated DNS failure schedules one bounded retry",task.get(activity));

            inst.runOnMainSync(()->{
                try{
                    cancel.invoke(activity);
                    failed.setBoolean(activity,false);
                    failureCode.set(activity,"");
                    activity.onTrimMemory(ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL);
                }catch(Exception e){throw new RuntimeException(e);}
            });
            assertNull("lifecycle cleanup cancels pending retry",task.get(activity));
        }finally{
            inst.runOnMainSync(activity::finish);
        }
    }
}
