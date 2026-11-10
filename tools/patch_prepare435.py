#!/usr/bin/env python3
from pathlib import Path

path=Path('mobile435/prepare435.py')
text=path.read_text(encoding='utf-8')
anchor="""    if updated != text:
        test_file.write_text(updated, encoding='utf-8')
        version_tests.append(test_file.relative_to(root).as_posix())

# Connectivity-aware recovery: retry only read-only network failures after Android
"""
insert="""    if updated != text:
        test_file.write_text(updated, encoding='utf-8')
        version_tests.append(test_file.relative_to(root).as_posix())

# The fixture can report DOM readiness a fraction before Android's queued
# onPageFinished adaptation finishes. Settle that legitimate current-document
# adaptation first, then test that obsolete path/query callbacks cannot restyle it.
adapt_test_rel='app/src/androidTest/java/com/marketmarney/mobile/AdaptGuardTest.java'
adapt_test=read(adapt_test_rel)
adapt_old='''  assertTrue(\"Fixture document marker, URL and readiness committed\",fixture[0].awaitReady(inst,()->(WebView)field(\"web\")));
  assertEquals(\"true\",js(\"window.guardErrors=[];window.addEventListener('error',e=>guardErrors.push(e.message));document.querySelectorAll('#mm43-common,#mm43-social-style').forEach(n=>n.remove());true\"));'''
adapt_new='''  assertTrue(\"Fixture document marker, URL and readiness committed\",fixture[0].awaitReady(inst,()->(WebView)field(\"web\")));
  for(int settle=0;settle<50;settle++){
   boolean nativeReady=url.equals(String.valueOf(field(\"lastAdaptedDocument\")));
   boolean scriptReady=\"true\".equals(js(\"!!document.getElementById('mm43-social-style')||!!window.__mm411BundledReady\"));
   if(nativeReady&&scriptReady)break;
   SystemClock.sleep(100);
  }
  SystemClock.sleep(200);
  assertEquals(\"Current fixture adaptation settled\",url,String.valueOf(field(\"lastAdaptedDocument\")));
  assertEquals(\"true\",js(\"window.guardErrors=[];window.addEventListener('error',e=>guardErrors.push(e.message));document.querySelectorAll('#mm43-common,#mm43-social-style').forEach(n=>n.remove());true\"));'''
assert adapt_test.count(adapt_old)==1,'AdaptGuardTest setup changed unexpectedly'
write(adapt_test_rel,adapt_test.replace(adapt_old,adapt_new,1))
if adapt_test_rel not in version_tests:version_tests.append(adapt_test_rel)

# Connectivity-aware recovery: retry only read-only network failures after Android
"""
if anchor not in text:
    if 'Current fixture adaptation settled' in text:
        print('prepare435.py already patched')
        raise SystemExit(0)
    raise SystemExit('prepare435.py anchor not found')
path.write_text(text.replace(anchor,insert,1),encoding='utf-8')
print('Patched prepare435.py with deterministic current-document adaptation settling.')
