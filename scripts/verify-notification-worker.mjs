// Compile and boot the real local Worker runtime. Never submit a questionnaire.
import { spawn,spawnSync } from 'node:child_process';
import { access,mkdir,writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../',import.meta.url));
const cli=path.join(root,'node_modules/wrangler/bin/wrangler.js');
await access(cli);
const environment={...process.env,WRANGLER_SEND_METRICS:'false'};
const compiled=spawnSync(process.execPath,[cli,'deploy','--dry-run','--outdir','.wrangler/notification-dry-run'],{cwd:root,env:environment,encoding:'utf8',maxBuffer:2000000,windowsHide:true});
if(compiled.status!==0){
 // Do not echo Wrangler's environment table or private local configuration.
 console.error('Worker dry-run failed. No deployment or notification was attempted.');
 const errors=(compiled.stderr||compiled.stdout||'').split(/\r?\n/).filter(line=>/ERROR|Error:|error:/.test(line)&&!/SCT|secret|token|KEY|EMAIL_TO|IP_HASH_SALT/i.test(line));
 for(const line of errors.slice(0,4))console.error(line);
 process.exit(1);
}
console.log('Worker dry-run bundling passed; no deployment.');
const port=await new Promise((resolve,reject)=>{const server=createServer();server.on('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});
const worker=spawn(process.execPath,[cli,'dev','--local','--ip','127.0.0.1','--port',String(port)],{cwd:root,env:environment,stdio:['ignore','pipe','pipe'],windowsHide:true});
// Consume logs without echoing private values. Only bounded diagnostics stay in memory.
let output='';worker.stdout.on('data',b=>{output=(output+b).slice(-20000);});worker.stderr.on('data',b=>{output=(output+b).slice(-20000);});
try{
 let health;const deadline=Date.now()+45000;
 while(Date.now()<deadline){
  if(worker.exitCode!==null)throw Error('Local Worker exited before readiness.');
  try{const response=await fetch('http://127.0.0.1:'+port+'/api/health',{signal:AbortSignal.timeout(1000)});const body=await response.json();if(body.service==='dental-guide-notify'){health={status:response.status,ready:body.ready};break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,250));
 }
 if(!health)throw Error('Local Worker did not become ready within 45 seconds.');
 const result={checkedAt:new Date().toISOString(),bundled:true,nativeRuntimeStarted:true,healthStatus:health.status,configurationReady:health.ready,questionnaireSubmitted:false,providerCalled:false,publiclyDeployed:false};
 await mkdir(path.join(root,'qa'),{recursive:true});await writeFile(path.join(root,'qa/notification-native-check.json'),JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify(result,null,2));
}finally{
 if(worker.pid&&worker.exitCode===null){
  if(process.platform==='win32')spawnSync('taskkill.exe',['/PID',String(worker.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
  else worker.kill('SIGTERM');
 }
}
