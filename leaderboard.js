(() => {
 const config=window.LEADERBOARD_CONFIG || {};
 const configured=!!config.url && !!config.publishableKey;
 const AUTH_KEY='economics-replication-leaderboard-auth-v1';
 let session=null, storageAvailable=true;
 try {session=JSON.parse(localStorage.getItem(AUTH_KEY));} catch {}
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=n=>Number(n).toFixed(2);
 const remember=s=>{session={access_token:s.access_token,refresh_token:s.refresh_token,expires_at:Date.now()+s.expires_in*1000};try{localStorage.setItem(AUTH_KEY,JSON.stringify(session));}catch{storageAvailable=false;}};
 async function request(path,body,token){
  const response=await fetch(config.url.replace(/\/$/,'')+path,{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
  const data=await response.json();
  if(!response.ok)throw new Error(data.msg || data.message || data.error_description || 'Leaderboard request failed. Please try again.');
  return data;
 }
 async function identity(){
  if(session?.access_token && session.expires_at>Date.now()+60000)return session.access_token;
  if(session?.refresh_token){
   // Keep the same identity after expiry. Never silently create another identity on a refresh failure.
   remember(await request('/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token}));
  } else remember(await request('/auth/v1/signup',{}));
  if(!session.access_token)throw new Error('Anonymous sign-in is unavailable. Please try again later.');
  return session.access_token;
 }
 function panel(finished,name=''){return `<section class="card leaderboard-card"><div class="rowtop"><h2>Public leaderboard</h2>${configured?'<button id="refresh-leaderboard" class="secondary">Refresh</button>':''}</div><p class="muted">Ranked by total points, then correct guesses. One first submitted score per browser identity. Replays are for practice; a different browser can create another identity.</p>${finished&&configured?`<form id="publish-score"><label for="public-alias">Your leaderboard name</label><input id="public-alias" name="alias" maxlength="30" required autocomplete="nickname" placeholder="Enter your name or nickname" value="${esc(name||'')}"><p class="muted">Submitting makes your name, score, correct count, and completion date public. You can use a nickname. Your individual answers are not displayed.</p><div class="actions"><button>Submit my score</button></div></form><p id="submission-status" role="status" aria-live="polite"></p>`:''}<div id="leaderboard-results" aria-live="polite">${configured?'<p>Loading scores…</p>':'<p>The public leaderboard is being set up. You can still play and keep your results on this device.</p>'}</div></section>`;}
 async function mount(answers,onName=()=>{}){
  if(!configured)return;
  const container=document.querySelector('#leaderboard-results');if(!container)return;
  let requestNumber=0;
  const load=async()=>{const current=++requestNumber;try{const data=await request('/rest/v1/rpc/get_quiz_leaderboard',{});if(!container.isConnected||current!==requestNumber)return;
   if(!Array.isArray(data.entries))throw new Error('Could not read leaderboard scores.');
   container.innerHTML=`<p>${Number(data.total)} completed ${Number(data.total)===1?'entry':'entries'} · Top 100 shown</p>${data.entries.length?`<div class="table-wrap"><table><thead><tr><th>Rank</th><th>Name</th><th>Points</th><th>Correct</th></tr></thead><tbody>${data.entries.map(e=>`<tr><td>${Number(e.rank)}</td><td>${esc(e.alias)}</td><td>${fmt(e.points)}</td><td>${Number(e.correct)} / 18</td></tr>`).join('')}</tbody></table></div>`:'<p>No scores yet. Complete the game to submit the first one.</p>'}`;
  }catch(e){if(container.isConnected&&current===requestNumber)container.textContent='Scores are unavailable right now. '+e.message;}};
  document.querySelector('#refresh-leaderboard').onclick=load;
  const form=document.querySelector('#publish-score');
  if(form)form.onsubmit=async e=>{e.preventDefault();const status=document.querySelector('#submission-status'),button=form.querySelector('button');button.disabled=true;status.textContent='Submitting your score…';
   try{if(answers.length!==18)throw new Error('Complete all 18 questions first.');const alias=new FormData(form).get('alias').trim();if(!alias||alias.length>30)throw new Error('Use a name or nickname of 1 to 30 characters.');onName(alias);
    const token=await identity();const result=await request('/rest/v1/rpc/submit_quiz',{p_alias:alias,p_answers:answers.map(a=>({id:a.id,choice:a.choice,confidence:a.confidence}))},token);
    status.textContent=`${result.already_saved?'Your first submitted score is already on the leaderboard':'Score submitted'}: ${result.alias}, ${fmt(result.points)} points, ${result.correct}/18 correct. Current rank: ${result.rank}.${storageAvailable?'':' This browser cannot retain your identity after closing the page.'}`;
    await load();
   }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
  };
  await load();
 }
 window.PublicLeaderboard={panel,mount};
})();
