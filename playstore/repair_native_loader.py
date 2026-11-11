#!/usr/bin/env python3
"""Ensure Android-only loading cards cannot remain attached after WebView readiness.

This patches ONLY the reconstructed Play candidate. It does not change the
web content readiness thresholds, publicly deployed website, or 4.39 beta.
"""
from pathlib import Path

def apply(root:Path)->None:
    file=root/"app/src/main/java/com/marketmarney/mobile/MainActivity.java"
    text=file.read_text(encoding="utf-8")
    old='''    private void clearXauLoading(){
        if(xauLoading!=null){Log.i("MMPLAY_UI","clear tab="+tab+" token="+xauContentToken);frame.removeView(xauLoading);xauLoading=null;}
    }'''
    new='''    private void clearXauLoading(){
        // Native overlay can be reconstructed during onPageStarted and open().
        // Remove ALL tagged cards, not just the last reference, and invalidate
        // the underlying WebView immediately to avoid a retained stale frame.
        int removed=0;
        if(frame!=null){
            for(int i=frame.getChildCount()-1;i>=0;i--){
                View child=frame.getChildAt(i);
                if(child==xauLoading||"mm-play-loading".equals(child.getTag())){
                    frame.removeViewAt(i);removed++;
                }
            }
        }
        xauLoading=null;
        if(firstPaint&&web!=null&&frame!=null&&web.getParent()==frame){
            web.setVisibility(View.VISIBLE);
            web.bringToFront();
            web.invalidate();
        }
        if(frame!=null){frame.requestLayout();frame.invalidate();}
        Log.i("MMPLAY_UI","clear tab="+tab+" token="+xauContentToken+" removed="+removed
            +" remaining="+(frame==null?-1:frame.getChildCount()));
    }'''
    if text.count(old)!=1:
        raise RuntimeError("Cannot find verified loading card removal source")
    text=text.replace(old,new,1)
    old2='''        xauLoading=box;
        frame.addView(xauLoading,new FrameLayout.LayoutParams(-1,-1));xauLoading.bringToFront();'''
    new2='''        box.setTag("mm-play-loading");
        xauLoading=box;
        frame.addView(xauLoading,new FrameLayout.LayoutParams(-1,-1));xauLoading.bringToFront();'''
    if text.count(old2)!=1:
        raise RuntimeError("Cannot find verified loading card creation")
    text=text.replace(old2,new2,1)
    # Ensure the reported ready state is only logged after the overlay has been
    # removed; the CI screenshot remains the independent user-visible check.
    old3='''        firstPaint=true;cancelPageWait();clearXauLoading();clearOffline();
        Log.i("MMPLAY_PAGE","ready tab="+tab+" path="+Uri.parse(url).getPath());'''
    new3='''        firstPaint=true;cancelPageWait();clearXauLoading();clearOffline();
        boolean stillCovered=false;
        for(int i=0;i<frame.getChildCount();i++){
            View child=frame.getChildAt(i);
            if("mm-play-loading".equals(child.getTag()))stillCovered=true;
        }
        if(stillCovered){
            Log.e("MMPLAY_UI","ready-rejected: native overlay attached tab="+tab);
            showFailure("EMPTY","Halaman tertutup layar pemuatan. Coba muat ulang.");
            return;
        }
        Log.i("MMPLAY_PAGE","ready tab="+tab+" path="+Uri.parse(url).getPath());'''
    if text.count(old3)!=1:
        raise RuntimeError("Cannot find verified page-ready callback")
    text=text.replace(old3,new3,1)
    file.write_text(text,encoding="utf-8")

if __name__=="__main__":
    import sys
    apply(Path(sys.argv[1] if len(sys.argv)>1 else "android439"))
    print("Play-only overlay lifecycle cleanup installed")
