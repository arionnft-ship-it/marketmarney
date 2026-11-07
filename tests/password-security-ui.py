from pathlib import Path
from urllib.parse import urlparse
import json,sys
from playwright.sync_api import sync_playwright
html=Path(sys.argv[1]).read_text()
base='https://marketmarney.test';checks=[]
def ok(name,value): assert value,name;checks.append({'check':name,'passed':True})
with sync_playwright() as p:
 browser=p.chromium.launch()
 for width in (390,1280):
  ctx=browser.new_context(viewport={'width':width,'height':960},service_workers='block');page=ctx.new_page();errors=[];posts=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  def route(route):
   req=route.request;path=urlparse(req.url).path
   if path=='/akun.html':return route.fulfill(status=200,body=html,content_type='text/html')
   if path.startswith('/assets/'):return route.fulfill(status=200,body='',content_type='text/javascript' if path.endswith('.js') else 'text/css')
   if path=='/api/community/status':return route.fulfill(json={'registrationEnabled':True,'user':None,'categories':[],'emailOtp':{'required':True,'available':True},'passwordRecovery':{'required':True,'available':True,'digits':6,'expiresInSeconds':300,'resendAfterSeconds':60}})
   if path=='/api/auth/google/config':return route.fulfill(json={'enabled':True,'linked':False,'googleSignupEnabled':False})
   if path=='/api/community/password/forgot/otp':posts.append((path,req.post_data_json));return route.fulfill(json={'ok':True,'challengeId':'a'*64,'expiresInSeconds':300,'resendAfterSeconds':60,'message':'Jika email terhubung ke akun terverifikasi, kode pemulihan telah dikirim. Periksa Inbox dan Spam.'})
   if path=='/api/community/password/forgot/complete':posts.append((path,req.post_data_json));return route.fulfill(json={'ok':True,'message':'Password berhasil diganti. Silakan masuk menggunakan password baru.'})
   if path.startswith('/api/'):return route.fulfill(status=404,json={'error':'mock'})
   return route.continue_()
  page.route('**/*',route);page.goto(base+'/akun.html#lupa-password',wait_until='networkidle');page.wait_for_selector('#mmForgotPanel:visible')
  ok(f'{width} forgot panel',page.locator('#mmForgotPanel').is_visible());ok(f'{width} no overflow',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
  page.locator('#mmForgotEmail').fill('owner@example.com');page.locator('#mmForgotSend').click();page.wait_for_function("!document.getElementById('mmForgotOtp').disabled")
  page.locator('#mmForgotOtp').fill('123456');page.locator('#mmForgotNewPassword').fill('New-Password-2026!');page.locator('#mmForgotConfirmPassword').fill('New-Password-2026!');page.locator('#mmForgotComplete').click();page.wait_for_function("!document.getElementById('authForm').hidden")
  ok(f'{width} request payload',posts[0][1]=={'email':'owner@example.com'});ok(f'{width} completion payload',posts[1][1]['otpCode']=='123456' and posts[1][1]['newPassword']=='New-Password-2026!');ok(f'{width} success returns login','Password berhasil diganti' in page.locator('#notice').inner_text());ok(f'{width} no JS errors',not errors)
  page.screenshot(path=f'password-evidence/forgot-{width}.png',full_page=True);ctx.close()
 ctx=browser.new_context(viewport={'width':390,'height':960},service_workers='block');page=ctx.new_page();errors=[];posts=[];logged={'value':True}
 page.on('pageerror',lambda e:errors.append(str(e)))
 def signed_route(route):
  req=route.request;path=urlparse(req.url).path
  if path=='/akun.html':return route.fulfill(status=200,body=html,content_type='text/html')
  if path.startswith('/assets/'):return route.fulfill(status=200,body='',content_type='text/javascript' if path.endswith('.js') else 'text/css')
  if path=='/api/community/status':return route.fulfill(json={'registrationEnabled':True,'user':({'id':'u1','username':'owner'} if logged['value'] else None),'categories':[],'emailOtp':{'required':True,'available':True},'passwordRecovery':{'required':True,'available':True}})
  if path=='/api/auth/google/config':return route.fulfill(json={'enabled':True,'linked':False,'googleSignupEnabled':False})
  if path=='/api/community/password':posts.append(req.post_data_json);logged['value']=False;return route.fulfill(json={'ok':True,'loginAgain':True})
  if path.startswith('/api/'):return route.fulfill(status=404,json={'error':'mock'})
  return route.continue_()
 page.route('**/*',signed_route);page.goto(base+'/akun.html?pengaturan=1#keamanan',wait_until='networkidle');page.evaluate("document.getElementById('mm36Account').hidden=false;document.getElementById('mm80SecurityPane').hidden=false;document.getElementById('mm80SecuritySlot').append(document.getElementById('mm80AccessCard'))")
 page.wait_for_selector('#mmChangePasswordForm:visible');page.locator('#mmCurrentPassword').fill('Old-Password-2026!');page.locator('#mmNewPassword').fill('New-Password-2026!');page.locator('#mmConfirmPassword').fill('New-Password-2026!');page.locator('#mmChangePasswordButton').click();page.wait_for_function("document.getElementById('notice').textContent.includes('Password berhasil diganti')")
 ok('change form payload',posts==[{'oldPassword':'Old-Password-2026!','newPassword':'New-Password-2026!'}]);ok('change logs user out',page.locator('#guest').is_visible());ok('change no JS errors',not errors);page.screenshot(path='password-evidence/change-password-390.png',full_page=True);ctx.close();browser.close()
Path('password-evidence/report.json').write_text(json.dumps({'passed':len(checks),'checks':checks},indent=2));print(json.dumps({'passed':len(checks)},indent=2))
