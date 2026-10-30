import { readdir,readFile,access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { MATERIAL_LIST } from '../shared/legacy/catalog.mjs';
import { CROWN_LIST } from '../shared/legacy/crowns.mjs';
import { TEETH } from '../shared/legacy/teeth.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
async function files(dir){const result=[];for(const item of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())result.push(...await files(p));else result.push(p);}return result;}
for(const dir of ['public','shared','server','scripts','tests'])for(const file of await files(path.join(root,dir))){if(file.endsWith('.mjs')){const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);}}
for(const image of new Set([...MATERIAL_LIST,...CROWN_LIST,...TEETH].flatMap(m=>[m.image,m.selectedImage].filter(Boolean))))await access(path.join(root,'public',image));
const front=(await files(path.join(root,'public'))).filter(f=>/\.(mjs|html|css)$/.test(f));for(const f of front){const text=await readFile(f,'utf8');if(/RESEND_API_KEY|WECOM_WEBHOOK_URL|CLOUDFLARE_API_TOKEN/.test(text))throw Error('前端包含服务端配置名: '+f);}
console.log('JavaScript syntax, asset paths, and public-source boundaries passed.');
