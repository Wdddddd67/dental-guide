import { mkdir,cp,writeFile,readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
export const root=fileURLToPath(new URL('../',import.meta.url));
export async function build(options={}){
 const apiBaseUrl=options.apiBaseUrl??process.env.PUBLIC_API_BASE_URL??'';
 const privacyContact=options.privacyContact??process.env.PUBLIC_PRIVACY_CONTACT??'';
 const notificationLabel=options.notificationLabel??process.env.PUBLIC_NOTIFICATION_LABEL??'项目负责人';
 if(apiBaseUrl){const url=new URL(apiBaseUrl);if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw Error('API 地址必须为 HTTPS');if(url.search||url.hash||url.username||url.password)throw Error('API 地址不能包含密钥、查询或认证信息');if(url.pathname!=='/')throw Error('API 地址请填写服务根地址，不带路径');}
 await mkdir(path.join(root,'dist'),{recursive:true});await cp(path.join(root,'public'),path.join(root,'dist'),{recursive:true});await cp(path.join(root,'shared'),path.join(root,'dist/shared'),{recursive:true});
 await writeFile(path.join(root,'dist/config.mjs'),'export default Object.freeze('+JSON.stringify({apiBaseUrl,privacyContact,notificationLabel,privacyVersion:'2026-10-29'})+');\n');
 const connect=apiBaseUrl?' '+new URL(apiBaseUrl).origin:'';
 const csp="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'"+connect+"; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'";
 let html=await readFile(path.join(root,'dist/index.html'),'utf8');html=html.replace('<!-- CSP_INSERT -->','<meta http-equiv="Content-Security-Policy" content="'+csp+'">');await writeFile(path.join(root,'dist/index.html'),html);await writeFile(path.join(root,'dist/.nojekyll'),'');
 console.log('Built dist/ · notification '+(apiBaseUrl&&privacyContact?'configured':'not configured (no fake submissions)'));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await build();
