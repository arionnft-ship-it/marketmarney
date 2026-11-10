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

public class Performance438Test {
    private Context context;

    @Before public void setup(){context=InstrumentationRegistry.getInstrumentation().getTargetContext();}

    private String asset(String name)throws Exception{
        try(InputStream in=context.getAssets().open(name);ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] buffer=new byte[8192];int read;while((read=in.read(buffer))!=-1)out.write(buffer,0,read);
            return out.toString(StandardCharsets.UTF_8.name());
        }
    }

    @Test public void reelsActivationIsDirectionalAndHysteresisControlled()throws Exception{
        for(String name:new String[]{"reels46.js","social411/app.js","social411/bundle427.js"}){
            String script=asset(name);
            assertTrue(name,script.contains("scrollDirection"));
            assertTrue(name,script.contains("activeRatio>.38"));
            assertTrue(name,script.contains("visible<.72"));
            assertTrue(name,script.contains("function queueActivate"));
            assertTrue(name,script.contains("function settleScroll"));
            assertTrue(name,script.contains("forward=distance*direction"));
            assertTrue(name,script.contains("mm438Scrolling"));
            assertTrue(name,script.contains("onscrollend"));
        }
    }

    @Test public void feedAndReelsUseBoundedRenderingWork()throws Exception{
        String css=asset("fluid438.css");
        assertTrue(css.contains("content-visibility:auto"));
        assertTrue(css.contains("contain-intrinsic-size:auto 620px"));
        assertTrue(css.contains("scroll-snap-stop:always"));
        assertTrue(css.contains("overscroll-behavior-y:contain"));
        assertTrue(css.contains("data-mm438-scrolling"));
        assertFalse(css.contains("backdrop-filter"));
    }

    @Test public void nativeShellDeclaresTheFluidRelease()throws Exception{
        PackageInfo info=context.getPackageManager().getPackageInfo(context.getPackageName(),0);
        assertEquals("com.marketmarney.mobile.beta438",context.getPackageName());
        assertEquals("4.38.0-beta",info.versionName);
        assertNotNull(MainActivity.class.getDeclaredMethod("navigate",int.class));
        assertNotNull(MainActivity.class.getDeclaredMethod("open",String.class));
        assertNotNull(MainActivity.class.getDeclaredMethod("createWeb"));
    }
}
