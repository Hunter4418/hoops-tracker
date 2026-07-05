(function(){
'use strict';

const STORE_MATCHES='hoops_matches_v1';
const STORE_TOURNAMENTS='hoops_tournaments_v1';
const MATCH_TYPES=['1v1','2v1','2v2','3v2','3v3','4v4','5v5'];

let state={
  view:'home',
  mode:null,
  matchType:null,
  teams:null,
  score:[0,0],
  elapsed:0,
  timerInterval:null,
  running:false,
  plays:[],
  tournament:null,
  matches:[],
  tournaments:[],
  lastMatch:null
};

function loadMatches(){
  try{ return JSON.parse(localStorage.getItem(STORE_MATCHES)||'[]'); }catch(e){ return []; }
}
function saveMatches(){ localStorage.setItem(STORE_MATCHES, JSON.stringify(state.matches)); }
function loadTournaments(){
  try{ return JSON.parse(localStorage.getItem(STORE_TOURNAMENTS)||'[]'); }catch(e){ return []; }
}
function saveTournaments(){ localStorage.setItem(STORE_TOURNAMENTS, JSON.stringify(state.tournaments)); }

function fmtTime(s){
  const m=Math.floor(s/60), sec=s%60;
  return String(m).padStart(2,'0')+':'+String(sec).padStart(2,'0');
}
function fmtDate(iso){
  const d=new Date(iso);
  return d.toLocaleDateString(undefined,{month:'short',day:'numeric'});
}

function goHome(){ stopTimer(); state.view='home'; render(); }
function startSetup(mode){ state.mode=mode; state.view='typeSelect'; render(); }
function pickType(t){ state.matchType=t; state.view='nameEntry'; render(); }

function stopTimer(){
  if(state.timerInterval){ clearInterval(state.timerInterval); state.timerInterval=null; }
  state.running=false;
}

function beginGame(nameA, nameB){
  state.teams=[nameA && nameA.trim() ? nameA.trim() : 'Team A', nameB && nameB.trim() ? nameB.trim() : 'Team B'];
  state.score=[0,0];
  state.plays=[];
  state.elapsed=0;
  state.view='live';
  state.running=true;
  render();
  stopTimer();
  state.timerInterval=setInterval(()=>{
    state.elapsed++;
    const t=document.getElementById('timerDisplay');
    if(t) t.textContent=fmtTime(state.elapsed);
  },1000);
}

function togglePause(){
  if(state.running){
    stopTimer();
  } else {
    state.running=true;
    state.timerInterval=setInterval(()=>{
      state.elapsed++;
      const t=document.getElementById('timerDisplay');
      if(t) t.textContent=fmtTime(state.elapsed);
    },1000);
  }
  render();
}

function addPoint(teamIdx, pts, label){
  state.score[teamIdx]+=pts;
  state.plays.push({team:teamIdx, pts, label, t:state.elapsed});
  renderScoreOnly();
}

function undoLast(){
  const p=state.plays.pop();
  if(p){ state.score[p.team]-=p.pts; renderScoreOnly(); }
}

function renderScoreOnly(){
  const s0=document.getElementById('score0'); const s1=document.getElementById('score1');
  if(s0) s0.textContent=state.score[0];
  if(s1) s1.textContent=state.score[1];
  const pl=document.getElementById('playLog');
  if(pl){
    pl.innerHTML=state.plays.slice(-6).reverse().map(p=>
      `<div style="display:flex;justify-content:space-between;padding:6px 0;font-size:12px;color:var(--text-secondary);border-bottom:0.5px solid var(--border);">
        <span>${escapeHtml(state.teams[p.team])} &middot; ${p.label}</span><span>${fmtTime(p.t)}</span>
      </div>`).join('');
  }
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function endGame(){
  stopTimer();
  const winnerIdx = state.score[0]===state.score[1] ? null : (state.score[0]>state.score[1]?0:1);
  const match={
    id:Date.now(),
    type:state.matchType,
    mode:state.mode,
    teams:state.teams,
    score:state.score.slice(),
    duration:state.elapsed,
    plays:state.plays.slice(),
    winner: winnerIdx!==null ? state.teams[winnerIdx] : 'Tie',
    date:new Date().toISOString()
  };
  state.matches.unshift(match);
  saveMatches();

  if(state.mode==='tournament' && state.tournament){
    const tour=state.tournament;
    tour.results.push(match);
    const idx=state.tournaments.findIndex(t=>t.id===tour.id);
    if(idx>=0) state.tournaments[idx]=tour; else state.tournaments.unshift(tour);
    if(tour.results.length>=tour.matchups.filter(m=>m[1]!=='BYE').length){
      tour.status='complete';
    }
    saveTournaments();
    state.view='tournamentBoard';
  } else {
    state.lastMatch=match;
    state.view='summary';
  }
  render();
}

function setupTournament(){ state.view='tournamentSetup'; render(); }

function createTournament(playersRaw, type){
  const names=playersRaw.split(',').map(s=>s.trim()).filter(Boolean);
  if(names.length<2) return;
  const shuffled=[...names];
  const matchups=[];
  for(let i=0;i<shuffled.length-1;i+=2){
    matchups.push([shuffled[i], shuffled[i+1]]);
  }
  if(shuffled.length%2===1){ matchups.push([shuffled[shuffled.length-1], 'BYE']); }
  const tour={ id:Date.now(), type, players:names, matchups, results:[], status:'active' };
  state.tournament=tour;
  state.tournaments.unshift(tour);
  saveTournaments();
  state.view='tournamentBoard';
  render();
}

function playTournamentMatch(idx){
  const [a,b]=state.tournament.matchups[idx];
  state.matchType=state.tournament.type;
  state.mode='tournament';
  beginGame(a,b);
}

function resumeTournament(){
  const active=state.tournaments.find(t=>t.status==='active');
  if(active){ state.tournament=active; state.view='tournamentBoard'; render(); }
}

function deleteMatch(id){
  state.matches=state.matches.filter(m=>m.id!==id);
  saveMatches();
  render();
}

function clearAllHistory(){
  if(confirm('Clear all match history? This cannot be undone.')){
    state.matches=[];
    saveMatches();
    render();
  }
}

function render(){
  const app=document.getElementById('app');
  if(!app) return;
  let html='';

  if(state.view==='home'){
    const activeTour=state.tournaments.find(t=>t.status==='active');
    html=`
      <div style="padding:2.5rem 0 1.5rem;text-align:center;">
        <div style="font-size:26px;font-weight:600;margin-bottom:6px;letter-spacing:-0.02em;">Hoops Tracker</div>
        <div style="font-size:14px;color:var(--text-secondary);">Track scores, timers, and matchups</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:1rem;">
        <button id="freeBtn" style="height:58px;font-size:16px;font-weight:600;">Start free game</button>
        <button id="tourBtn" style="height:58px;font-size:16px;font-weight:600;">Start tournament</button>
        <button id="historyBtn" style="height:46px;font-size:15px;">Match history</button>
      </div>
      ${activeTour ? `<div style="margin-top:1rem;"><button id="resumeTour" style="width:100%;height:46px;border-color:var(--accent);color:var(--accent-text);">Resume tournament</button></div>` : ''}
    `;
  }

  else if(state.view==='typeSelect'){
    html=`
      <div style="padding:1.25rem 0;">
        ${backButton()}
        <div style="font-size:19px;font-weight:600;margin-bottom:1rem;">Pick match type</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${MATCH_TYPES.map(t=>`<button class="typeBtn" data-type="${t}" style="height:50px;font-size:15px;">${t}</button>`).join('')}
        </div>
      </div>
    `;
  }

  else if(state.view==='nameEntry'){
    html=`
      <div style="padding:1.25rem 0;">
        ${backButton()}
        <div style="font-size:19px;font-weight:600;margin-bottom:4px;">${state.matchType} match</div>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:1.25rem;">Enter team or player names</div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          <input id="teamA" placeholder="Team / player A" autocomplete="off"/>
          <input id="teamB" placeholder="Team / player B" autocomplete="off"/>
        </div>
        <button id="startGameBtn" style="width:100%;height:52px;margin-top:1.5rem;font-size:16px;font-weight:600;border-color:var(--accent);color:var(--accent-text);">Start game</button>
      </div>
    `;
  }

  else if(state.view==='live'){
    const shotTypes=[
      {label:'1pt', pts:1},
      {label:'2pt', pts:2},
      {label:'3pt', pts:3},
      {label:'HC 3pt', pts:3}
    ];
    html=`
      <div style="padding:1.25rem 0;">
        <div style="text-align:center;margin-bottom:0.75rem;">
          <div style="font-size:13px;color:var(--text-secondary);">${state.matchType} &middot; ${state.mode==='tournament'?'Tournament':'Free game'}</div>
          <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin:8px 0;">
            <div id="timerDisplay" style="font-size:36px;font-weight:600;font-variant-numeric:tabular-nums;">${fmtTime(state.elapsed)}</div>
            <button id="pauseBtn" style="height:34px;width:34px;padding:0;font-size:14px;">${state.running?'&#10073;&#10073;':'&#9654;'}</button>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:1.25rem;">
          <div class="card" style="padding:1rem;text-align:center;">
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(state.teams[0])}</div>
            <div id="score0" style="font-size:30px;font-weight:600;">${state.score[0]}</div>
          </div>
          <div class="card" style="padding:1rem;text-align:center;">
            <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(state.teams[1])}</div>
            <div id="score1" style="font-size:30px;font-weight:600;">${state.score[1]}</div>
          </div>
        </div>
        ${[0,1].map(ti=>`
          <div style="margin-bottom:14px;">
            <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px;">${escapeHtml(state.teams[ti])} scored</div>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;">
              ${shotTypes.map(s=>`<button class="shotBtn" data-team="${ti}" data-pts="${s.pts}" data-label="${s.label}" style="height:42px;font-size:14px;font-weight:500;">${s.label}</button>`).join('')}
            </div>
          </div>
        `).join('')}
        <div style="display:flex;justify-content:flex-end;margin-bottom:6px;">
          <button id="undoBtn" style="height:32px;font-size:12px;padding:0 12px;color:var(--text-secondary);">Undo last</button>
        </div>
        <div id="playLog" style="margin-bottom:1.25rem;min-height:20px;"></div>
        <button id="endGameBtn" style="width:100%;height:52px;font-size:16px;font-weight:600;border-color:var(--danger);color:var(--danger-text);">End game</button>
      </div>
    `;
  }

  else if(state.view==='summary'){
    const m=state.lastMatch;
    html=`
      <div style="padding:2rem 0;text-align:center;">
        <div style="font-size:19px;font-weight:600;margin:8px 0 4px;">${m.winner==='Tie'?'It\u2019s a tie':escapeHtml(m.winner)+' wins'}</div>
        <div style="font-size:15px;color:var(--text-secondary);">${escapeHtml(m.teams[0])} ${m.score[0]} &ndash; ${m.score[1]} ${escapeHtml(m.teams[1])}</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">${m.type} &middot; ${fmtTime(m.duration)}</div>
        <div style="display:flex;flex-direction:column;gap:10px;margin-top:2rem;">
          <button id="newGameBtn" style="height:50px;font-weight:500;">Start another game</button>
          <button id="homeBtn2" style="height:46px;">Back to home</button>
        </div>
      </div>
    `;
  }

  else if(state.view==='history'){
    html=`
      <div style="padding:1.25rem 0;">
        ${backButton()}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
          <div style="font-size:19px;font-weight:600;">Match history</div>
          ${state.matches.length>0?`<button id="clearHistBtn" style="height:32px;font-size:12px;padding:0 10px;color:var(--danger-text);">Clear all</button>`:''}
        </div>
        ${state.matches.length===0 ? `<div style="color:var(--text-muted);font-size:14px;text-align:center;padding:3rem 0;">No games yet</div>` :
        state.matches.map(m=>`
          <div class="card" style="padding:12px 14px;margin-bottom:8px;position:relative;">
            <div style="font-size:14px;font-weight:500;">${escapeHtml(m.teams[0])} ${m.score[0]} &ndash; ${m.score[1]} ${escapeHtml(m.teams[1])}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">${m.type} &middot; ${m.winner==='Tie'?'Tie':escapeHtml(m.winner)+' won'} &middot; ${fmtTime(m.duration)}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${fmtDate(m.date)}</div>
            <button class="delMatchBtn" data-id="${m.id}" style="position:absolute;top:10px;right:10px;height:26px;width:26px;padding:0;font-size:12px;color:var(--text-muted);">&times;</button>
          </div>
        `).join('')}
      </div>
    `;
  }

  else if(state.view==='tournamentSetup'){
    html=`
      <div style="padding:1.25rem 0;">
        ${backButton()}
        <div style="font-size:19px;font-weight:600;margin-bottom:4px;">New tournament</div>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:1rem;">Enter names separated by commas</div>
        <textarea id="tourPlayers" placeholder="Alex, Sam, Jordan, Taylor..." style="width:100%;height:90px;"></textarea>
        <div style="font-size:13px;color:var(--text-secondary);margin:1.25rem 0 8px;">Match type</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${MATCH_TYPES.map(t=>`<button class="tourTypeBtn" data-type="${t}" style="height:42px;font-size:14px;">${t}</button>`).join('')}
        </div>
      </div>
    `;
  }

  else if(state.view==='tournamentBoard'){
    const tour=state.tournament;
    html=`
      <div style="padding:1.25rem 0;">
        ${backButton()}
        <div style="font-size:19px;font-weight:600;margin-bottom:4px;">Tournament bracket</div>
        <div style="font-size:13px;color:var(--text-secondary);margin-bottom:1rem;">${tour.type} &middot; ${tour.status==='complete'?'Complete':'In progress'}</div>
        ${tour.matchups.map((m,idx)=>{
          const done=idx<tour.results.length;
          const result=done?tour.results[idx]:null;
          const isBye=m[1]==='BYE';
          return `
          <div class="card" style="padding:12px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:10px;">
            <div style="min-width:0;">
              <div style="font-size:14px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(m[0])} vs ${escapeHtml(m[1])}</div>
              ${done?`<div style="font-size:12px;color:var(--text-secondary);">${result.score[0]} &ndash; ${result.score[1]} &middot; ${escapeHtml(result.winner)} won</div>`
                :isBye?`<div style="font-size:12px;color:var(--text-muted);">Bye &mdash; advances automatically</div>`
                :`<div style="font-size:12px;color:var(--text-muted);">Not played yet</div>`}
            </div>
            ${!done && !isBye ? `<button class="playMatchBtn" data-idx="${idx}" style="height:36px;font-size:13px;padding:0 14px;flex-shrink:0;">Play</button>` : ''}
          </div>`;
        }).join('')}
      </div>
    `;
  }

  app.innerHTML=html;
  attachHandlers();
}

function backButton(){
  return `<button id="backBtn" style="border:none;background:none;color:var(--text-secondary);font-size:13px;margin-bottom:14px;padding:6px 0;">&larr; Back</button>`;
}

function attachHandlers(){
  const q=id=>document.getElementById(id);
  const on=(id,fn)=>{ const e=q(id); if(e) e.onclick=fn; };

  on('backBtn', goHome);
  on('homeBtn2', goHome);
  on('freeBtn', ()=>startSetup('free'));
  on('tourBtn', setupTournament);
  on('historyBtn', ()=>{ state.view='history'; render(); });
  on('resumeTour', resumeTournament);
  on('newGameBtn', goHome);
  on('pauseBtn', togglePause);
  on('undoBtn', undoLast);
  on('clearHistBtn', clearAllHistory);
  on('startGameBtn', ()=>beginGame(q('teamA').value, q('teamB').value));
  on('endGameBtn', ()=>{ if(confirm('End the game?')) endGame(); });

  document.querySelectorAll('.typeBtn').forEach(b=>b.onclick=()=>pickType(b.dataset.type));
  document.querySelectorAll('.shotBtn').forEach(b=>b.onclick=()=>addPoint(parseInt(b.dataset.team), parseInt(b.dataset.pts), b.dataset.label));
  document.querySelectorAll('.tourTypeBtn').forEach(b=>b.onclick=()=>createTournament(q('tourPlayers').value, b.dataset.type));
  document.querySelectorAll('.playMatchBtn').forEach(b=>b.onclick=()=>playTournamentMatch(parseInt(b.dataset.idx)));
  document.querySelectorAll('.delMatchBtn').forEach(b=>b.onclick=()=>deleteMatch(parseInt(b.dataset.id)));
}

state.matches=loadMatches();
state.tournaments=loadTournaments();
render();

})();
