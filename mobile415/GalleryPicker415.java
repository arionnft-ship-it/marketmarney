package com.marketmarney.mobile;

import android.app.Activity;
import android.content.ClipData;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ProviderInfo;
import android.net.Uri;
import android.os.Process;
import android.webkit.MimeTypeMap;
import android.webkit.WebChromeClient;
import androidx.activity.result.PickVisualMediaRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.Locale;

/** User-triggered, scoped photo picker. Never enumerates or uploads a media library. */
final class GalleryPicker415 {
    static final int MAX_FILES=10;
    static final class Selection {
        final String[] types;
        final boolean multiple,visual;
        final int limit;
        Selection(String[] accept,int mode,boolean capture){
            LinkedHashSet<String> clean=new LinkedHashSet<>();
            boolean allVisual=accept!=null&&accept.length>0;
            if(accept!=null)for(String group:accept){
                if(group==null){allVisual=false;continue;}
                for(String value:group.split(",")){
                    String type=value.trim().toLowerCase(Locale.ROOT);
                    if(type.startsWith("."))type=MimeTypeMap.getSingleton().getMimeTypeFromExtension(type.substring(1));
                    if(type==null||type.isEmpty()){allVisual=false;continue;}
                    clean.add(type);
                    if(!type.startsWith("image/")&&!type.startsWith("video/"))allVisual=false;
                }
            }
            types=clean.toArray(new String[0]);
            multiple=mode==WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE;
            visual=allVisual&&!clean.isEmpty()&&!capture&&(mode==WebChromeClient.FileChooserParams.MODE_OPEN||multiple);
            limit=multiple?MAX_FILES:1;
        }
        boolean accepts(String actual){
            if(!visual)return true;
            if(actual==null)return false;
            actual=actual.split(";",2)[0].trim().toLowerCase(Locale.ROOT);
            for(String type:types)if(type.equals(actual)||type.endsWith("/*")&&actual.startsWith(type.substring(0,type.length()-1)))return true;
            return false;
        }
        ActivityResultContracts.PickVisualMedia.VisualMediaType mediaType(){
            if(types.length==1&&!types[0].endsWith("/*"))return new ActivityResultContracts.PickVisualMedia.SingleMimeType(types[0]);
            boolean images=false,videos=false;
            for(String type:types){images|=type.startsWith("image/");videos|=type.startsWith("video/");}
            if(images&&videos)return ActivityResultContracts.PickVisualMedia.ImageAndVideo.INSTANCE;
            return images?ActivityResultContracts.PickVisualMedia.ImageOnly.INSTANCE:ActivityResultContracts.PickVisualMedia.VideoOnly.INSTANCE;
        }
    }
    static Intent create(Context context,Selection selection,WebChromeClient.FileChooserParams original){
        if(!selection.visual)return original.createIntent();
        PickVisualMediaRequest request=new PickVisualMediaRequest.Builder().setMediaType(selection.mediaType()).build();
        // Jetpack picks the Android photo picker, a supported system backport, or
        // OPEN_DOCUMENT on old devices. No app chooser wrapper is added.
        return selection.multiple
            ?new ActivityResultContracts.PickMultipleVisualMedia(selection.limit).createIntent(context,request)
            :new ActivityResultContracts.PickVisualMedia().createIntent(context,request);
    }
    static Intent fallback(Selection s){
        Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        if(s.types.length==1)intent.setType(s.types[0]);
        else {intent.setType("*/*");if(s.types.length>1)intent.putExtra(Intent.EXTRA_MIME_TYPES,s.types);}
        intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,s.multiple);
        return intent;
    }
    static Uri[] parse(int result,Intent data,int limit){
        if(result!=Activity.RESULT_OK||data==null)return null;
        LinkedHashSet<Uri> uris=new LinkedHashSet<>();
        ClipData clips=data.getClipData();
        if(clips!=null){
            if(clips.getItemCount()>limit)throw new IllegalArgumentException("Pilih maksimal "+limit+" berkas.");
            for(int i=0;i<clips.getItemCount();i++){
                Uri uri=clips.getItemAt(i).getUri();if(uri==null)throw new IllegalArgumentException("Berkas pilihan tidak valid.");uris.add(uri);
            }
        }
        if(data.getData()!=null)uris.add(data.getData());
        if(uris.size()>limit)throw new IllegalArgumentException("Pilih maksimal "+limit+" berkas.");
        return uris.isEmpty()?null:uris.toArray(new Uri[0]);
    }
    static boolean safeShape(Uri uri,String appPackage){
        return uri!=null&&"content".equalsIgnoreCase(uri.getScheme())&&uri.getAuthority()!=null
            &&!uri.getAuthority().isEmpty()&&uri.getUserInfo()==null&&uri.getFragment()==null
            &&!uri.getAuthority().equals(appPackage)&&!uri.getAuthority().startsWith(appPackage+".");
    }
    /** Called off the UI thread. Only metadata for explicitly selected URIs is read. */
    static Uri[] validate(Context context,Selection selection,Uri[] uris){
        if(uris==null)return null;
        if(uris.length<1||uris.length>selection.limit)throw new IllegalArgumentException("Jumlah pilihan tidak sesuai.");
        ArrayList<Uri> allowed=new ArrayList<>();
        for(Uri uri:uris){
            if(Thread.currentThread().isInterrupted())return null;
            if(!safeShape(uri,context.getPackageName()))throw new IllegalArgumentException("Berkas ini tidak dapat dipilih.");
            if(context.checkUriPermission(uri,Process.myPid(),Process.myUid(),Intent.FLAG_GRANT_READ_URI_PERMISSION)!=PackageManager.PERMISSION_GRANTED)
                throw new IllegalArgumentException("Akses berkas belum diberikan. Pilih kembali dari galeri.");
            ProviderInfo provider=context.getPackageManager().resolveContentProvider(uri.getAuthority(),0);
            if(provider!=null&&provider.applicationInfo!=null&&provider.applicationInfo.uid==Process.myUid())
                throw new IllegalArgumentException("Berkas internal aplikasi tidak dapat diunggah melalui pemilih.");
            if(selection.visual&&!selection.accepts(context.getContentResolver().getType(uri)))
                throw new IllegalArgumentException("Format belum didukung untuk unggahan ini. Pilih foto JPG/PNG/WebP atau video MP4 sesuai tombol.");
            allowed.add(uri);
        }
        return allowed.toArray(new Uri[0]);
    }
}
