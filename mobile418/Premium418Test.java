package com.marketmarney.mobile;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import androidx.test.platform.app.InstrumentationRegistry;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import org.junit.Test;
import static org.junit.Assert.*;
public class Premium418Test {
 private final Context context=InstrumentationRegistry.getInstrumentation().getTargetContext();
 private byte[] asset(String path)throws Exception{try(InputStream in=context.getAssets().open(path);ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] b=new byte[8192];int n;while((n=in.read(b))!=-1)out.write(b,0,n);return out.toByteArray();}}
 @Test public void localLogoIsSmallTransparentAndNotBlank()throws Exception{
  byte[] bytes=asset("brand417/logo.png");assertTrue(bytes.length<180000);Bitmap b=BitmapFactory.decodeByteArray(bytes,0,bytes.length);assertNotNull(b);assertEquals(384,b.getWidth());assertEquals(384,b.getHeight());assertTrue(b.hasAlpha());int painted=0;for(int y=0;y<b.getHeight();y+=5)for(int x=0;x<b.getWidth();x+=5)if(android.graphics.Color.alpha(b.getPixel(x,y))>100)painted++;assertTrue(painted>1000);b.recycle();
 }
 @Test public void nativeOpeningUsesSizedApprovedLogo(){BitmapFactory.Options o=new BitmapFactory.Options();o.inJustDecodeBounds=true;BitmapFactory.decodeResource(context.getResources(),R.drawable.mm_brand_logo,o);assertEquals(512,o.outWidth);assertEquals(512,o.outHeight);}
 @Test public void premiumStylesPresentWithoutAddedEffects()throws Exception{
  for(String path:new String[]{"premium411.css","social411/app.css","group48/navigation.css","profile49/app.css"}){String css=new String(asset(path),java.nio.charset.StandardCharsets.UTF_8);int at=css.indexOf("/* MARNEY 4.18");assertTrue(path,at>=0);String patch=css.substring(at);assertFalse(patch.contains("backdrop-filter"));assertFalse(patch.contains("@font-face"));assertFalse(patch.contains("@keyframes"));assertTrue(patch.contains("prefers-reduced-motion"));}
  assertTrue(new String(asset("news43.html"),java.nio.charset.StandardCharsets.UTF_8).contains("4.18 editorial polish"));
 }
}
