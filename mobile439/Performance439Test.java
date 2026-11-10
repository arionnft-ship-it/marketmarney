package com.marketmarney.mobile;

import android.content.Context;
import android.content.pm.PackageInfo;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

public class Performance439Test {
    private Context context;

    @Before public void setup(){context=InstrumentationRegistry.getInstrumentation().getTargetContext();}

    private String asset(String name)throws Exception{
        try(InputStream in=context.getAssets().open(name);ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] buffer=new byte[8192];int read;while((read=in.read(buffer))!=-1)out.write(buffer,0,read);
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }

    @Test public void reelsProtectsTheActiveBuffer()throws Exception{
        for(String name:new String[]{"reels46.js","social411/app.js","social411/bundle427.js"}){
            String script=asset(name);
            assertTrue(name,script.contains("bufferStarved"));
            assertTrue(name,script.contains("function bufferAhead"));
            assertTrue(name,script.contains("function probeBuffer"));
            assertTrue(name,script.contains("data-mm439-buffer-starved"));
            assertTrue(name,script.contains("constrained||starved"));
            assertTrue(name,script.contains("scheduleBufferProbe"));
            assertTrue(name,script.contains("addEventListener('progress'"));
            assertTrue(name,script.contains("starved?180:releaseDelay"));
        }
    }

    @Test public void instantLayerIsSmallAndNonBlocking()throws Exception{
        String script=asset("instant439.js");
        String css=asset("instant439.css");
        assertTrue(script.contains("rel='preconnect'"));
        assertTrue(script.contains("rel='dns-prefetch'"));
        assertTrue(script.contains("requestIdleCallback"));
        assertTrue(script.contains("warmed.size>=3"));
        assertTrue(script.contains("MutationObserver(scheduleWarm)"));
        assertTrue(css.contains("touch-action:manipulation"));
        assertTrue(css.contains("data-mm439-buffer-starved"));
        assertFalse(css.contains("backdrop-filter"));
    }

    @Test public void nativeShellDeclaresTheInstantRelease()throws Exception{
        PackageInfo info=context.getPackageManager().getPackageInfo(context.getPackageName(),0);
        assertEquals("com.marketmarney.mobile.beta439",context.getPackageName());
        assertEquals("4.39.0-beta",info.versionName);
        assertNotNull(MainActivity.class.getDeclaredMethod("navigate",int.class));
        assertNotNull(MainActivity.class.getDeclaredMethod("open",String.class));
        assertNotNull(MainActivity.class.getDeclaredMethod("createWeb"));
        assertNotNull(MainActivity.class.getDeclaredField("retained"));
    }
}
