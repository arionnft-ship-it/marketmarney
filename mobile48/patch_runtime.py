"""Patch the reviewed group runtime only; backend authorization is still authoritative."""
from pathlib import Path

def patch_runtime(j):
 def once(a,b):
  nonlocal j
  if j.count(a)!=1:raise RuntimeError('Group runtime changed: '+a[:100]+' count='+str(j.count(a)))
  j=j.replace(a,b,1)
 start=j.index('    // Fresh membership is authoritative;')
 end=j.index('    if(token!==state.selectSeq||state.active!==id)return;\n    const previousRole',start)
 j=j[:start]+'''    let group,items=[];
    try {
      const d=await api('/group-messages?id='+encodeURIComponent(id));
      if(token!==state.selectSeq||state.active!==id)return;
      group=d.group;items=d.items||[];
      if(!group||group.id!==id||!group.joined)throw Object.assign(Error('Akses grup tidak dapat diverifikasi.'),{status:403});
    }catch(e){
      if(e.status!==403)throw e;
      clearAccess();
      const fresh=await api('/groups/detail?id='+encodeURIComponent(id));
      if(token!==state.selectSeq||state.active!==id)return;
      group=fresh.group;
      // Detail alone cannot authorize access after messages were denied.
      if(group?.joined)throw Object.assign(Error('Izin grup berubah. Buka ulang grup untuk memeriksa akses.'),{status:403});
    }
'''+j[end:]
 once("  if(!id)return;const token=++state.selectSeq,changed=state.active!==id;", "  if(!id||state.mm48Opening===id)return;state.mm48Opening=id;const token=++state.selectSeq,changed=state.active!==id;")
 once("    say(e.message)}\n}\nasync function groupAction", "    say(e.message)}finally{if(token===state.selectSeq)state.mm48Opening=null;}\n}\nasync function groupAction")
 once("state.me=s.user;$('gmApp').hidden=false;await refreshList();const id=new URLSearchParams(location.search).get('group');\n  if(id&&/^[0-9a-f-]{36}$/.test(id))await selectGroup(id);else if(state.mine.length)await selectGroup(state.mine[0].id);", """state.me=s.user;$('gmApp').hidden=false;const id=new URLSearchParams(location.search).get('group');
  if(id&&/^[0-9a-f-]{36}$/.test(id)){
    // Sidebar and protected room can load together; lists never authorize access.
    void refreshList().catch(e=>say(e.message));
    await selectGroup(id);
  }else{await refreshList();if(state.mine.length)await selectGroup(state.mine[0].id);}""")
 once("state.mine=r.mine||[];state.discover=r.discover||[];renderList()}", "state.mine=r.mine||[];state.discover=r.discover||[];if(state.group&&state.active===state.group.id){const g=state.group;state.mine=g.joined?(state.mine.some(x=>x.id===g.id)?state.mine.map(x=>x.id===g.id?g:x):[g,...state.mine]):state.mine.filter(x=>x.id!==g.id);state.discover=state.discover.map(x=>x.id===g.id?g:x);}renderList()}")
 once("if(host.dataset.signature===signature)return;host.dataset.signature=signature;host.replaceChildren();", "if(host.dataset.signature===signature)return;host.dataset.signature=signature;const prior=new Map(Array.from(host.children).filter(n=>n.dataset.messageId).map(n=>[n.dataset.messageId,n]));const fragment=document.createDocumentFragment();")
 once("if(!state.group?.joined){host.append(","if(!state.group?.joined){host.replaceChildren();host.append(")
 once("if(!visible.length){host.append(make('p','gm-muted',term?", "if(!visible.length){host.replaceChildren();host.append(make('p','gm-muted',term?")
 once("for(const m of visible){const msg=make('article','gm-msg'+(m.mine?' mine':''));msg.dataset.messageId=m.id;", """for(const m of visible){const key=JSON.stringify([state.active,state.group?.role,!!state.group?.canModerate,m]);const old=prior.get(m.id);
    if(old&&old.dataset.mm48Key===key){fragment.append(old);continue;}
    const msg=make('article','gm-msg'+(m.mine?' mine':''));msg.dataset.messageId=m.id;msg.dataset.mm48Key=key;""")
 once("msg.append(bubble);host.append(msg)}\n  host.scrollTop", "msg.append(bubble);fragment.append(msg)}\n  host.replaceChildren(fragment);\n  host.scrollTop")
 once("function renderList(){const host=$('gmList');host.replaceChildren();", "function renderList(){const host=$('gmList'),signature=JSON.stringify([state.active,state.view,state.mine,state.discover,$('gmQuery').value]);if(host.dataset.mm48Signature===signature)return;host.dataset.mm48Signature=signature;host.replaceChildren();")
 once("renderGroupInfo();void loadMembers()}", "renderGroupInfo()}")
 once("async function poll(){if(document.hidden||navigator.onLine===false", "async function poll(){if(window.__mm45Suspended||document.hidden||navigator.onLine===false")
 once("  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void poll()});", "  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void poll()});\n  window.addEventListener('mm45:resume',()=>{void poll()});")
 once("function invalidateSession(){state.photoSeq++", "function invalidateSession(){state.mm48Opening=null;state.photoSeq++")
 return j

if __name__=='__main__':
 import sys
 p=Path(sys.argv[1]);p.write_text(patch_runtime(p.read_text()))
