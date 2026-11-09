package com.marketmarney.mobile;

import android.app.Instrumentation;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.InputStream;
import org.junit.Test;
import static org.junit.Assert.*;

/** Verifies that every native and bundled-web logo now uses the 4.32 artwork. */
public class Branding432Test {
    private static int[] colors(Bitmap bitmap){
        int black=0,orange=0,opaque=0,transparent=0;
        for(int y=0;y<bitmap.getHeight();y+=Math.max(1,bitmap.getHeight()/80)){
            for(int x=0;x<bitmap.getWidth();x+=Math.max(1,bitmap.getWidth()/80)){
                int p=bitmap.getPixel(x,y),a=(p>>>24)&255,r=(p>>>16)&255,g=(p>>>8)&255,b=p&255;
                if(a<16){transparent++;continue;}
                opaque++;
                if(r<70&&g<70&&b<70)black++;
                if(r>210&&g>55&&g<185&&b<85)orange++;
            }
        }
        return new int[]{black,orange,opaque,transparent};
    }

    private static void assertBrand(Bitmap bitmap,int width,int height){
        assertNotNull(bitmap);
        assertEquals(width,bitmap.getWidth());
        assertEquals(height,bitmap.getHeight());
        int[] c=colors(bitmap);
        assertTrue("black artwork",c[0]>20);
        assertTrue("orange artwork",c[1]>20);
        assertTrue("opaque artwork",c[2]>80);
        assertTrue("transparent padding",c[3]>20);
    }

    @Test public void marketMarneyArtworkIsPackagedForNativeAndBundledWeb()throws Exception{
        Instrumentation inst=InstrumentationRegistry.getInstrumentation();
        Bitmap nativeIcon=BitmapFactory.decodeResource(inst.getTargetContext().getResources(),R.drawable.mm_brand_logo);
        Bitmap wordmark=BitmapFactory.decodeResource(inst.getTargetContext().getResources(),R.drawable.mm_brand_wordmark);
        assertBrand(nativeIcon,512,512);
        assertBrand(wordmark,1024,269);
        try(InputStream in=inst.getTargetContext().getAssets().open("brand417/logo.png")){
            assertBrand(BitmapFactory.decodeStream(in),384,384);
        }
    }
}
