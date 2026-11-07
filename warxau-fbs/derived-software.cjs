'use strict';
// Browser-only renderer optimization for the four derived public War pages.
// Reuse the audited Gold arena's software visibility culling, frame memoization,
// smaller mesh details and lazily built fast shader. Do not modify data feeds,
// account/session handlers, chat routes, WebGL HD quality or battle computations.
const {installSoftwarePerformance}=require('./performance-warxau.cjs');
const VERSION='derived-software-20261108-v1';
function once(source,before,after){
 if(source.split(before).length!==2)throw Error('Derived War renderer source anchor changed: '+before.slice(0,90));
 return source.replace(before,after);
}
function tuneDerivedSoftware(html,market){
 if(!['btc','oil','nasdaq','ihsg'].includes(market))throw Error('Unsupported public War page');
 if(typeof html!=='string'||!/<html[\s>]/i.test(html)||!html.includes('class PremiumRenderer extends Base')||!html.includes('renderSoftware(){'))
  throw Error('Unexpected derived War HTML');
 if(html.includes('data-mm-derived-software="'+VERSION+'"'))return html;
 let text=html;
 text=once(text,'if(this.gl)this.programFast=this.makeProgram(true);','this.programFast=null;');
 text=once(text,'const p=(this.fastTier()?this.programFast:this.program)||this.program;',
  'if(this.fastTier()&&!this.programFast)this.programFast=this.makeProgram(true);const p=(this.fastTier()?this.programFast:this.program)||this.program;');
 text=once(text,'const ratio=Math.min(root.devicePixelRatio||1,1.5,1280/r.width,720/r.height);',
  'const ratio=this.soft?Math.min(root.devicePixelRatio||1,.8,900/r.width,500/r.height):Math.min(root.devicePixelRatio||1,1.5,1280/r.width,720/r.height);');
 text=once(text,"this.lowLOD=this.quality==='eco'||u.rank>0",
  "this.lowLOD=this.soft||this.quality==='eco'||u.rank>0");
 text=once(text,' renderSoftware(){',
  ' renderSoftware(){\n  const softwareFrame=root.MMSoftwarePerformance.begin(this);if(softwareFrame.reuse)return;');
 text=once(text,'for(const group of Object.values(this.groups)){',
  'for(const [groupName,group] of Object.entries(this.groups)){');
 text=once(text,'const verts=group.geometry.vertices,ids=group.geometry.indices;','');
 text=once(text,'const off=instance*20,m=group.data.subarray(off,off+16),col=group.data.subarray(off+16,off+20);',
  'const off=instance*20,m=group.data.subarray(off,off+16),col=group.data.subarray(off+16,off+20);if(root.MMSoftwarePerformance.outside(group.geometry,m,softwareFrame.planes))continue;const geometry=root.MMSoftwarePerformance.detail(group.geometry,m,vp,w,h,groupName),verts=geometry.vertices,ids=geometry.indices;');
 text=once(text,'this.drawCalls=polys.length;',
  'this.drawCalls=polys.length;root.MMSoftwarePerformance.remember(this);');
 const src='('+installSoftwarePerformance.toString()+')(window);';
 if(/<\/script/i.test(src))throw Error('Unexpected software helper script');
 text=once(text,'</head>',
  '<script data-mm-derived-software="'+VERSION+'" data-market="'+market+'">'+src+'</script>\n</head>');
 return text;
}
module.exports={tuneDerivedSoftware,VERSION};
