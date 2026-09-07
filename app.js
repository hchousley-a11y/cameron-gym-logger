const STORE_KEY='cameronGymLoggerV01';
const nowIso=()=>new Date().toISOString();
const uid=()=>Math.random().toString(36).slice(2)+Date.now().toString(36);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

const seedExercises=[
  {id:'bench',name:'Barbell Bench',equipment:'Barbell',main:true,rest:210,weightMode:'barbell'},
  {id:'incline',name:'Incline Bench',equipment:'Barbell',main:true,rest:180,weightMode:'barbell'},
  {id:'pullup',name:'Pull-Up',equipment:'Bodyweight',main:false,rest:90,weightMode:'bodyweight',special:['negatives','hold','assist']},
  {id:'deadhang',name:'Deadhang',equipment:'Bodyweight',main:false,rest:75,weightMode:'bodyweight',special:['hold']},
  {id:'tib',name:'Tib Bar',equipment:'Plate-loaded',main:false,rest:60,weightMode:'barbell'},
  {id:'goblet',name:'Goblet Squat',equipment:'Kettlebell',main:true,rest:150,weightMode:'kb'},
  {id:'rdl',name:'Barbell RDL',equipment:'Barbell',main:true,rest:180,weightMode:'barbell'},
  {id:'stepdown',name:'Stepdown',equipment:'Bodyweight / Vest',main:false,rest:75,weightMode:'barbell'},
  {id:'legcurl',name:'Seated Leg Curl',equipment:'Machine',main:false,rest:90,weightMode:'machine'},
  {id:'legext',name:'Leg Extension',equipment:'Machine',main:false,rest:90,weightMode:'machine'},
  {id:'revlunge',name:'Reverse Lunge',equipment:'DB/KB',main:false,rest:90,weightMode:'barbell'},
  {id:'calf',name:'Calf Raise',equipment:'Bodyweight / Vest',main:false,rest:60,weightMode:'barbell'},
  {id:'row',name:'1-Arm Row',equipment:'DB/KB',main:false,rest:90,weightMode:'kb'},
  {id:'dip',name:'Dip',equipment:'Bodyweight / Machine',main:false,rest:90,weightMode:'barbell'},
  {id:'curl',name:'Curl',equipment:'DB/KB',main:false,rest:75,weightMode:'barbell'},
  {id:'triceps',name:'Triceps Extension',equipment:'Cable/DB',main:false,rest:75,weightMode:'barbell'},
  {id:'lateral',name:'Lateral Raise',equipment:'DB',main:false,rest:60,weightMode:'barbell'},
  {id:'rear',name:'Rear Delt Raise',equipment:'DB/Cable',main:false,rest:60,weightMode:'barbell'}
];

const seedState={
  settings:{bodyweight:238.3,mainRest:210,accessoryRest:75},
  exercises:seedExercises,
  templates:{
    A:['bench','pullup','tib','goblet','stepdown','deadhang','rdl','legcurl','calf','row'],
    B:['incline','pullup','goblet','revlunge','legext','legcurl','calf','deadhang','curl','triceps']
  },
  workouts:[],
  active:null,
  ui:{theme:'dark'}
};

let state=load();
let currentLogExerciseId=null;
let activeSetType='Working';
let activeQuickNote='';
let templateTab='A';
let historyRange='30';
let sessionTimer=null;

function deepClone(x){return JSON.parse(JSON.stringify(x));}
function load(){
  try{
    const raw=localStorage.getItem(STORE_KEY);
    if(!raw) return deepClone(seedState);
    const parsed=JSON.parse(raw);
    parsed.exercises=parsed.exercises||deepClone(seedExercises);
    parsed.templates=parsed.templates||deepClone(seedState.templates);
    parsed.workouts=parsed.workouts||[];
    parsed.settings={...seedState.settings,...(parsed.settings||{})};
    return parsed;
  }catch{return deepClone(seedState)}
}
function save(){localStorage.setItem(STORE_KEY,JSON.stringify(state));}
function exercise(id){return state.exercises.find(x=>x.id===id)}
function fmtTime(sec){sec=Math.max(0,Math.floor(sec));return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`}
function fmtDate(iso){return new Date(iso).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}
function esc(s=''){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function toast(msg){const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),1800)}

function showView(name){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const el=document.getElementById(name+'View'); if(el) el.classList.add('active');
  if(name==='home') renderHome();
  if(name==='history') renderHistory();
  if(name==='templates') renderTemplateEditor();
  if(name==='settings') renderSettings();
  if(name==='workout') renderWorkout();
  window.scrollTo(0,0);
}

function startWorkout(template){
  const ids=template==='blank'?[]:[...(state.templates[template]||[])];
  const items=ids.map((id,i)=>({exerciseId:id,pinned:!!exercise(id)?.main,done:false,order:i,lastSetAt:null}));
  state.active={id:uid(),template,title:template==='blank'?'Blank Workout':`Workout ${template}`,startedAt:nowIso(),endedAt:null,items,sets:[],notes:''};
  save(); showView('workout'); startClock();
}

function startClock(){
  if(sessionTimer) clearInterval(sessionTimer);
  sessionTimer=setInterval(()=>{
    if(!state.active)return;
    const sec=(Date.now()-new Date(state.active.startedAt).getTime())/1000;
    const el=document.getElementById('sessionClock'); if(el)el.textContent=fmtTime(sec);
    updateRecoveryLabels();
  },1000);
}

function renderHome(){
  const box=document.getElementById('recentWorkouts');
  const ws=[...state.workouts].sort((a,b)=>new Date(b.startedAt)-new Date(a.startedAt)).slice(0,5);
  box.innerHTML=ws.length?ws.map(w=>`<div class="recent-card"><strong>${esc(w.title||'Workout')}</strong><div class="meta">${fmtDate(w.startedAt)} • ${w.sets.length} sets • ${fmtTime((new Date(w.endedAt)-new Date(w.startedAt))/1000)}</div></div>`).join(''):'<div class="recent-card"><strong>No workouts yet</strong><div class="meta">Your completed sessions will show here.</div></div>';
}

function lastSetFor(exId,activeOnly=true){
  const arr=activeOnly&&state.active?state.active.sets.filter(s=>s.exerciseId===exId):[];
  return arr[arr.length-1]||null;
}
function previousWorkoutSets(exId){
  const ws=[...state.workouts].sort((a,b)=>new Date(b.startedAt)-new Date(a.startedAt));
  for(const w of ws){const sets=w.sets.filter(s=>s.exerciseId===exId);if(sets.length)return sets}
  return [];
}
function setText(s){
  if(!s)return '—';
  const ex=exercise(s.exerciseId);
  let base='';
  if(ex?.weightMode==='bodyweight') base=`BW${s.weight?` +${s.weight}`:''} × ${s.reps}`;
  else base=`${s.weight} × ${s.reps}`;
  if(s.negatives) base+=` +${s.negatives} neg`;
  if(s.partials) base+=` +${s.partials} partial`;
  if(s.holdSeconds) base+=` +${s.holdSeconds}s hold`;
  if(s.rir) base+=` @${s.rir}`;
  if(s.setType&&s.setType!=='Working') base+=` • ${s.setType}`;
  if(s.quickNote) base+=` • ${s.quickNote}`;
  return base;
}
function exerciseCard(item){
  const ex=exercise(item.exerciseId); if(!ex)return '';
  const last=lastSetFor(ex.id);
  const lastAt=item.lastSetAt?new Date(item.lastSetAt).getTime():null;
  const elapsed=lastAt?(Date.now()-lastAt)/1000:null;
  const target=ex.rest|| (item.pinned?state.settings.mainRest:state.settings.accessoryRest);
  const ready=elapsed===null||elapsed>=target;
  const cls=item.done?'done':ready?'ready':'recovering';
  const status=item.done?'DONE':elapsed===null?'READY':ready?`READY — ${fmtTime(elapsed)} recovered`:`${fmtTime(elapsed)} / ${fmtTime(target)} recovery`;
  return `<div class="exercise-card ${cls}" data-exercise-card="${ex.id}">
    <div class="tap-log" data-log-exercise="${ex.id}">
      <div class="exercise-name">${esc(ex.name)}</div>
      <div class="exercise-last">${last?`Today: ${esc(setText(last))}`:'No sets yet today'}</div>
      <div class="exercise-status ${ready?'ready':'recovering'}">${status}</div>
    </div>
    <div class="exercise-actions">
      <button class="mini-btn" data-pin="${ex.id}" title="Pin/unpin">${item.pinned?'★':'☆'}</button>
      <button class="mini-btn" data-done="${ex.id}" title="Done/reactivate">${item.done?'↺':'✓'}</button>
    </div>
  </div>`
}
function renderWorkout(){
  if(!state.active){showView('home');return}
  document.getElementById('workoutTitle').textContent=state.active.title;
  document.getElementById('workoutTemplateLabel').textContent=state.active.template==='blank'?'FREE SESSION':`TEMPLATE ${state.active.template}`;
  const sorted=[...state.active.items].sort((a,b)=>a.order-b.order);
  document.getElementById('pinnedList').innerHTML=sorted.filter(i=>i.pinned&&!i.done).map(exerciseCard).join('')||'<div class="recent-card"><div class="meta">No pinned lifts.</div></div>';
  document.getElementById('rotationList').innerHTML=sorted.filter(i=>!i.pinned&&!i.done).map(exerciseCard).join('')||'<div class="recent-card"><div class="meta">No active rotation exercises.</div></div>';
  document.getElementById('doneList').innerHTML=sorted.filter(i=>i.done).map(exerciseCard).join('')||'<div class="recent-card"><div class="meta">Nothing finished yet.</div></div>';
  const sec=(Date.now()-new Date(state.active.startedAt).getTime())/1000;document.getElementById('sessionClock').textContent=fmtTime(sec);
}
function updateRecoveryLabels(){
  if(!state.active)return;
  document.querySelectorAll('[data-exercise-card]').forEach(card=>{
    const id=card.dataset.exerciseCard; const item=state.active.items.find(i=>i.exerciseId===id); const ex=exercise(id); if(!item||item.done||!item.lastSetAt)return;
    const elapsed=(Date.now()-new Date(item.lastSetAt).getTime())/1000; const target=ex.rest||(item.pinned?state.settings.mainRest:state.settings.accessoryRest); const ready=elapsed>=target;
    const label=card.querySelector('.exercise-status'); if(label){label.textContent=ready?`READY — ${fmtTime(elapsed)} recovered`:`${fmtTime(elapsed)} / ${fmtTime(target)} recovery`;label.className=`exercise-status ${ready?'ready':'recovering'}`}
    card.classList.toggle('ready',ready);card.classList.toggle('recovering',!ready);
  })
}

function weightOptions(ex){
  if(ex?.weightMode==='kb') return [0,5,10,15,25,40,50,70,100];
  const arr=[]; for(let x=0;x<=20;x+=2.5)arr.push(x); for(let x=25;x<=500;x+=5)arr.push(x); return arr;
}
function selectClosest(select,val){
  const opts=[...select.options]; let best=0,dist=Infinity; opts.forEach((o,i)=>{const d=Math.abs(parseFloat(o.value)-parseFloat(val||0));if(d<dist){best=i;dist=d}});select.selectedIndex=best;
}
function openLogSheet(id){
  currentLogExerciseId=id; activeSetType='Working';activeQuickNote='';
  const ex=exercise(id); if(!ex)return;
  document.getElementById('sheetTitle').textContent=ex.name;
  const lt=lastSetFor(id); const prev=previousWorkoutSets(id);
  document.getElementById('lastToday').textContent=lt?setText(lt):'—';
  document.getElementById('lastWorkout').textContent=prev.length?prev.slice(-3).map(setText).join(' | '):'—';
  const w=document.getElementById('weightWheel'); w.innerHTML=weightOptions(ex).map(x=>`<option value="${x}">${x}</option>`).join('');
  const r=document.getElementById('repsWheel'); r.innerHTML=Array.from({length:101},(_,i)=>`<option value="${i}">${i}</option>`).join('');
  const rr=document.getElementById('rirWheel'); rr.innerHTML=['6+','5','4','3','2','1','0','FAIL'].map(x=>`<option value="${x}">${x}</option>`).join('');
  selectClosest(w,lt?.weight||0); r.value=String(lt?.reps??8); rr.value=lt?.rir||'2';
  renderSetTags(); renderQuickNotes();
  document.getElementById('negativeRepsInput').value=0;document.getElementById('partialRepsInput').value=0;document.getElementById('holdSecondsInput').value=0;document.getElementById('assistInput').value=0;document.getElementById('setNoteInput').value='';
  document.getElementById('negativesWrap').classList.toggle('hidden',!(ex.special||[]).includes('negatives'));
  document.getElementById('holdWrap').classList.toggle('hidden',!(ex.special||[]).includes('hold'));
  document.getElementById('assistWrap').classList.toggle('hidden',!(ex.special||[]).includes('assist'));
  document.getElementById('partialsWrap').classList.remove('hidden');
  openSheet('logSheet');
  setTimeout(()=>{w.scrollTop=w.selectedIndex*31;r.scrollTop=r.selectedIndex*31;rr.scrollTop=rr.selectedIndex*31},50)
}
function renderSetTags(){
  const tags=['Warmup','Working','Top set','Backoff','AMRAP','Failure','Tempo'];
  document.getElementById('setTypeTags').innerHTML=tags.map(t=>`<button class="tag ${t===activeSetType?'active':''}" data-set-type="${t}">${t}</button>`).join('')
}
function renderQuickNotes(){
  const tags=['Easy','Good','Hard','Barely','Pain','Technique'];
  document.getElementById('quickNotes').innerHTML=tags.map(t=>`<button class="tag ${t===activeQuickNote?'active':''}" data-quick-note="${t}">${t}</button>`).join('')
}
function logSet(){
  if(!state.active||!currentLogExerciseId)return;
  const s={
    id:uid(),exerciseId:currentLogExerciseId,timestamp:nowIso(),weight:parseFloat(document.getElementById('weightWheel').value||0),reps:parseInt(document.getElementById('repsWheel').value||0),rir:document.getElementById('rirWheel').value,setType:activeSetType,
    negatives:parseInt(document.getElementById('negativeRepsInput').value||0),partials:parseInt(document.getElementById('partialRepsInput').value||0),holdSeconds:parseInt(document.getElementById('holdSecondsInput').value||0),assist:parseFloat(document.getElementById('assistInput').value||0),quickNote:activeQuickNote,note:document.getElementById('setNoteInput').value.trim()
  };
  state.active.sets.push(s); const item=state.active.items.find(i=>i.exerciseId===currentLogExerciseId);if(item)item.lastSetAt=s.timestamp;
  save(); closeAllSheets(); renderWorkout(); toast(`Logged ${exercise(currentLogExerciseId)?.name}`)
}

function openExercisePicker(){
  const inWorkout=state.active?new Set(state.active.items.map(i=>i.exerciseId)):new Set();
  const list=state.exercises.filter(e=>!inWorkout.has(e.id));
  document.getElementById('exercisePickerList').innerHTML=list.map(e=>`<button class="picker-item" data-add-exercise="${e.id}"><strong>${esc(e.name)}</strong><small>${esc(e.equipment)}</small></button>`).join('');
  document.getElementById('exerciseSearch').value=''; openSheet('exercisePickerSheet')
}
function addExerciseToActive(id){
  if(!state.active)return; if(state.active.items.some(i=>i.exerciseId===id))return;
  state.active.items.push({exerciseId:id,pinned:!!exercise(id)?.main,done:false,order:state.active.items.length,lastSetAt:null});save();closeAllSheets();renderWorkout()
}

function openFinish(){
  if(!state.active)return;
  const duration=(Date.now()-new Date(state.active.startedAt).getTime())/1000;
  const exCount=new Set(state.active.sets.map(s=>s.exerciseId)).size;
  document.getElementById('finishSummary').innerHTML=`<strong>${state.active.sets.length} sets</strong><p>${exCount} exercises • ${fmtTime(duration)}</p>`;
  document.getElementById('workoutNotes').value=state.active.notes||''; openSheet('finishSheet')
}
function chatText(w=state.active){
  if(!w)return '';
  let out=`${w.title} — ${fmtDate(w.startedAt)}\n\n`;
  const grouped={};w.sets.forEach(s=>(grouped[s.exerciseId]??=[]).push(s));
  for(const [id,sets] of Object.entries(grouped)){out+=`${exercise(id)?.name||id}:\n`;sets.forEach(s=>out+=`${setText(s)}${s.note?` — ${s.note}`:''}\n`);out+='\n'}
  if(w.notes)out+=`Notes:\n${w.notes}\n`; return out.trim()
}
async function copyChat(){try{await navigator.clipboard.writeText(chatText());toast('Copied for ChatGPT')}catch{toast('Copy failed')}}
function saveFinishedWorkout(){
  if(!state.active)return; state.active.notes=document.getElementById('workoutNotes').value.trim();state.active.endedAt=nowIso();state.workouts.push(deepClone(state.active));state.active=null;save();closeAllSheets();if(sessionTimer)clearInterval(sessionTimer);showView('home');toast('Workout saved')
}

function renderHistory(){
  const select=document.getElementById('historyExerciseSelect');select.innerHTML='<option value="">Choose exercise</option>'+state.exercises.map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('');
  const cutoff=historyRange==='all'?0:Date.now()-parseInt(historyRange)*86400000;
  const ws=state.workouts.filter(w=>new Date(w.startedAt).getTime()>=cutoff).sort((a,b)=>new Date(b.startedAt)-new Date(a.startedAt));
  const sets=ws.flatMap(w=>w.sets);const unique=new Set(sets.map(s=>s.exerciseId)).size;
  document.getElementById('historySummary').innerHTML=`<div class="summary-box"><strong>${ws.length}</strong><span>workouts</span></div><div class="summary-box"><strong>${sets.length}</strong><span>sets</span></div><div class="summary-box"><strong>${unique}</strong><span>exercises</span></div>`;
  document.getElementById('historyList').innerHTML=ws.length?ws.map(w=>`<div class="history-card"><strong>${esc(w.title)}</strong><div class="meta">${fmtDate(w.startedAt)} • ${w.sets.length} sets • ${fmtTime((new Date(w.endedAt)-new Date(w.startedAt))/1000)}</div></div>`).join(''):'<div class="history-card"><div class="meta">No workouts in this range.</div></div>';
  renderExerciseHistory(select.value)
}
function renderExerciseHistory(id){
  const box=document.getElementById('exerciseHistory');if(!id){box.innerHTML='<div class="history-card"><div class="meta">Choose an exercise to see every logged set.</div></div>';return}
  const rows=[];state.workouts.forEach(w=>w.sets.filter(s=>s.exerciseId===id).forEach(s=>rows.push({w,s})));rows.sort((a,b)=>new Date(b.s.timestamp)-new Date(a.s.timestamp));
  box.innerHTML=rows.length?rows.map(({w,s})=>`<div class="history-card"><strong>${esc(setText(s))}</strong><div class="meta">${fmtDate(w.startedAt)}${s.note?` • ${esc(s.note)}`:''}</div></div>`).join(''):'<div class="history-card"><div class="meta">No sets logged yet.</div></div>'
}

function renderTemplateEditor(){
  document.querySelectorAll('[data-template-tab]').forEach(b=>b.classList.toggle('active',b.dataset.templateTab===templateTab));
  const ids=state.templates[templateTab]||[];const box=document.getElementById('templateEditor');
  box.innerHTML=ids.map((id,i)=>{const e=exercise(id);return `<div class="template-row"><div><strong>${esc(e?.name||id)}</strong><small>${esc(e?.equipment||'')} • ${e?.main?'Pinned main lift':'Rotation'}</small></div><div class="exercise-actions"><button class="mini-btn" data-template-pin="${id}">${e?.main?'★':'☆'}</button><button class="mini-btn" data-template-up="${id}">↑</button><button class="mini-btn" data-template-down="${id}">↓</button><button class="mini-btn" data-template-remove="${id}">×</button></div></div>`}).join('')||'<div class="recent-card"><div class="meta">Template is empty.</div></div>'
}
function templateAddPicker(){
  const ids=new Set(state.templates[templateTab]||[]);document.getElementById('exercisePickerList').innerHTML=state.exercises.filter(e=>!ids.has(e.id)).map(e=>`<button class="picker-item" data-template-add="${e.id}"><strong>${esc(e.name)}</strong><small>${esc(e.equipment)}</small></button>`).join('');openSheet('exercisePickerSheet')
}

function renderSettings(){document.getElementById('bodyweightInput').value=state.settings.bodyweight;document.getElementById('mainRestInput').value=state.settings.mainRest;document.getElementById('accessoryRestInput').value=state.settings.accessoryRest}
function saveSettings(){state.settings.bodyweight=parseFloat(document.getElementById('bodyweightInput').value||0);state.settings.mainRest=parseInt(document.getElementById('mainRestInput').value||210);state.settings.accessoryRest=parseInt(document.getElementById('accessoryRestInput').value||75);save();toast('Settings saved')}

function csvEscape(v){const s=String(v??'');return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s}
function exportCsv(){
  const head=['workout_id','workout_title','workout_date','exercise','equipment','set_timestamp','weight_lb','reps','rir','set_type','negatives','partials','hold_seconds','assist_lb','quick_note','set_note'];const rows=[head];
  state.workouts.forEach(w=>w.sets.forEach(s=>{const e=exercise(s.exerciseId);rows.push([w.id,w.title,w.startedAt,e?.name||s.exerciseId,e?.equipment||'',s.timestamp,s.weight,s.reps,s.rir,s.setType,s.negatives,s.partials,s.holdSeconds,s.assist,s.quickNote,s.note])}));
  download(`gym-logger-sets-${new Date().toISOString().slice(0,10)}.csv`,rows.map(r=>r.map(csvEscape).join(',')).join('\n'),'text/csv')
}
function exportJson(){download(`gym-logger-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(state,null,2),'application/json')}
function download(name,text,type){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
function importJson(file){const r=new FileReader();r.onload=()=>{try{state=JSON.parse(r.result);save();toast('Backup restored');renderHome()}catch{toast('Invalid backup')}};r.readAsText(file)}

function openSheet(id){document.getElementById('scrim').classList.remove('hidden');document.getElementById(id).classList.remove('hidden')}
function closeAllSheets(){document.getElementById('scrim').classList.add('hidden');document.querySelectorAll('.sheet').forEach(s=>s.classList.add('hidden'))}

// Events

document.addEventListener('click',e=>{
  const start=e.target.closest('[data-start-template]');if(start)return startWorkout(start.dataset.startTemplate);
  const nav=e.target.closest('[data-nav]');if(nav)return showView(nav.dataset.nav);
  const log=e.target.closest('[data-log-exercise]');if(log)return openLogSheet(log.dataset.logExercise);
  const pin=e.target.closest('[data-pin]');if(pin&&state.active){const i=state.active.items.find(x=>x.exerciseId===pin.dataset.pin);if(i)i.pinned=!i.pinned;save();renderWorkout();return}
  const done=e.target.closest('[data-done]');if(done&&state.active){const i=state.active.items.find(x=>x.exerciseId===done.dataset.done);if(i)i.done=!i.done;save();renderWorkout();return}
  const st=e.target.closest('[data-set-type]');if(st){activeSetType=st.dataset.setType;renderSetTags();return}
  const qn=e.target.closest('[data-quick-note]');if(qn){activeQuickNote=activeQuickNote===qn.dataset.quickNote?'':qn.dataset.quickNote;renderQuickNotes();return}
  const add=e.target.closest('[data-add-exercise]');if(add)return addExerciseToActive(add.dataset.addExercise);
  const range=e.target.closest('[data-range]');if(range){historyRange=range.dataset.range;document.querySelectorAll('[data-range]').forEach(b=>b.classList.toggle('active',b===range));renderHistory();return}
  const tab=e.target.closest('[data-template-tab]');if(tab){templateTab=tab.dataset.templateTab;renderTemplateEditor();return}
  const ta=e.target.closest('[data-template-add]');if(ta){state.templates[templateTab].push(ta.dataset.templateAdd);save();closeAllSheets();renderTemplateEditor();return}
  const tr=e.target.closest('[data-template-remove]');if(tr){state.templates[templateTab]=state.templates[templateTab].filter(id=>id!==tr.dataset.templateRemove);save();renderTemplateEditor();return}
  const tu=e.target.closest('[data-template-up]');if(tu){moveTemplate(tu.dataset.templateUp,-1);return}
  const td=e.target.closest('[data-template-down]');if(td){moveTemplate(td.dataset.templateDown,1);return}
  const tp=e.target.closest('[data-template-pin]');if(tp){const ex=exercise(tp.dataset.templatePin);if(ex){ex.main=!ex.main;save();renderTemplateEditor()}return}
});
function moveTemplate(id,dir){const arr=state.templates[templateTab];const i=arr.indexOf(id),j=clamp(i+dir,0,arr.length-1);[arr[i],arr[j]]=[arr[j],arr[i]];save();renderTemplateEditor()}

document.getElementById('backHomeBtn').onclick=()=>showView('home');
document.getElementById('addExerciseBtn').onclick=openExercisePicker;
document.getElementById('finishWorkoutBtn').onclick=openFinish;
document.getElementById('closeLogSheet').onclick=closeAllSheets;
document.getElementById('closeExercisePicker').onclick=closeAllSheets;
document.getElementById('closeFinishSheet').onclick=closeAllSheets;
document.getElementById('scrim').onclick=closeAllSheets;
document.getElementById('logSetBtn').onclick=logSet;
document.getElementById('copyChatBtn').onclick=copyChat;
document.getElementById('saveWorkoutBtn').onclick=saveFinishedWorkout;
document.getElementById('templateAddExercise').onclick=templateAddPicker;
document.getElementById('saveSettingsBtn').onclick=saveSettings;
document.getElementById('exportCsvBtn').onclick=exportCsv;
document.getElementById('exportJsonBtn').onclick=exportJson;
document.getElementById('importJsonInput').onchange=e=>{if(e.target.files[0])importJson(e.target.files[0])};
document.getElementById('historyExerciseSelect').onchange=e=>renderExerciseHistory(e.target.value);
document.getElementById('exerciseSearch').oninput=e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('.picker-item').forEach(x=>x.style.display=x.innerText.toLowerCase().includes(q)?'block':'none')};

document.getElementById('themeBtn').onclick=()=>toast('Dark mode is locked for V0.1');

if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
renderHome();if(state.active){startClock()}
