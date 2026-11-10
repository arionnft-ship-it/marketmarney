package com.marketmarney.mobile;

import android.content.Context;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

public class Performance435Test {
    private Context context;

    @Before public void setup(){
        context=InstrumentationRegistry.getInstrumentation().getTargetContext();
    }

    private String asset(String name)throws Exception{
        try(InputStream in=context.getAssets().open(name);ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] buffer=new byte[8192];int read;
            while((read=in.read(buffer))!=-1)out.write(buffer,0,read);
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }

    @Test public void lifecycleControllerIsPackagedAndScoped()throws Exception{
        String script=asset("lifecycle435.js");
        String css=asset("performance435.css");
        assertTrue(script.contains("window.MMPerformance435"));
        assertTrue(script.contains("mmapp:memory"));
        assertTrue(script.contains("releaseInactiveReels"));
        assertTrue(script.contains("requestIdleCallback"));
        assertTrue(script.contains("loading='lazy'")||script.contains("image.loading='lazy'"));
        assertTrue(css.contains("data-mm435-pressure"));
        assertTrue(css.contains("content-visibility:auto"));
    }

    @Test public void reelsControllerPreventsDuplicatePlaybackAndAdapts()throws Exception{
        for(String name:new String[]{"reels46.js","social411/app.js","social411/bundle427.js"}){
            String script=asset(name);
            assertTrue(name,script.contains("playPending"));
            assertTrue(name,script.contains("networkOnline"));
            assertTrue(name,script.contains("mmapp:memory"));
            assertTrue(name,script.contains("mm435:network"));
            assertTrue(name,script.contains("requestVideoFrameCallback"));
            assertTrue(name,script.contains("pressure>=10?0"));
        }
    }

    @Test public void nativeLifecycleCallbacksAreDeclared()throws Exception{
        Method trim=MainActivity.class.getDeclaredMethod("onTrimMemory",int.class);
        Method low=MainActivity.class.getDeclaredMethod("onLowMemory");
        Method stop=MainActivity.class.getDeclaredMethod("onStop");
        assertNotNull(trim);assertNotNull(low);assertNotNull(stop);
        assertEquals(void.class,trim.getReturnType());
        assertEquals(void.class,low.getReturnType());
        assertEquals(void.class,stop.getReturnType());
    }
}
