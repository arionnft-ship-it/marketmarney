package com.marketmarney.mobile;

import android.content.pm.PackageInfo;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import org.junit.Test;
import static org.junit.Assert.*;

/** Keeps the original bounded-preload guarantees while accepting 4.39 buffer priority. */
public class Reels434PerformanceTest {
    private String asset(String name)throws Exception{
        try(InputStream in=InstrumentationRegistry.getInstrumentation().getTargetContext().getAssets().open(name);
            ByteArrayOutputStream out=new ByteArrayOutputStream()){
            byte[] buffer=new byte[8192];int count;
            while((count=in.read(buffer))!=-1)out.write(buffer,0,count);
            return out.toString("UTF-8");
        }
    }

    @Test public void reelsUsesBoundedAdaptivePreloading()throws Exception{
        String standalone=asset("reels46.js");
        String bundled=asset("social411/bundle427.js");
        for(String script:new String[]{standalone,bundled}){
            assertTrue(script.contains("memoryGb=Number(navigator.deviceMemory||4)"));
            assertTrue(script.contains("keepAhead=pressure>=10||powerSaving?0:(fastNetwork&&memoryGb>=4?2:1)"));
            assertTrue(script.contains("attach(st,'auto','high')"));
            assertTrue(script.contains("scheduleRelease(st,starved?180:releaseDelay)"));
            assertTrue(script.contains("setAttribute('fetchpriority',priority||'low')"));
            assertTrue(script.contains("intersectionRatio>.58"));
            assertTrue(script.contains("releaseTimer:0"));
            assertTrue(script.contains("bufferStarved"));
            assertFalse(script.contains("if(n===i)attach(st,conservative?'none':'metadata')"));
        }
    }

    @Test public void renderingAndStallRecoveryAreOptimized()throws Exception{
        String css=asset("performance434.css");
        String reelFix=asset("reels433.js");
        assertTrue(css.contains("content-visibility:auto"));
        assertTrue(css.contains("contain-intrinsic-size:680px"));
        assertTrue(css.contains("backdrop-filter:none"));
        assertTrue(reelFix.contains("},5000);"));
        assertTrue(reelFix.contains("document.getElementById('shReelFeed')||document.body"));
        assertFalse(reelFix.contains("bodyObserver.observe(document.body"));

        String packageName=InstrumentationRegistry.getInstrumentation().getTargetContext().getPackageName();
        PackageInfo info=InstrumentationRegistry.getInstrumentation().getTargetContext().getPackageManager().getPackageInfo(packageName,0);
        assertEquals("com.marketmarney.mobile.beta439",packageName);
        assertEquals("4.39.0-beta",info.versionName);
    }
}
