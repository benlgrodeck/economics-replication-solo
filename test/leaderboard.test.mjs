import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../leaderboard.js',import.meta.url),'utf8');
function browser({configured=true,saved,handler}={}){
 const calls=[],storage=new Map(saved?[['economics-replication-leaderboard-auth-v1',JSON.stringify(saved)]]:[]);
 const results={isConnected:true,innerHTML:'',textContent:''},status={textContent:''},button={disabled:false},form={alias:'Player',querySelector:()=>button};
 const nodes={'#leaderboard-results':results,'#refresh-leaderboard':{},'#publish-score':form,'#submission-status':status};
 const context={window:{LEADERBOARD_CONFIG:configured?{url:'https://example.supabase.co',publishableKey:'sb_publishable_test'}:{}},document:{querySelector:s=>nodes[s]},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},FormData:class{constructor(f){this.f=f;}get(){return this.f.alias;}},Date,console,
 fetch:async(url,opts)=>{calls.push({url,...opts});const result=handler?await handler(url,opts):{total:0,entries:[]};return {ok:true,json:async()=>result};}};
 vm.runInNewContext(source,context);
 return {...nodes,api:context.window.PublicLeaderboard,calls,storage};
}
test('Unconfigured leaderboard keeps solo play available without network calls',async()=>{const b=browser({configured:false});assert.match(b.api.panel(true),/being set up/);await b.api.mount([]);assert.equal(b.calls.length,0);});
test('Reading public scores needs no anonymous account and escapes aliases',async()=>{const b=browser({handler:()=>({total:1,entries:[{rank:1,alias:'<img src=x onerror=alert(1)>',points:1350,correct:11}]})});await b.api.mount([]);assert.equal(b.calls.length,1);assert.ok(!b.calls[0].headers.Authorization);assert.match(b['#leaderboard-results'].innerHTML,/&lt;img/);assert.ok(!b['#leaderboard-results'].innerHTML.includes('<img'));});
test('Submit sends only forecasts and an alias, not client-calculated points',async()=>{const b=browser({handler:url=>url.includes('/signup')?{access_token:'token',refresh_token:'refresh',expires_in:3600}:url.includes('submit_quiz')?{alias:'Player',points:1350,correct:11,rank:1,already_saved:false}:{total:0,entries:[]}});const a=Array.from({length:18},(_,i)=>({id:String(i),choice:true,confidence:50,points:99999}));await b.api.mount(a);await b['#publish-score'].onsubmit({preventDefault(){}});const submission=b.calls.find(c=>c.url.includes('submit_quiz'));assert.equal(submission.headers.Authorization,'Bearer token');const body=JSON.parse(submission.body);assert.deepEqual(Object.keys(body).sort(),['p_alias','p_answers']);assert.deepEqual(Object.keys(body.p_answers[0]).sort(),['choice','confidence','id']);assert.match(b['#submission-status'].textContent,/1350.00 points/);assert.equal(b['#publish-score'].querySelector().disabled,false);});
test('Incomplete games cannot create an identity or submit scores',async()=>{const b=browser();await b.api.mount([]);await b['#publish-score'].onsubmit({preventDefault(){}});assert.equal(b.calls.length,1);assert.match(b['#submission-status'].textContent,/Complete all 18/);});
test('Expired session refresh failure never creates another identity',async()=>{const b=browser({saved:{access_token:'expired',refresh_token:'same-user',expires_at:0},handler:url=>{if(url.includes('/token'))throw new Error('Offline');return {total:0,entries:[]};}});await b.api.mount(Array(18).fill({id:'a',choice:true,confidence:50}));await b['#publish-score'].onsubmit({preventDefault(){}});assert.equal(b.calls.filter(c=>c.url.includes('/signup')).length,0);assert.match(b['#submission-status'].textContent,/Offline/);});
