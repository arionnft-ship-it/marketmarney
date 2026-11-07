(()=>{'use strict';
 const main=document.getElementById('main'),panel=document.querySelector('.battle-panel');
 if(!main||!panel||document.getElementById('warxau-social-root'))return;
 const intro=main.querySelector('.intro'),old=panel.parentElement;
 const root=document.createElement('section');root.id='warxau-social-root';root.setAttribute('aria-label','WarXAU: arena 3D dan chat live');
 const shell=document.createElement('div');shell.className='mm85-shell';
 const room=document.createElement('button');room.type='button';room.hidden=true;room.tabIndex=-1;room.className='mm85-tab active';room.dataset.mm85Symbol='OANDA:XAUUSD';room.textContent='XAU/USD';
 const chart=document.createElement('div');chart.className='mm85-chart';
 main.prepend(root);if(intro)root.append(intro);root.append(shell);shell.append(room,chart);chart.append(panel);
 if(old.classList.contains('battle-layout')){old.classList.remove('battle-layout');old.classList.add('warxau-support');}
 // Shared chat-room key is not a price-feed selection.
 const summary=document.createElement('p');summary.className='wx-chat-context';summary.textContent='RUANG XAU/USD · Chat bersama komunitas Market Live · Login Social Marney untuk mengirim pesan';root.append(summary);
 const jumps=document.querySelectorAll('a[href="#stage"]');for(const a of jumps)a.setAttribute('href','#warxau-social-root');
 let lastHeight=0;const sync=()=>{const height=Math.ceil(panel.getBoundingClientRect().height);if(height>0&&height!==lastHeight){lastHeight=height;root.style.setProperty('--wx-chat-height',height+'px');}};
 if(typeof ResizeObserver==='function'){const observer=new ResizeObserver(sync);observer.observe(panel);window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});}
 window.addEventListener('resize',sync,{passive:true});sync();
 window.addEventListener('focus',()=>{const ctx=root.querySelector('.mm1831-chat')?.__marketContext;if(ctx){ctx.seenTotal=null;}});
 document.documentElement.dataset.warxauLayout='arena-chat-7.8';
})();
