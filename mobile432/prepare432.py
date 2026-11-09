#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib
import json
import shutil
import math

base=Path(__file__).resolve().parent
root=Path('android432')
if not root.exists():
    raise SystemExit('android432 source is missing')

ORANGE=(255,116,0,255)
BLACK=(5,6,9,255)

def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def read(rel): return (root/rel).read_text(encoding='utf-8')
def write(rel,text):
    path=root/rel
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(text,encoding='utf-8')
def replace(rel,old,new,count=1):
    text=read(rel)
    actual=text.count(old)
    assert actual==count,f'{rel}: expected {count}, found {actual}: {old[:140]!r}'
    write(rel,text.replace(old,new))
def snapshot(): return {p.relative_to(root).as_posix():digest(p) for p in root.rglob('*') if p.is_file()}
def save_png(image,path):
    path.parent.mkdir(parents=True,exist_ok=True)
    image.save(path,optimize=True)

def find_font(bold,size):
    names=['DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf','LiberationSans-Bold.ttf' if bold else 'LiberationSans-Regular.ttf']
    roots=[Path('/usr/share/fonts/truetype/dejavu'),Path('/usr/share/fonts/truetype/liberation2')]
    for rootdir in roots:
        for name in names:
            candidate=rootdir/name
            if candidate.exists():
                return ImageFont.truetype(str(candidate),size)
    return ImageFont.load_default()

def cubic_bezier(p0,p1,p2,p3,count=140):
    points=[]
    for i in range(count+1):
        t=i/count;u=1-t
        points.append((u**3*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t**3*p3[0],u**3*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t**3*p3[1]))
    return points

def draw_icon_master():
    scale=4;size=1024
    image=Image.new('RGBA',(size*scale,size*scale),(0,0,0,0));draw=ImageDraw.Draw(image)
    point=lambda p:(int(p[0]*scale),int(p[1]*scale))
    m=[(125,865),(125,170),(300,170),(510,495),(724,170),(899,170),(899,865),(730,865),(730,490),(510,790),(295,490),(295,865)]
    draw.polygon([point(p) for p in m],fill=BLACK)
    bars=[[(205,865),(205,730),(300,700),(300,865)],[(330,865),(330,625),(435,585),(435,865)],[(465,865),(465,495),(590,450),(590,865)]]
    for bar in bars:draw.polygon([point(p) for p in bar],fill=ORANGE)
    curve=cubic_bezier((70,820),(270,680),(570,635),(850,120))
    curve_scaled=[point(p) for p in curve]
    draw.line(curve_scaled,fill=(170,55,0,255),width=55*scale,joint='curve')
    draw.line(curve_scaled,fill=ORANGE,width=43*scale,joint='curve')
    ex,ey=curve[-1];px,py=curve[-8];angle=math.atan2(ey-py,ex-px);length=150;half=75
    bx=ex-length*math.cos(angle);by=ey-length*math.sin(angle)
    left=(bx+half*math.sin(angle),by-half*math.cos(angle));right=(bx-half*math.sin(angle),by+half*math.cos(angle))
    draw.polygon([point((ex,ey)),point(left),point(right)],fill=ORANGE)
    return image.resize((size,size),Image.Resampling.LANCZOS)

def draw_wordmark_master(icon):
    scale=4;width=1600;height=420
    image=Image.new('RGBA',(width*scale,height*scale),(0,0,0,0));draw=ImageDraw.Draw(image)
    icon_large=icon.resize((350*scale,350*scale),Image.Resampling.LANCZOS)
    image.alpha_composite(icon_large,(20*scale,30*scale))
    bold=find_font(True,142*scale);regular=find_font(False,50*scale)
    x=390*scale;y=74*scale
    draw.text((x,y),'Market',font=bold,fill=BLACK,anchor='la')
    box=draw.textbbox((x,y),'Market',font=bold,anchor='la');x2=box[2]+4*scale
    draw.text((x2,y),'Marney',font=bold,fill=ORANGE,anchor='la')
    domain='marketmarney.com';domain_box=draw.textbbox((0,0),domain,font=regular);text_width=domain_box[2]-domain_box[0]
    center=(x+(width*scale-x))/2;domain_y=268*scale
    draw.text((center,domain_y),domain,font=regular,fill=BLACK,anchor='ma')
    line_y=292*scale;gap=25*scale
    left_end=center-text_width/2-gap;right_start=center+text_width/2+gap
    draw.rounded_rectangle((400*scale,line_y-3*scale,int(left_end),line_y+3*scale),radius=3*scale,fill=ORANGE)
    draw.rounded_rectangle((int(right_start),line_y-3*scale,1540*scale,line_y+3*scale),radius=3*scale,fill=ORANGE)
    return image.resize((width,height),Image.Resampling.LANCZOS)

icon_src=base/'marketmarney_icon_master.png'
word_src=base/'marketmarney_wordmark.png'
icon_master=draw_icon_master();wordmark_master=draw_wordmark_master(icon_master)
icon_master.save(icon_src,optimize=True);wordmark_master.save(word_src,optimize=True)
ICON_SHA=digest(icon_src);WORDMARK_SHA=digest(word_src)

before=snapshot()

replace('app/build.gradle',"applicationId 'com.marketmarney.mobile.beta431'","applicationId 'com.marketmarney.mobile.beta432'")
replace('app/build.gradle','versionCode 35','versionCode 36')
replace('app/build.gradle',"versionName '4.31.0-beta'","versionName '4.32.0-beta'")
replace('app/src/main/res/values/strings.xml','Marney 4.31 Simple','MarketMarney 4.32')

main='app/src/main/java/com/marketmarney/mobile/MainActivity.java'
replace(main,'MarketMarney 4.31.0-beta','MarketMarney 4.32.0-beta')
replace(main,'MarketMarneyAndroid/4.31 AppShell','MarketMarneyAndroid/4.32 AppShell')
replace(main,"version:'4.31'","version:'4.32'")
replace(main,"dataset.mmAndroid='431'","dataset.mmAndroid='432'")
replace(main,"dataset.revision!=='431'","dataset.revision!=='432'",count=2)
replace(main,"dataset.revision='431'","dataset.revision='432'",count=2)
replace(main,'brand.setContentDescription("MARNEY — MarketMarney")','brand.setContentDescription("MarketMarney")')

manifest='app/src/main/AndroidManifest.xml'
replace(manifest,'android:icon="@drawable/mm_brand_logo"','android:icon="@mipmap/ic_launcher"')
replace(manifest,'android:roundIcon="@drawable/mm_brand_logo"','android:roundIcon="@mipmap/ic_launcher"')

branding='app/src/main/assets/branding417.js'
replace(branding,"logo.alt = 'MARNEY';","logo.alt = 'MarketMarney';")

shutil.copy2(base/'StartupOverlay.java',root/'app/src/main/java/com/marketmarney/mobile/StartupOverlay.java')
shutil.copy2(base/'OpeningSoft426Test.java',root/'app/src/androidTest/java/com/marketmarney/mobile/OpeningSoft426Test.java')
branding_test=root/'app/src/androidTest/java/com/marketmarney/mobile/Branding432Test.java'
branding_test.parent.mkdir(parents=True,exist_ok=True)
shutil.copy2(base/'Branding432Test.java',branding_test)
shutil.copy2(base/'Marney432-Panduan.md',root/'README-MULAI-DISINI.md')

version_tests=[]
test_root=root/'app/src/androidTest/java'
for test_file in test_root.rglob('*.java'):
    text=test_file.read_text(encoding='utf-8')
    updated=text.replace('4.31.0-beta','4.32.0-beta')
    if updated!=text:
        test_file.write_text(updated,encoding='utf-8')
        version_tests.append(test_file.relative_to(root).as_posix())

icon=Image.open(icon_src).convert('RGBA')
wordmark=Image.open(word_src).convert('RGBA')
assert icon.size==(1024,1024)
assert wordmark.size==(1600,420)

save_png(icon.resize((512,512),Image.Resampling.LANCZOS),root/'app/src/main/res/drawable-nodpi/mm_brand_logo.png')
save_png(icon.resize((384,384),Image.Resampling.LANCZOS),root/'app/src/main/assets/brand417/logo.png')
save_png(wordmark.resize((1024,269),Image.Resampling.LANCZOS),root/'app/src/main/res/drawable-nodpi/mm_brand_wordmark.png')

launcher=Image.new('RGBA',(192,192),(0,0,0,0))
draw=ImageDraw.Draw(launcher)
draw.rounded_rectangle((4,4,188,188),radius=42,fill=(255,255,255,255),outline=(230,233,238,255),width=2)
launcher.alpha_composite(icon.resize((150,150),Image.Resampling.LANCZOS),(21,21))
save_png(launcher,root/'app/src/main/res/mipmap-xxxhdpi/ic_launcher.png')

write('app/src/main/res/drawable/mm_opening_monogram.xml','''<?xml version="1.0" encoding="utf-8"?>
<inset xmlns:android="http://schemas.android.com/apk/res/android"
    android:insetLeft="4%" android:insetTop="30%"
    android:insetRight="4%" android:insetBottom="30%">
    <bitmap android:src="@drawable/mm_brand_wordmark" android:gravity="fill" />
</inset>
''')
write('app/src/main/res/drawable/mm_splash_logo_clear.xml','''<?xml version="1.0" encoding="utf-8"?>
<inset xmlns:android="http://schemas.android.com/apk/res/android"
    android:insetLeft="14%" android:insetTop="14%"
    android:insetRight="14%" android:insetBottom="14%">
    <bitmap android:src="@drawable/mm_brand_logo" android:gravity="fill" />
</inset>
''')
write('app/src/main/res/drawable/mm_launcher_foreground.xml','''<?xml version="1.0" encoding="utf-8"?>
<inset xmlns:android="http://schemas.android.com/apk/res/android"
    android:insetLeft="8dp" android:insetTop="8dp"
    android:insetRight="8dp" android:insetBottom="8dp">
    <bitmap android:src="@drawable/mm_brand_logo" android:gravity="fill" />
</inset>
''')
write('app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml','''<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@android:color/white" />
    <foreground android:drawable="@drawable/mm_launcher_foreground" />
</adaptive-icon>
''')
write('app/src/main/res/values/branding.xml','''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="mm_brand_background">#FFFFFF</color>
</resources>
''')

after=snapshot()
changed=sorted(set(before)^set(after)|{p for p in set(before)&set(after) if before[p]!=after[p]})
required={
    'README-MULAI-DISINI.md','app/build.gradle','app/src/main/AndroidManifest.xml',
    'app/src/main/assets/brand417/logo.png','app/src/main/assets/branding417.js',
    'app/src/main/java/com/marketmarney/mobile/MainActivity.java','app/src/main/java/com/marketmarney/mobile/StartupOverlay.java',
    'app/src/main/res/drawable-nodpi/mm_brand_logo.png','app/src/main/res/drawable-nodpi/mm_brand_wordmark.png',
    'app/src/main/res/drawable/mm_launcher_foreground.xml','app/src/main/res/drawable/mm_opening_monogram.xml',
    'app/src/main/res/drawable/mm_splash_logo_clear.xml','app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
    'app/src/main/res/mipmap-xxxhdpi/ic_launcher.png','app/src/main/res/values/branding.xml',
    'app/src/main/res/values/strings.xml','app/src/androidTest/java/com/marketmarney/mobile/OpeningSoft426Test.java',
    'app/src/androidTest/java/com/marketmarney/mobile/Branding432Test.java',
}
allowed=required|set(version_tests)
assert required<=set(changed),{'missing':sorted(required-set(changed))}
assert set(changed)<=allowed,{'unexpected':sorted(set(changed)-allowed)}

manifest_data={
    'release':'4.32.0-beta','package':'com.marketmarney.mobile.beta432',
    'purpose':'Replace every application logo with the new black-and-orange MarketMarney identity.',
    'sourceArtwork':{'iconSha256':ICON_SHA,'wordmarkSha256':WORDMARK_SHA},
    'changed':[{'path':rel,'beforeSha256':before.get(rel),'afterSha256':after.get(rel)} for rel in changed],
    'preserved':{rel:sha for rel,sha in sorted(before.items()) if rel not in changed},
}
Path('verified432.json').write_text(json.dumps(manifest_data,indent=2)+'\n',encoding='utf-8')
print(f"Verified 4.32 MarketMarney logo patch: {len(changed)} changed files; {len(manifest_data['preserved'])} unchanged files.")
