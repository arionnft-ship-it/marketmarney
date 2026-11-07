package com.marketmarney.mobile;
import android.app.Instrumentation;
import android.content.*;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.SystemClock;
import android.provider.MediaStore;
import android.webkit.WebView;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.uiautomator.*;
import java.io.*;
import java.lang.reflect.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.regex.Pattern;
import org.junit.*;
import static org.junit.Assert.*;

/** Real Android picker + local synthetic form. No production upload or user account. */
public class GalleryUi415Test {
 private Instrumentation inst;private MainActivity activity;private UiDevice device;private Uri testImage;
 private static final String FIXTURE_URL="https://marketmarney.com/__android43/news";
 private Object field(String n){try{Field f=MainActivity.class.getDeclaredField(n);f.setAccessible(true);return f.get(activity);}catch(Exception e){throw new RuntimeException(e);}}
 private String js(String expression)throws Exception{CountDownLatch done=new CountDownLatch(1);AtomicReference<String> value=new AtomicReference<>();inst.runOnMainSync(()->((WebView)field("web")).evaluateJavascript(expression,r->{value.set(r);done.countDown();}));assertTrue(done.await(8,TimeUnit.SECONDS));return value.get();}
 private void untilJs(String expression)throws Exception{for(int i=0;i<30;i++){if("true".equals(js(expression)))return;SystemClock.sleep(200);}fail("Condition: "+expression+" value="+js(expression));}
 private void capture(String name)throws Exception{File d=new File(activity.getExternalFilesDir(null),"gallery-tests");d.mkdirs();device.dumpWindowHierarchy(new File(d,name+".xml"));device.takeScreenshot(new File(d,name+".png"));}
 private void fixture(String accept)throws Exception{
  String html="<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'></head><body style='font:18px sans-serif;padding:22px;background:#fff;color:#172332'><h2>Uji galeri Marney</h2><p>File uji lokal, tidak diunggah.</p><input id='media' type='file' accept='"+accept+"' hidden><button style='padding:20px' onclick=\"document.getElementById('media').click()\">Pilih dari galeri</button><p id='result'></p><script>window.selectedName='';window.selectedData='';document.getElementById('media').onchange=()=>{const f=document.getElementById('media').files[0];if(!f)return;selectedName=f.name;const r=new FileReader();r.onload=()=>{selectedData=r.result;document.getElementById('result').textContent='Dipilih: '+f.name};r.readAsDataURL(f);};</script></body></html>";
  // A null historyUrl makes WebView.getUrl() about:blank. Use the actual fixture
  // origin so the test does not intentionally trigger the app's untrusted-page guard.
  inst.runOnMainSync(()->{WebView w=(WebView)field("web");w.stopLoading();w.loadDataWithBaseURL(FIXTURE_URL,html,"text/html","UTF-8",FIXTURE_URL);});
  untilJs("!!document.getElementById('media')");
  inst.runOnMainSync(()->assertEquals(FIXTURE_URL,((WebView)field("web")).getUrl()));
 }
 private void openPicker()throws Exception{UiObject2 button=device.wait(Until.findObject(By.text("Pilih dari galeri")),6000);assertNotNull(button);button.click();SystemClock.sleep(1700);capture("picker-open");assertNotEquals(activity.getPackageName(),device.getCurrentPackageName());}
 @Before public void setup()throws Exception{
  inst=InstrumentationRegistry.getInstrumentation();device=UiDevice.getInstance(inst);
  activity=(MainActivity)inst.startActivitySync(new Intent(inst.getTargetContext(),MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TASK).putExtra("startTab",1));
  SystemClock.sleep(550);inst.runOnMainSync(()->{StartupOverlay o=(StartupOverlay)field("launchOverlay");if(o!=null)o.dispose();});
 }
 @After public void cleanup()throws Exception{
  device.pressBack();if(activity!=null){if(testImage!=null)activity.getContentResolver().delete(testImage,null,null);inst.runOnMainSync(()->activity.finish());}
 }
 @Test public void selectingRealImageReturnsToFormWithoutUploading()throws Exception{
  ContentValues values=new ContentValues();values.put(MediaStore.Images.Media.DISPLAY_NAME,"Marney415-test.png");values.put(MediaStore.Images.Media.MIME_TYPE,"image/png");values.put(MediaStore.Images.Media.RELATIVE_PATH,"Pictures/Marney415Test");values.put(MediaStore.Images.Media.IS_PENDING,1);
  testImage=activity.getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,values);assertNotNull(testImage);
  try(OutputStream out=activity.getContentResolver().openOutputStream(testImage)){Bitmap b=Bitmap.createBitmap(64,64,Bitmap.Config.ARGB_8888);b.eraseColor(0xffc19741);assertTrue(b.compress(Bitmap.CompressFormat.PNG,100,out));b.recycle();}
  values.clear();values.put(MediaStore.Images.Media.IS_PENDING,0);activity.getContentResolver().update(testImage,values,null,null);SystemClock.sleep(1500);
  fixture("image/png");openPicker();capture("photo-picker-before-selection");
  UiObject2 photo=device.wait(Until.findObject(By.desc(Pattern.compile("(?i).*photo taken.*"))),8000);
  if(photo==null)photo=device.findObject(By.res(Pattern.compile(".*:id/icon_thumbnail")));
  if(photo==null)photo=device.findObject(By.text("Marney415-test.png"));
  if(photo==null){capture("photo-selector-not-found");fail("Test photo thumbnail not located");}
  photo.click();SystemClock.sleep(450);
  UiObject2 add=device.findObject(By.text(Pattern.compile("(?i)(add|done|select)( \\(1\\))?")));if(add!=null)add.click();
  device.wait(Until.hasObject(By.pkg(activity.getPackageName())),6000);
  untilJs("window.selectedData&&selectedData.startsWith('data:image/png;base64,')");
  assertEquals("true",js("selectedName.toLowerCase().endsWith('.png')"));capture("photo-returned-to-form");
  inst.runOnMainSync(()->assertNull(field("fileCallback")));
 }
 @Test public void cancelVideoPickerLeavesFormUsable()throws Exception{
  fixture("video/mp4");openPicker();capture("video-picker");device.pressBack();SystemClock.sleep(700);
  untilJs("document.getElementById('media').files.length===0");inst.runOnMainSync(()->assertNull(field("fileCallback")));
  assertNotNull(device.findObject(By.text("Pilih dari galeri")));capture("canceled-no-selection");
 }
 @Test public void documentAttachmentStillUsesDocumentPicker()throws Exception{
  fixture("application/pdf");openPicker();capture("document-picker");assertTrue(device.getCurrentPackageName().toLowerCase().contains("documentsui"));device.pressBack();SystemClock.sleep(500);
  inst.runOnMainSync(()->assertNull(field("fileCallback")));
 }
}
