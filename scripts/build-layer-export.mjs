import { build } from 'esbuild';
import fs from 'node:fs/promises';
await build({entryPoints:['src/layer-export-worker.js'],bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'eof',outfile:'public/vendor/layer-export-worker.js'});
const notices=[];
for(const name of ['ag-psd','base64-js','pako']){
  const pkg=JSON.parse(await fs.readFile('node_modules/'+name+'/package.json','utf8'));
  notices.push(name+' '+pkg.version+'\n'+await fs.readFile('node_modules/'+name+'/LICENSE','utf8'));
}
await fs.writeFile('public/vendor/layer-export-LICENSES.txt',notices.join('\n\n--------------------\n\n'));
