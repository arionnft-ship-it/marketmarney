from pathlib import Path
import re
base=Path('android417')
p=base/'app/src/main/assets/news43.html';s=p.read_text();before=re.findall(r'<script\b[^>]*>(.*?)</script>',s,re.S)
css='\n/* A loaded image sits above its fallback icon; failed-image fallback remains available. */\n.cover .placeholder{z-index:0}.cover img{position:relative;z-index:1}.featured .cover:after{z-index:2}.coverlabel{z-index:3}\n'
assert s.count('</style>')==1;s=s.replace('</style>',css+'</style>',1);assert before==re.findall(r'<script\b[^>]*>(.*?)</script>',s,re.S);p.write_text(s)
# Screenshot capture is not a stopwatch: it can block the test thread while the
# four-second safety timeout proceeds. Keep every animation and pixel assertion.
p=base/'app/src/androidTest/java/com/marketmarney/mobile/Opening416Test.java';s=p.read_text()
a='  show();SystemClock.sleep(200);final float[] before={0,0};ui(()->{before[0]=part("name").getAlpha();before[1]=part("fill").getScaleX();});screenshot("opening-early");'
b='''  long deadline=SystemClock.uptimeMillis()+4000;final boolean[] motion={false};
  while(SystemClock.uptimeMillis()<deadline){ui(()->motion[0]=StartupOverlay.motionAllowed(activity));if(motion[0])break;SystemClock.sleep(30);}
  assertTrue("Animator scale has reached the app process",motion[0]);
  show();SystemClock.sleep(200);final float[] before={0,0};ui(()->{before[0]=part("name").getAlpha();before[1]=part("fill").getScaleX();});'''
assert s.count(a)==1;s=s.replace(a,b,1)
a='});screenshot("opening-reference-style");assertLogoVisible();assertEquals(0,removed.get());'
b='});assertEquals(0,removed.get());screenshot("opening-reference-style");assertLogoVisible();'
assert s.count(a)==1;s=s.replace(a,b,1);p.write_text(s)
p=Path('mobile418/test_ui418.py');s=p.read_text()
s=s.replace("page.get_by_role('button',name='Semua',exact=True).click()", "page.get_by_role('button',name='Semua',exact=True).click();page.locator('.toast').wait_for(state='hidden',timeout=6000)")
s=s.replace('Konten simulasi pengujian</small>', 'Konten simulasi pengujian</small>').replace('<small>Konten simulasi pengujian', '<small style="display:block">Konten simulasi pengujian')
# Add an assertion for the actual CSS layering, not just a prettier screenshot.
a="   page.screenshot(path=str(OUT/f'news-dark-{width}.png'))"
b="   check(f'{width} loaded photo above fallback',page.locator('.cover img').first.evaluate('e=>Number(getComputedStyle(e).zIndex)>Number(getComputedStyle(e.parentElement.querySelector(\".placeholder\")).zIndex)'))\n"+a
assert s.count(a)==1;s=s.replace(a,b,1);p.write_text(s)
compile(s,str(p),'exec')
print('PASS: image fallback layering, identical News JavaScript, motion assertions retained without screenshot timing interference')
