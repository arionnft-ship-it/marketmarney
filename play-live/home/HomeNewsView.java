package com.marketmarney.mobile;

import android.content.Context;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Typeface;
import android.util.TypedValue;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import java.util.Collections;
import java.util.List;

/** A local article list and reader are available during startup or loss of connectivity. */
final class HomeNewsView extends ScrollView {
    private final LinearLayout column, list;
    private final TextView meta, status;
    private final Button retry;
    private List<HomeNews.Story> stories = Collections.emptyList();
    private boolean local, reading, used;
    private long stamp;
    private static final int INK = Color.rgb(25,38,50), SECONDARY = Color.rgb(76,87,98);
    HomeNewsView(Context context,Runnable retryAction){
        super(context);
        setBackgroundColor(Color.WHITE);setFillViewport(true);
        column=vertical();
        column.setPadding(dp(23),dp(26),dp(23),dp(22));addView(column);
        list=vertical();meta=text("",14,false);status=text("",14,false);
        retry=button("Perbarui berita",retryAction);
        renderList();
    }
    void setNews(List<HomeNews.Story> items,boolean local,long stamp){
        this.stories=items;this.local=local;this.stamp=stamp;
        if(!reading)renderList();
    }
    private void renderList(){
        column.removeAllViews();list.removeAllViews();
        column.addView(text("MarketMarney",24,true));
        TextView title=text("Beranda",18,true);title.setPadding(0,dp(15),0,dp(3));column.addView(title);
        meta.setText(local?(stamp==0?"Edisi tersimpan dalam aplikasi":"Edisi tersimpan di perangkat"):"Berita redaksi");
        column.addView(meta);
        for(HomeNews.Story story:stories){
            Button headline=button(story.title,()->openArticle(story));
            headline.setTag("home-headline");headline.setTextSize(TypedValue.COMPLEX_UNIT_SP,18);
            headline.setGravity(android.view.Gravity.START|android.view.Gravity.CENTER_VERTICAL);
            headline.setPadding(0,dp(12),0,dp(6));headline.setTextColor(INK);
            headline.setTypeface(Typeface.DEFAULT,Typeface.BOLD);list.addView(headline);
            TextView date=text(date(story),12,false);list.addView(date);
            if(!story.summary.isEmpty()){
                TextView summary=text(story.summary,15,false);summary.setMaxLines(2);
                summary.setEllipsize(android.text.TextUtils.TruncateAt.END);list.addView(summary);
            }
            View rule=new View(getContext());rule.setBackgroundColor(0xffe5e8eb);
            LinearLayout.LayoutParams sep=new LinearLayout.LayoutParams(-1,dp(1));sep.topMargin=dp(12);list.addView(rule,sep);
        }
        column.addView(list);column.addView(status);column.addView(retry);
        if(stories.isEmpty()&&!local&&stamp==0){setStatus(null);return;}
        if(!stories.isEmpty()&&local)setStatus("Anda dapat memperbarui berita saat terhubung ke internet.");
        else if(!stories.isEmpty())setStatus(null);
        else setStatus(local?"Berita belum tersedia pada perangkat ini.":"Belum ada artikel yang dapat ditampilkan.");
    }
    private static String date(HomeNews.Story s){
        if(s.date.length()<10)return s.source;
        return s.date.substring(0,10)+(s.source.isEmpty()?"":" · "+s.source);
    }
    void setStatus(String message){
        status.setText(message);status.setVisibility(message==null?GONE:VISIBLE);
        retry.setVisibility(message==null?GONE:VISIBLE);
    }
    private void openArticle(HomeNews.Story s){
        used=true;reading=true;column.removeAllViews();
        column.addView(button("Kembali ke Beranda",()->goBack()));
        TextView headline=text(s.title,24,true);
        headline.setPadding(0,dp(16),0,dp(8));column.addView(headline);
        column.addView(text(date(s),13,false));
        TextView body=text(s.body,17,false);body.setTextColor(INK);body.setLineSpacing(dp(3),1f);
        body.setPadding(0,dp(18),0,dp(20));body.setTextIsSelectable(true);body.setTag("home-story-body");
        column.addView(body);scrollTo(0,0);
    }
    @Override public boolean dispatchTouchEvent(android.view.MotionEvent event){
        if(event.getActionMasked()==android.view.MotionEvent.ACTION_DOWN)used=true;
        return super.dispatchTouchEvent(event);
    }
    boolean hasBeenUsed(){return used;}
    boolean isReading(){return reading;}
    boolean goBack(){if(!reading)return false;reading=false;renderList();scrollTo(0,0);return true;}
    private LinearLayout vertical(){LinearLayout l=new LinearLayout(getContext());l.setOrientation(LinearLayout.VERTICAL);return l;}
    private int dp(int v){return Math.round(v*getResources().getDisplayMetrics().density);}
    private TextView text(String s,int size,boolean bold){
        TextView t=new TextView(getContext());t.setText(s);t.setTextSize(TypedValue.COMPLEX_UNIT_SP,size);
        t.setTextColor(bold?INK:SECONDARY);if(bold)t.setTypeface(Typeface.DEFAULT,Typeface.BOLD);return t;
    }
    private Button button(String s,Runnable action){
        Button b=new Button(getContext(),null,android.R.attr.borderlessButtonStyle);
        b.setText(s);b.setAllCaps(false);b.setTextColor(ColorStateList.valueOf(0xff865213));
        b.setOnClickListener(v->action.run());return b;
    }
}
