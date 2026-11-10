package com.marketmarney.mobile;

import android.content.Context;
import android.content.pm.PackageInfo;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

public class Performance436Test {
    private Context context;

    @Before public void setup(){context=InstrumentationRegistry.getInstrumentation().getTargetContext();}

    private String asset(String name)throws Exception{
        try(InputStream in=context.getAssets().open(name);ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] buffer=new byte[8192];int read;while((read=in.read(buffer))!=-1)out.write(buffer,0,read);
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }

    @Test public void runtimeBridgeIsPackagedAndNonDestructive()throws Exception{
        String script=asset("runtime436.js"),css=asset("performance436.css");
        assertTrue(script.contains("window.MMRuntime436"));
        assertTrue(script.contains("mmapp:runtime"));
        assertTrue(script.contains("mmapp:network"));
        assertTrue(script.contains("mmapp:power"));
        assertTrue(script.contains("data-mm436-offline"));
        assertTrue(script.contains("requestIdleCallback"));
        assertFalse(script.contains("fetch("));
        assertFalse(script.contains("XMLHttpRequest"));
        assertTrue(css.contains("#mm436-runtime"));
        assertTrue(css.contains("data-mm436-power"));
        assertTrue(css.contains("data-mm436-stalled"));
    }

    @Test public void reelsUsesValidatedMeteredAndPowerAwareBudget()throws Exception{
        for(String name:new String[]{"reels46.js","social411/app.js","social411/bundle427.js"}){
            String script=asset(name);
            assertTrue(name,script.contains("networkValidated"));
            assertTrue(name,script.contains("networkMetered"));
            assertTrue(name,script.contains("powerSaving"));
            assertTrue(name,script.contains("downKbps>=1800"));
            assertTrue(name,script.contains("mmapp:runtime"));
            assertTrue(name,script.contains("mmapp:power"));
            assertTrue(name,script.contains("constrained=conservative||powerSaving||networkMetered||!networkValidated"));
            assertTrue(name,script.contains("window.__mm436NativeNetwork"));
        }
    }

    @Test public void nativeRuntimeCallbacksAndVersionAreDeclared()throws Exception{
        Method register=MainActivity.class.getDeclaredMethod("registerRuntimeSignals");
        Method unregister=MainActivity.class.getDeclaredMethod("unregisterRuntimeSignals");
        Method refresh=MainActivity.class.getDeclaredMethod("refreshRuntimeState",boolean.class);
        Method dispatch=MainActivity.class.getDeclaredMethod("dispatchRuntimeState");
        assertNotNull(register);assertNotNull(unregister);assertNotNull(refresh);assertNotNull(dispatch);
        String packageName=context.getPackageName();
        PackageInfo info=context.getPackageManager().getPackageInfo(packageName,0);
        assertEquals("com.marketmarney.mobile.beta436",packageName);
        assertEquals("4.36.0-beta",info.versionName);
    }
}
