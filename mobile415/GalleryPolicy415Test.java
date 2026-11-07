package com.marketmarney.mobile;
import android.app.Activity;
import android.content.*;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import android.webkit.WebChromeClient;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import static org.junit.Assert.*;

public class GalleryPolicy415Test {
 private Context ctx(){return InstrumentationRegistry.getInstrumentation().getTargetContext();}
 private GalleryPicker415.Selection select(String...types){return new GalleryPicker415.Selection(types,0,false);}
 @Test public void imagesAreRestrictedToAcceptedFormats(){GalleryPicker415.Selection s=select("image/jpeg,image/png,image/webp");assertTrue(s.visual);assertTrue(s.accepts("image/png"));assertFalse(s.accepts("image/gif"));assertFalse(s.accepts("video/mp4"));}
 @Test public void reelsOnlyAcceptMp4(){GalleryPicker415.Selection s=select("video/mp4");assertTrue(s.visual);assertTrue(s.accepts("video/mp4"));assertFalse(s.accepts("video/quicktime"));assertFalse(s.accepts("image/jpeg"));}
 @Test public void storiesAcceptBothMediaFamilies(){GalleryPicker415.Selection s=select("image/jpeg","image/png","video/mp4");assertTrue(s.visual);assertTrue(s.accepts("image/png"));assertTrue(s.accepts("video/mp4"));}
 @Test public void extensionsAndWhitespaceNormalize(){GalleryPicker415.Selection s=select(" .jpg, .png ");assertTrue(s.visual);assertTrue(s.accepts("image/jpeg"));assertTrue(s.accepts("IMAGE/PNG"));}
 @Test public void noAcceptTypeKeepsGeneralPicker(){assertFalse(select().visual);assertFalse(select("").visual);assertFalse(select("*/*").visual);}
 @Test public void documentsAndAudioDoNotOpenPhotoPicker(){assertFalse(select("application/pdf").visual);assertFalse(select("image/png,application/pdf").visual);assertFalse(select("audio/*").visual);}
 @Test public void captureAndSaveModesAreNotHijacked(){assertFalse(new GalleryPicker415.Selection(new String[]{"image/*"},0,true).visual);assertFalse(new GalleryPicker415.Selection(new String[]{"image/*"},3,false).visual);}
 @Test public void nativeMediaIntentDoesNotWrapChooser(){GalleryPicker415.Selection s=select("video/mp4");Intent i=GalleryPicker415.create(ctx(),s,null);assertNotEquals(Intent.ACTION_CHOOSER,i.getAction());assertEquals("video/mp4",i.getType());if(Build.VERSION.SDK_INT>=33)assertEquals(MediaStore.ACTION_PICK_IMAGES,i.getAction());}
 @Test public void fallbackRespectsMimeAndMultiple(){GalleryPicker415.Selection s=new GalleryPicker415.Selection(new String[]{"image/png","video/mp4"},1,false);Intent i=GalleryPicker415.fallback(s);assertEquals(Intent.ACTION_OPEN_DOCUMENT,i.getAction());assertTrue(i.hasCategory(Intent.CATEGORY_OPENABLE));assertTrue(i.getBooleanExtra(Intent.EXTRA_ALLOW_MULTIPLE,false));assertArrayEquals(s.types,i.getStringArrayExtra(Intent.EXTRA_MIME_TYPES));}
 @Test public void cancellationIsNull(){assertNull(GalleryPicker415.parse(Activity.RESULT_CANCELED,new Intent(),1));assertNull(GalleryPicker415.parse(Activity.RESULT_OK,null,1));}
 @Test public void returnedUrisAreDeduplicated(){Uri a=Uri.parse("content://media/external/images/media/9");Intent i=new Intent().setData(a);i.setClipData(ClipData.newRawUri("chosen",a));assertArrayEquals(new Uri[]{a},GalleryPicker415.parse(Activity.RESULT_OK,i,1));}
 @Test public void singleInputRejectsManyUris(){ClipData c=ClipData.newRawUri("one",Uri.parse("content://media/1"));c.addItem(new ClipData.Item(Uri.parse("content://media/2")));Intent i=new Intent();i.setClipData(c);try{GalleryPicker415.parse(Activity.RESULT_OK,i,1);fail();}catch(IllegalArgumentException expected){}}
 @Test public void hostileUriSchemesAndOwnProviderAreRejected(){String pkg=ctx().getPackageName();for(String u:new String[]{"file:///data/data/secret","https://example.com/x","content://"+pkg+".provider/secret","content://u:p@media/images/1"})assertFalse(u,GalleryPicker415.safeShape(Uri.parse(u),pkg));assertTrue(GalleryPicker415.safeShape(Uri.parse("content://media/picker/1"),pkg));}
 @Test public void noBroadLibraryPermissionsAdded()throws Exception{String[] all=ctx().getPackageManager().getPackageInfo(ctx().getPackageName(),android.content.pm.PackageManager.GET_PERMISSIONS).requestedPermissions;if(all!=null)for(String p:all)assertFalse(p,p.matches(".*(READ_MEDIA_IMAGES|READ_MEDIA_VIDEO|READ_EXTERNAL_STORAGE|WRITE_EXTERNAL_STORAGE|MANAGE_EXTERNAL_STORAGE)$"));}
 @Test public void selectionLimitIsBounded(){GalleryPicker415.Selection one=select("image/*"),many=new GalleryPicker415.Selection(new String[]{"image/*"},1,false);assertEquals(1,one.limit);assertEquals(10,many.limit);assertTrue(many.multiple);}
 @Test public void forgedUnreadableContentCannotReachWebView(){try{GalleryPicker415.validate(ctx(),select("image/png"),new Uri[]{Uri.parse("content://untrusted.invalid/no-grant")});fail();}catch(IllegalArgumentException expected){}}
}
