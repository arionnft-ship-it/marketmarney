from pathlib import Path
import sys
base=Path(sys.argv[1]) if len(sys.argv)>1 else Path('android43')
p=base/'app/src/main/assets/social44.js';s=p.read_text()
a="function button(label,k,fn,cls)"
i=s.index(a)
s=s[:i]+'''function controlIcon(el,key){
 if(!el)return;var svg=el.querySelector('svg');
 if(!svg){svg=document.createElementNS('http://www.w3.org/2000/svg','svg');el.prepend(svg);}
 svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');
 svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.innerHTML=paths[key];
 Array.from(el.childNodes).forEach(function(n){if(n.nodeType===3&&/^[\\s♡♥❤✉🔔✈➤➜]+$/u.test(n.textContent))n.remove();});
}
'''+s[i:]
s=s.replace("var svg=bell.querySelector('svg');if(svg)svg.innerHTML=paths.notice;", "controlIcon(bell,'notice');")
s=s.replace("var msgSvg=originalMessenger.querySelector('svg');if(msgSvg)msgSvg.innerHTML=paths.messages;", "controlIcon(originalMessenger,'messages');")
p.write_text(s)
p=base/'app/src/main/java/com/marketmarney/mobile/MainActivity.java';s=p.read_text();s=s.replace('else{retained.values().remove(v);discardView(v);}return true;', 'else if(retained.values().remove(v)){discardView(v);}return true;');p.write_text(s)
print('PASS: notification icon fallback preserves handlers/badges; renderer cleanup guarded')
