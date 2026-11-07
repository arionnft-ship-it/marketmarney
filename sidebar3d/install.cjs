'use strict';
const fs=require('node:fs'),vm=require('node:vm');
function patch(source){if(source.includes("const sidebar3d=require('./sidebar3d/index.cjs');"))return source;
 function once(s,a,b){if(s.split(a).length!==2)throw Error('Sidebar integration anchor changed: '+a);return s.replace(a,b);}
 let out=once(source,"'use strict';","'use strict';\nconst sidebar3d=require('./sidebar3d/index.cjs');");
 out=once(out,'function enhance(html){','function enhance(html){\n html=sidebar3d.enhance(html);');
 out=once(out,'function handle(req,res){','function handle(req,res){\n  if(sidebar3d.handle(req,res))return true;');
 new vm.Script(out);return out;
}
if(require.main===module){const file=process.argv[2];if(!file)throw Error('Expected build-local branding file');fs.writeFileSync(file,patch(fs.readFileSync(file,'utf8')));}
module.exports={patch};
