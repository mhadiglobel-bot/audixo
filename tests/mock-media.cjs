const ts=require('typescript'),fs=require('fs'),path=require('path'),os=require('os'),assert=require('assert');
const base=path.resolve(__dirname,'..'),dest=fs.mkdtempSync(path.join(os.tmpdir(),'audixo-native-test-'));fs.mkdirSync(dest,{recursive:true});
for(const name of ['lib/cookies.ts','lib/youtube.ts','api/media.ts','api/bhai-cookie-dalde.ts']){
 const file=path.join(base,name),s=fs.readFileSync(file,'utf8'),out=ts.transpileModule(s,{fileName:name,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}});
 const target=path.join(dest,name.replace(/\.ts$/,'.js'));fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,out.outputText);
 if(out.diagnostics?.length)console.log('DIAGNOSTIC',name,out.diagnostics.length)
}
fs.mkdirSync(dest+'/node_modules/@vercel/blob',{recursive:true});fs.writeFileSync(dest+'/node_modules/@vercel/blob/index.js',`let t=null;module.exports={put:async(k,text,opt)=>{t=String(text);return{pathname:k}},get:async()=>t?{statusCode:200,stream:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(t));c.close()}})}:null}`);
fs.mkdirSync(dest+'/bin',{recursive:true});fs.writeFileSync(dest+'/bin/yt-dlp',`#!/usr/bin/env node
const f=process.argv.includes('--format');const q=process.argv.join(' ');const v='https://r1.googlevideo.com/videoplayback?ratebypass=yes';const a='https://r2.googlevideo.com/videoplayback?ratebypass=yes';const http_headers={'User-Agent':'AUDIXO-Test/1.0','Referer':'https://www.youtube.com/','Origin':'https://www.youtube.com','Accept':'*/*','Accept-Language':'en-US,en;q=0.9','Authorization':'secret-must-never-be-forwarded'};let data={title:'Example Video',duration:25,thumbnail:'https://i.ytimg.com/foo.jpg',uploader:'Example',formats:[{format_id:'140',vcodec:'none',acodec:'mp4a.40.2',url:a,http_headers},{format_id:'137',height:1080,vcodec:'avc1',acodec:'none',url:v,http_headers},{format_id:'22',height:720,vcodec:'avc1',acodec:'aac',url:v,http_headers}]};if(f){if(q.includes('bestaudio'))Object.assign(data,{format_id:'140',vcodec:'none',acodec:'mp4a.40.2',url:a,http_headers});else data.requested_formats=[{format_id:'137',height:1080,vcodec:'avc1',acodec:'none',url:v,http_headers},{format_id:'140',vcodec:'none',acodec:'mp4a.40.2',url:a,http_headers}]}console.log(JSON.stringify(data));`);fs.chmodSync(dest+'/bin/yt-dlp',0o755);
fs.writeFileSync(dest+'/bin/ffmpeg',`#!/usr/bin/env node
require('fs').writeFileSync('ffmpeg-args.json',JSON.stringify(process.argv.slice(2)));process.stdout.write(Buffer.from(process.argv.includes('mp3')?'FAKE_MP3':'FAKE_MP4'));`);fs.chmodSync(dest+'/bin/ffmpeg',0o755);
process.chdir(dest);process.env.AUDIXO_COOKIE_PASSWORD='example-test-password-12345';process.env.BLOB_READ_WRITE_TOKEN='fakeforunit';
const youtube=require(dest+'/lib/youtube.js');const handler=require(dest+'/api/media.js').default, admin=require(dest+'/api/bhai-cookie-dalde.js').default;
function resFactory(){const o={statusCode:200,headers:{},text:null,done:null,buf:[],handlers:{}};o.setHeader=(k,v)=>o.headers[k]=v;o.status=n=>(o.statusCode=n,o);o.json=v=>(o.text=v,o.done&&o.done(),o);o.type=v=>(o.headers['Content-Type']=v,o);o.send=v=>(o.text=v,o.done&&o.done(),o);o.write=v=>(o.buf.push(v),true);o.end=()=>{o.done&&o.done()};o.on=(k,cb)=>{o.handlers[k]=cb};o.destroy=err=>{o.error=err;o.done&&o.done()};return o}
const req=(method,action,body={},more={})=>({method,query:{action},body,headers:{...more}})
async function call(h,r){const response=resFactory();await h(r,response);return response}
(async()=>{
 assert.equal(youtube.parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ'),'https://www.youtube.com/watch?v=dQw4w9WgXcQ');assert.throws(()=>youtube.parseVideoUrl('https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ'));
 for(const [url,expected] of [['https://www.instagram.com/reel/ABC1234567/','Instagram'],['https://www.youtube.com/shorts/dQw4w9WgXcQ','YouTube']]){assert.equal(youtube.sourceName(youtube.parseVideoUrl(url)),expected)}
 for(const badUrl of ['http://www.instagram.com/reel/ABC123','https://localhost/admin','https://127.0.0.1/','https://instagram.com.evil.com/reel/ABC123','https://www.tiktok.com/@example/video/123456789012345678','https://www.youtube.com/channel/UCSample'])assert.throws(()=>youtube.parseVideoUrl(badUrl));
 const m=await call(handler,req('POST','meta',{url:'https://youtu.be/dQw4w9WgXcQ'}));assert.equal(m.statusCode,200);assert.equal(m.text.title,'Example Video');assert.equal(m.text.qualities.length,2);
 const social=await call(handler,req('POST','meta',{url:'https://www.instagram.com/reel/ABC1234567/'}));assert.equal(social.statusCode,200);assert.equal(social.text.platform,'Instagram');
 const start=await call(handler,req('POST','start',{url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',format:'mp3',bitrate:320}));assert.equal(start.statusCode,200);const url=new URL('https://audixo.local'+start.text.url);const token=url.searchParams.get('token');assert.ok(token);
 const f=await call(handler,req('GET','file',{},{}));assert.equal(f.statusCode,403);
 const bad=await call(admin,req('POST','',{password:'bad',cookiesText:'# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t1999999999\tSID\ttest'}));assert.equal(bad.statusCode,403);
 const ok=await call(admin,req('POST','',{password:'example-test-password-12345',cookiesText:'# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t1999999999\tSID\ttest'}));assert.equal(ok.statusCode,200);assert.equal(ok.text.ok,true);
 const after=await call(handler,req('POST','meta',{url:'https://youtu.be/dQw4w9WgXcQ'}));assert.equal(after.statusCode,200);
 const f2=await call(handler,{method:'GET',query:{action:'file',token},headers:{}});assert.equal(f2.statusCode,200);assert.equal(Buffer.concat(f2.buf.map(Buffer.from)).toString(),'FAKE_MP3');
 const ffArgs=JSON.parse(fs.readFileSync(dest+'/ffmpeg-args.json','utf8')),headerIndex=ffArgs.indexOf('-headers');
 assert.ok(headerIndex>0,'FFmpeg must forward source CDN request headers');
 assert.match(ffArgs[headerIndex+1],/Origin: https:\/\/www\.youtube\.com\r\n/);
 assert.match(ffArgs[headerIndex+1],/Accept-Language: en-US,en;q=0\.9\r\n/);
 assert.ok(!ffArgs.join(' ').includes('secret-must-never-be-forwarded'),'Never forward source authorization to FFmpeg');
 const start4=await call(handler,req('POST','start',{url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',format:'mp4',quality:'1080'}));const tok4=new URL('https://audixo.local'+start4.text.url).searchParams.get('token');const f4=await call(handler,{method:'GET',query:{action:'file',token:tok4},headers:{}});assert.equal(f4.statusCode,200);assert.equal(Buffer.concat(f4.buf.map(Buffer.from)).toString(),'FAKE_MP4');
 const fallbackScript='#!/usr/bin/env node\nif(!process.argv.includes(\'--cookies\')){console.error(\'ERROR: Sign in to confirm you are not a bot\');process.exit(1)}\nconsole.log(JSON.stringify({title:\'Authorized Video\',duration:12,uploader:\'Example\',formats:[{format_id:\'22\',height:720,vcodec:\'avc1\',acodec:\'aac\',url:\'https://r1.googlevideo.com/videoplayback\'}]}))\n';
 fs.writeFileSync(dest+'/bin/yt-dlp',fallbackScript,{mode:0o755});
 const fallback=await call(handler,req('POST','meta',{url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ'}));assert.equal(fallback.statusCode,200);assert.equal(fallback.text.title,'Authorized Video');
 console.log('PASSED: public source and cookie fallback, URL guard, metadata, confirmed qualities, signed media tokens, private cookie save, mock MP3/MP4 stream');
})().catch(e=>{console.error(e);process.exitCode=1})
