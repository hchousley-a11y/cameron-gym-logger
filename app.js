const STORE_KEY='cameronGymLoggerV01'; // intentionally unchanged so V0.1 data survives the upgrade
const APP_VERSION='0.3.0';
const LEGACY_SAFETY_KEY='cameronGymLoggerV01_preV02_safety';
const nowIso=()=>new Date().toISOString();
const uid=(p='id')=>`${p}_${Math.random().toString(36).slice(2,8)}${Date.now().toString(36)}`;
const clone=x=>JSON.parse(JSON.stringify(x));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=(s='')=>String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const fmtDate=iso=>new Date(iso).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});
const fmtClock=iso=>new Date(iso).toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit',second:'2-digit'});
const fmtDuration=sec=>{sec=Math.max(0,Math.round(Number(sec)||0));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`};
const number=v=>Number.isFinite(Number(v))?Number(v):0;
const unique=a=>[...new Set(a)];

const KB_WEIGHTS=[5,10,15,20,25,40,50,70,100];
const CARRY_DB_WEIGHTS=[100];
const VEST_WEIGHTS=[0,5,10,15,20,25,30,35,40];
const RIR_VALUES=['6+','5','4','3','2','1','0','FAIL'];
const SET_TYPES=['Warmup','Working','Top Set','Backoff','AMRAP','Failure','Slow Eccentric','Technique','Drop Set','Myo'];
const QUICK_NOTES=['Easy','Good','Hard','Barely','Pain','Technique'];
const PUSH_STYLES=['Normal','Wide','Diamond','Clap'];
const PUSH_SETUPS=['Flat','Deficit','Hands Elevated','Feet Elevated'];
const STEP_HEIGHTS=['Treadmill',...Array.from({length:14},(_,i)=>`${i+5}\"`)];
const SLED_DIRECTIONS=['Forward','Backward','Both'];

// Starting prescriptions only. Targets can be changed for the active workout and are never hard caps.
const EXERCISE_TARGETS={
  smith_bench:{sets:4,reps:'3–8 strength / 6–10 moderate',note:'Warm-up/ramp sets do not count toward the working-set target.'},
  pullup:{sets:3,reps:'Quality reps / holds / negatives'},
  goblet_squat:{sets:3,reps:'6–10'},barbell_squat:{sets:3,reps:'6–10'},smith_squat:{sets:3,reps:'6–10'},
  reverse_lunge:{sets:3,reps:'8–12 / side',perSide:true},
  barbell_rdl:{sets:3,reps:'6–10'},
  kb_swing:{sets:3,reps:'10–20'},
  incline_smith:{sets:4,reps:'8–12'},
  one_arm_bent_row:{sets:3,reps:'6–10 heavy OR 10–20 endurance',perSide:true},
  dip_machine:{sets:3,reps:'10–20'},
  pushup:{sets:3,reps:'8–20',note:'May autoregulate up to 4–5 sets.'},
  seated_leg_curl:{sets:3,reps:'8–15'},leg_extension:{sets:3,reps:'10–15'},
  preacher_curl:{sets:4,reps:'8–12'},triceps_extension:{sets:3,reps:'10–15'},
  calf_raise:{sets:3,reps:'10–20'},smith_calf_raise:{sets:3,reps:'10–20'},
  tib_bar:{sets:3,reps:'15–25'},rear_delt_fly:{sets:3,reps:'12–20'},lateral_raise:{sets:3,reps:'12–20'},
  pullover:{sets:2,reps:'10–15'},shrugs:{sets:2,reps:'8–15',note:'Test light / skip if neck or mid-back is symptomatic.'},
  stepdown:{sets:3,reps:'8–12 / side',perSide:true},
  farmer_carry:{sets:2,work:'30–60 sec / trip',note:'May autoregulate to 3 trips. Test light / skip if symptomatic.'},
  suitcase_carry:{sets:2,work:'30–60 sec / trip',perSide:true,note:'May autoregulate to 3 trips / side. Test light / skip if symptomatic.'},
  deadhang:{sets:3,work:'20–45 sec',note:'Usually submaximal when paired with pull-up work.'},
  plank:{sets:3,work:'30–60 sec'},
  incline_treadmill:{sets:null,work:"Duration/distance determined by today's running/walking plan"}
};
const TEMPLATE_TARGET_OVERRIDES={
  A:{smith_bench:{reps:'3–8 strength / 6–10 moderate'}},
  B:{smith_bench:{reps:'6–10 moderate'}}
};

const builtins=[
  ex('smith_bench','Smith Bench Press','Smith','strength','heavy',['Chest'],['Triceps','Front Delts'],{weightSource:'barbell',e1rm:true,restOverride:240}),
  ex('incline_smith','Incline Smith Bench','Smith','strength','heavy',['Chest'],['Triceps','Front Delts'],{weightSource:'barbell',e1rm:true,restOverride:180}),
  ex('barbell_bench','Barbell Bench Press','Barbell','strength','heavy',['Chest'],['Triceps','Front Delts'],{weightSource:'barbell',e1rm:true}),
  ex('incline_barbell_bench','Incline Barbell Bench','Barbell','strength','heavy',['Chest'],['Triceps','Front Delts'],{weightSource:'barbell',e1rm:true}),
  ex('db_bench','Dumbbell Bench Press','Dumbbell','strength','compound',['Chest'],['Triceps','Front Delts'],{weightSource:'db'}),
  ex('incline_db_bench','Incline Dumbbell Press','Dumbbell','strength','compound',['Chest'],['Triceps','Front Delts'],{weightSource:'db'}),
  ex('tib_bar','Tib Bar Raise','Tib bar','strength','small',['Tibialis'],[],{weightSource:'generic',restOverride:60}),
  ex('pullup','Pull-Up','Bodyweight','bodyweight','skill',['Lats'],['Upper Back','Biceps','Grip'],{special:['negatives','hold'],restOverride:180}),
  ex('assisted_pullup','Assisted Pull-Up Machine','Machine','assisted','compound',['Lats'],['Upper Back','Biceps'],{}),
  ex('goblet_squat','Goblet Squat','Kettlebell','strength','compound',['Quads','Glutes'],['Core'],{weightSource:'kb',restOverride:180}),
  ex('barbell_squat','Barbell Squat','Barbell','strength','heavy',['Quads','Glutes'],['Hamstrings','Core'],{weightSource:'barbell',e1rm:true,restOverride:180}),
  ex('smith_squat','Smith Squat','Smith','strength','heavy',['Quads','Glutes'],['Hamstrings','Core'],{weightSource:'barbell',e1rm:true,restOverride:180}),
  ex('preacher_curl','Bench-Supported / Preacher Curl','Bench / machine','strength','accessory',['Biceps'],['Forearms'],{weightSource:'machine',restOverride:90}),
  ex('db_curl','DB Curl','Dumbbell','strength','accessory',['Biceps'],['Forearms'],{weightSource:'db'}),
  ex('hammer_curl','Hammer Curl','Dumbbell','strength','accessory',['Biceps','Forearms'],[],{weightSource:'db'}),
  ex('calf_raise','Calf Raise','Bodyweight / vest','bodyweight','accessory',['Calves'],[],{restOverride:90}),
  ex('smith_calf_raise','Smith Calf Raise','Smith','strength','accessory',['Calves'],[],{weightSource:'barbell'}),
  ex('one_arm_bent_row','1-Arm Bent Row','DB / KB','strength','compound',['Lats','Upper Back'],['Biceps','Rear Delts','Grip'],{weightSource:'generic',perSide:true,restOverride:180}),
  ex('kb_rdl','KB RDL','Kettlebell','strength','compound',['Hamstrings','Glutes'],['Back/Erectors','Grip'],{weightSource:'kb'}),
  ex('barbell_rdl','Free-Bar RDL','Barbell','strength','heavy',['Hamstrings','Glutes'],['Back/Erectors','Grip'],{weightSource:'barbell',e1rm:true,restOverride:180}),
  ex('db_rdl','DB RDL','Dumbbell','strength','compound',['Hamstrings','Glutes'],['Back/Erectors','Grip'],{weightSource:'db'}),
  ex('kb_swing','KB Swing','Kettlebell','strength','compound',['Glutes','Hamstrings'],['Back/Erectors','Grip','Core'],{weightSource:'kb',restOverride:180}),
  ex('pullover','DB / KB Pullover','DB / KB','strength','accessory',['Lats','Chest'],['Triceps'],{weightSource:'generic',restOverride:90}),
  ex('dip_machine','Dip Machine','Machine','strength','compound',['Chest','Triceps'],['Front Delts'],{weightSource:'machine',restOverride:120}),
  ex('dips','Dips','Bodyweight','bodyweight','compound',['Chest','Triceps'],['Front Delts'],{}),
  ex('reverse_lunge','Reverse Lunge','DB / KB / bodyweight','strength','compound',['Quads','Glutes'],['Hamstrings','Core'],{weightSource:'generic',perSide:true,restOverride:120}),
  ex('rear_delt_fly','Rear Delt Fly','Dumbbell / cable','strength','small',['Rear Delts'],['Upper Back'],{weightSource:'db',restOverride:60}),
  ex('lateral_raise','Lateral Raise','Dumbbell','strength','small',['Side Delts'],[],{weightSource:'db',restOverride:60}),
  ex('seated_leg_curl','Seated Leg Curl','Machine','strength','accessory',['Hamstrings'],[],{weightSource:'machine',restOverride:90}),
  ex('leg_extension','Leg Extension','Machine','strength','accessory',['Quads'],[],{weightSource:'machine',restOverride:90}),
  ex('treadmill_walk','Treadmill Walk','Treadmill','treadmill','cardio',['Cardio'],[],{}),
  ex('incline_treadmill','Incline Treadmill','Treadmill','treadmill','cardio',['Cardio'],[],{restOverride:0}),
  ex('treadmill_run','Treadmill Run','Treadmill','treadmill','cardio',['Cardio'],[],{}),
  ex('treadmill_runwalk','Treadmill Run/Walk','Treadmill','runwalk','cardio',['Cardio'],[],{}),
  ex('elliptical','Elliptical','Elliptical','treadmill','cardio',['Cardio'],[],{}),
  ex('plank','Plank','Bodyweight / vest','plank','core',['Core'],['Shoulders'],{restOverride:60}),
  ex('plank_pullthrough','Plank Pull-Through','KB / DB','plankpull','core',['Core'],['Shoulders','Lats'],{weightSource:'generic'}),
  ex('stepdown','Stepdown','Bodyweight / vest','stepdown','accessory',['Quads','Glutes'],['Calves'],{perSide:true,restOverride:90}),
  ex('deadhang','Deadhang','Bodyweight','hold','skill',['Grip'],['Lats','Shoulders'],{restOverride:90}),
  ex('pushup','Push-Up','Bodyweight / vest','pushup','compound',['Chest'],['Triceps','Front Delts'],{restOverride:120}),
  ex('farmer_carry','Farmer Carry','KB / DB / vest','carry','compound',['Grip','Upper Back'],['Core','Traps'],{carryType:'farmer',restOverride:120}),
  ex('suitcase_carry','Suitcase Carry','KB / DB / vest','carry','compound',['Core','Grip'],['Obliques','Upper Back'],{carryType:'suitcase',restOverride:120}),
  ex('one_arm_oh_kb_press','1-Arm OH KB Press','Kettlebell','strength','compound',['Shoulders'],['Triceps','Core'],{weightSource:'kb',perSide:true}),
  ex('two_hand_oh_kb_press','2-Hand OH KB Press','Kettlebell','strength','compound',['Shoulders'],['Triceps','Core'],{weightSource:'kb'}),
  ex('kb_halo','KB Halo','Kettlebell','strength','small',['Shoulders'],['Core','Upper Back'],{weightSource:'kb'}),
  ex('triceps_extension','Triceps Extension','Cable / DB','strength','accessory',['Triceps'],[],{weightSource:'generic',restOverride:90}),
  ex('hanging_knee_raise','Hanging Knee Raise','Bodyweight','bodyweight','accessory',['Core'],['Hip Flexors','Grip'],{}),
  ex('shrugs','Shrugs','Barbell / DB / Smith','strength','accessory',['Traps'],['Grip'],{weightSource:'generic',restOverride:90}),
  ex('sled','Sled','Sled','sled','compound',['Quads','Glutes'],['Calves','Core','Upper Back'],{}),
  ex('cable_chest_fly','Cable Chest Fly','Cable','strength','accessory',['Chest'],['Front Delts'],{weightSource:'machine'}),
  ex('barbell_row','Barbell Row','Barbell','strength','compound',['Lats','Upper Back'],['Biceps','Rear Delts','Grip'],{weightSource:'barbell'}),
  ex('cable_row','Cable Row','Cable','strength','compound',['Lats','Upper Back'],['Biceps'],{weightSource:'machine'}),
  ex('lat_pulldown','Lat Pulldown','Cable','strength','compound',['Lats'],['Upper Back','Biceps'],{weightSource:'machine'}),
  ex('cable_curl','Cable Curl','Cable','strength','accessory',['Biceps'],['Forearms'],{weightSource:'machine'}),
  ex('face_pull','Face Pull','Cable','strength','small',['Rear Delts','Upper Back'],['Rotator Cuff'],{weightSource:'machine'})
];

function ex(id,name,equipment,mode,restType,primary,secondary,extra={}){return {id,name,equipment,mode,restType,primary,secondary,custom:false,...extra};}

const ALIASES={
  bench:'smith_bench',incline:'incline_smith',tib:'tib_bar',pullup:'pullup',deadhang:'deadhang',goblet:'goblet_squat',rdl:'kb_rdl',stepdown:'stepdown',legcurl:'seated_leg_curl',legext:'leg_extension',revlunge:'reverse_lunge',calf:'calf_raise',row:'one_arm_bent_row',dip:'dip_machine',curl:'preacher_curl',triceps:'triceps_extension',lateral:'lateral_raise',rear:'rear_delt_fly'
};
const mapId=id=>ALIASES[id]||id;

const defaultTemplates={
  A:{id:'A',name:'Workout A',supersets:[
    {id:'A_ss1',name:'SS1',exerciseIds:['smith_bench','pullup','seated_leg_curl','tib_bar','deadhang']},
    {id:'A_ss2',name:'SS2',exerciseIds:['goblet_squat','one_arm_bent_row','dip_machine']},
    {id:'A_ss3',name:'SS3',exerciseIds:['incline_smith','preacher_curl','calf_raise','kb_swing']},
    {id:'A_ss4',name:'SS4',exerciseIds:['rear_delt_fly','lateral_raise','leg_extension','pullover']},
    {id:'A_finish',name:'FINISH',exerciseIds:['plank','stepdown','farmer_carry','incline_treadmill']}
  ],favorites:[],rest:[]},
  B:{id:'B',name:'Workout B',supersets:[
    {id:'B_ss1',name:'SS1',exerciseIds:['pushup','pullup','tib_bar','reverse_lunge','deadhang']},
    {id:'B_ss2',name:'SS2',exerciseIds:['one_arm_bent_row','triceps_extension','seated_leg_curl']},
    {id:'B_ss3',name:'SS3',exerciseIds:['smith_bench','preacher_curl','calf_raise','barbell_rdl']},
    {id:'B_ss4',name:'SS4',exerciseIds:['rear_delt_fly','lateral_raise','leg_extension','pullover','shrugs']},
    {id:'B_finish',name:'FINISH',exerciseIds:['plank','stepdown','suitcase_carry','incline_treadmill']}
  ],favorites:[],rest:[]}
};

const freshState=()=>({version:APP_VERSION,settings:{bodyweight:238.3,restDefaults:{heavy:240,compound:150,accessory:90,small:60,skill:90,core:120,cardio:0},theme:'dark'},exercises:clone(builtins),templates:clone(defaultTemplates),workouts:[],active:null});

let state=loadState();
let currentView='home';
let templateTab='A';
let historyRange='30';
let currentHistoryWorkoutId=null;
let logger={exerciseId:null,editScope:null,workoutId:null,entryId:null,setType:'Working',quickNote:''};
let pickerContext=null;
let supersetMoveContext=null;
let customReturnContext=null;
let sessionTimer=null;
let dragCtx=null;

function toast(msg){const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),1700);}
function saveState(){state.version=APP_VERSION;localStorage.setItem(STORE_KEY,JSON.stringify(state));}
function exercise(id){return state.exercises.find(e=>e.id===id);}
function restTarget(e){if(!e)return 0;if(e.restOverride!=null)return Number(e.restOverride);return Number(state.settings.restDefaults[e.restType]??90);}

function loadState(){
  const rawText=localStorage.getItem(STORE_KEY);
  if(!rawText)return freshState();
  // Keep an untouched safety copy of the pre-upgrade database before migration.
  try{if(!localStorage.getItem(LEGACY_SAFETY_KEY))localStorage.setItem(LEGACY_SAFETY_KEY,rawText);}catch{}
  try{
    const raw=JSON.parse(rawText);
    return migrateState(raw);
  }catch(err){
    console.error('Gym Logger migration failed',err);
    // Do not overwrite STORE_KEY here. The original database remains available for restore/retry.
    return freshState();
  }
}

function migrateState(old){
  const s=freshState();
  s.settings={...s.settings,...(old.settings||{})};
  s.settings.restDefaults={...s.settings.restDefaults,...(old.settings?.restDefaults||{})};
  if(old.ui?.theme&&!old.settings?.theme)s.settings.theme=old.ui.theme;

  const customOld=(old.exercises||[]).filter(e=>!builtins.some(b=>b.id===mapId(e.id))&&!ALIASES[e.id]).map(e=>({...e,id:mapId(e.id),custom:true,mode:e.mode||'strength',restType:e.restType||e.type||'accessory'}));
  s.exercises=[...clone(builtins),...customOld];
  // Preserve user edits to built-ins where the fields are compatible.
  (old.exercises||[]).forEach(oe=>{
    const target=s.exercises.find(e=>e.id===mapId(oe.id));if(!target)return;
    ['restOverride','rest','primary','secondary','equipment'].forEach(k=>{if(oe[k]!=null)target[k==='rest'?'restOverride':k]=clone(oe[k]);});
  });

  s.workouts=(old.workouts||[]).map(w=>migrateWorkout(w));
  // V0.3 intentionally installs the newly specified Full A / Full B layouts once when upgrading from older builds.
  s.templates=String(old.version||'').startsWith('0.3')?migrateTemplates(old.templates||{}):clone(defaultTemplates);
  s.active=old.active?migrateActive(old.active):null;
  return s;
}

function migrateWorkout(w){
  const sets=(w.sets||w.entries||[]).map(z=>migrateEntry(z));
  return {id:w.id||uid('wo'),template:w.template||'',title:w.title||'Workout',startedAt:w.startedAt||nowIso(),endedAt:w.endedAt||nowIso(),sessionFocus:w.sessionFocus||'',notes:w.notes||'',sets};
}
function migrateEntry(z){
  const exId=mapId(z.exerciseId);
  const seed=exerciseSeed(exId);
  const out={id:z.id||uid('set'),exerciseId:exId,timestamp:z.timestamp||nowIso(),mode:z.mode||seed?.mode||'strength',setType:z.setType||'Working',rir:z.rir??'',quickNote:z.quickNote||'',note:z.note||'',weight:number(z.weight),reps:number(z.reps),negatives:number(z.negatives),partials:number(z.partials),holdSeconds:number(z.holdSeconds),assist:number(z.assist),...clone(z),exerciseId:exId};
  // V0.1 Deadhang was logged through the reps wheel; V0.2 uses duration.
  if(exId==='deadhang'&&!number(out.durationSeconds)&&!number(out.holdSeconds)&&number(out.reps)){
    out.durationSeconds=number(out.reps);out.holdSeconds=number(out.reps);
  }
  // V0.1 Stepdown had no dedicated step-height field; treadmill is the agreed baseline.
  if(exId==='stepdown'&&!out.stepHeight)out.stepHeight='Treadmill';
  if(out.setType==='Top set')out.setType='Top Set';
  if(out.setType==='Tempo')out.setType='Slow Eccentric';
  return out;
}
function migrateTemplates(t){
  const out=clone(defaultTemplates);
  ['A','B'].forEach(k=>{
    const old=t[k];if(!old)return;
    if(Array.isArray(old)){
      const ids=unique(old.map(mapId));
      out[k]={id:k,name:`Workout ${k}`,supersets:[],favorites:ids.filter(id=>exerciseSeed(id)?.restType==='heavy'||exerciseSeed(id)?.restType==='compound').slice(0,6),rest:ids.filter(id=>!ids.filter(x=>exerciseSeed(x)?.restType==='heavy'||exerciseSeed(x)?.restType==='compound').slice(0,6).includes(id))};
    }else{
      out[k]={id:k,name:old.name||`Workout ${k}`,supersets:(old.supersets||[]).map((ss,i)=>({id:ss.id||`${k}_ss${i+1}`,name:ss.name||`Superset ${i+1}`,exerciseIds:unique((ss.exerciseIds||[]).map(mapId))})),favorites:unique((old.favorites||[]).map(mapId)),rest:unique((old.rest||[]).map(mapId))};
    }
  });
  return out;
}
function exerciseSeed(id){return builtins.find(e=>e.id===id);}
function migrateActive(a){
  if(a.layout)return {...a,sets:(a.sets||[]).map(migrateEntry),targetSets:{...(a.targetSets||{})}};
  const items=a.items||[];const ss={id:'live_ss1',name:'Superset 1',exerciseIds:[]},favorites=[],rest=[],done=[],homeSections={};
  items.sort((x,y)=>(x.order||0)-(y.order||0)).forEach(i=>{const id=mapId(i.exerciseId);homeSections[id]=i.favorite?'favorites':'rest';if(i.done)done.push(id);else if(i.inSuperset)ss.exerciseIds.push(id);else if(i.favorite)favorites.push(id);else rest.push(id);});
  return {id:a.id||uid('wo'),template:a.template||'',title:a.title||'Workout',startedAt:a.startedAt||nowIso(),sessionFocus:a.sessionFocus||'',notes:a.notes||'',sets:(a.sets||[]).map(migrateEntry),targetSets:{...(a.targetSets||{})},layout:{supersets:ss.exerciseIds.length?[ss]:[],favorites,rest,done,homeSections,lastSections:{}}};
}

function showView(name){
  currentView=name;document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));document.getElementById(`${name}View`)?.classList.add('active');
  if(name==='home')renderHome();if(name==='workout')renderWorkout();if(name==='history')renderHistory();if(name==='templates')renderTemplates();if(name==='settings')renderSettings();window.scrollTo(0,0);
}
function openSheet(id){document.querySelectorAll('.sheet').forEach(s=>s.classList.add('hidden'));document.getElementById('scrim').classList.remove('hidden');document.getElementById(id).classList.remove('hidden');}
function closeSheets(){document.getElementById('scrim').classList.add('hidden');document.querySelectorAll('.sheet').forEach(s=>s.classList.add('hidden'));}

function templateToLayout(template){
  const t=clone(template);const homeSections={};
  t.favorites.forEach(id=>homeSections[id]='favorites');t.rest.forEach(id=>homeSections[id]='rest');t.supersets.forEach(ss=>ss.exerciseIds.forEach(id=>homeSections[id]=homeSections[id]||'favorites'));
  return {supersets:t.supersets,favorites:t.favorites,rest:t.rest,done:[],homeSections,lastSections:{}};
}
function targetSpec(exId,templateId=state.active?.template){return {...(EXERCISE_TARGETS[exId]||{}),...(TEMPLATE_TARGET_OVERRIDES[templateId]?.[exId]||{})};}
function defaultTargetSets(exId,templateId=state.active?.template){const n=targetSpec(exId,templateId).sets;return Number.isFinite(Number(n))?Number(n):null;}
function currentTargetSets(exId){if(!state.active)return null;state.active.targetSets=state.active.targetSets||{};if(Object.prototype.hasOwnProperty.call(state.active.targetSets,exId))return state.active.targetSets[exId];return defaultTargetSets(exId,state.active.template);}
function workingEntries(exId){return (state.active?.sets||[]).filter(s=>s.exerciseId===exId&&(s.setType||'Working').toLowerCase()!=='warmup');}
function targetProgress(exId){const target=currentTargetSets(exId);if(target==null)return null;const spec=targetSpec(exId);if(exId==='suitcase_carry'&&spec.perSide){let left=0,right=0;workingEntries(exId).forEach(s=>{if(s.side==='Left')left++;else if(s.side==='Right')right++;else{left++;right++;}});const over=Math.max(0,Math.min(left,right)-target);const met=left>=target&&right>=target;return {target,done:Math.min(left,right),text:`L ${left}/${target} • R ${right}/${target}${over?` • +${over} over`:met?' • target met':''}`,met,over};}const done=workingEntries(exId).length,over=Math.max(0,done-target),left=Math.max(0,target-done);return {target,done,text:over?`${done} / ${target} complete • +${over} over`:left?`${done} / ${target} complete • ${left} to go`:`${done} / ${target} complete • target met`,met:done>=target,over};}
function prescriptionText(exId){const spec=targetSpec(exId),parts=[];if(spec.sets!=null)parts.push(`${spec.sets}${spec.perSide?' / side':''} sets`);if(spec.reps)parts.push(spec.reps);if(spec.work)parts.push(spec.work);return parts.join(' • ');}
function startWorkout(templateId){
  if(state.active){showView('workout');toast('Workout already active');return;}
  const isBlank=templateId==='blank';const t=isBlank?{id:'blank',name:'Blank Workout',supersets:[],favorites:[],rest:[]}:state.templates[templateId];
  const ids=isBlank?[]:unique([...t.supersets.flatMap(ss=>ss.exerciseIds),...t.favorites,...t.rest]);const targetSets={};ids.forEach(id=>targetSets[id]=defaultTargetSets(id,templateId));
  state.active={id:uid('wo'),template:templateId,title:isBlank?'Blank Workout':t.name,startedAt:nowIso(),endedAt:null,sessionFocus:'',notes:'',sets:[],targetSets,layout:templateToLayout(t)};
  saveState();showView('workout');startClock();
}
function startClock(){clearInterval(sessionTimer);sessionTimer=setInterval(()=>{if(!state.active)return;document.getElementById('sessionClock').textContent=fmtDuration((Date.now()-new Date(state.active.startedAt))/1000);updateRecoveryOnly();},1000);}

function renderHome(){
  const resume=document.getElementById('resumeCard');if(state.active){resume.classList.remove('hidden');resume.innerHTML=`<strong>Workout in progress</strong><p>${esc(state.active.title)} • ${state.active.sets.length} entries • ${fmtDuration((Date.now()-new Date(state.active.startedAt))/1000)}</p><button class="primary full" id="resumeWorkoutBtn">Resume workout</button>`;}else resume.classList.add('hidden');
  const ws=[...state.workouts].sort((a,b)=>new Date(b.startedAt)-new Date(a.startedAt)).slice(0,5);document.getElementById('recentWorkouts').innerHTML=ws.length?ws.map(w=>`<button class="recent-card recent-button" data-history-workout="${w.id}"><strong>${esc(w.title)}</strong><div class="meta">${fmtDate(w.startedAt)} • ${w.sets.length} entries • ${fmtDuration((new Date(w.endedAt)-new Date(w.startedAt))/1000)}</div></button>`).join(''):'<div class="recent-card"><strong>No saved workouts yet</strong><div class="meta">Your first finished session will appear here.</div></div>';
}

function allActiveIds(){if(!state.active)return[];const l=state.active.layout;return unique([...l.supersets.flatMap(s=>s.exerciseIds),...l.favorites,...l.rest,...l.done]);}
function removeActiveId(id){const l=state.active.layout;l.supersets.forEach(ss=>ss.exerciseIds=ss.exerciseIds.filter(x=>x!==id));l.favorites=l.favorites.filter(x=>x!==id);l.rest=l.rest.filter(x=>x!==id);l.done=l.done.filter(x=>x!==id);}
function activeSectionKey(id){const l=state.active.layout;for(const ss of l.supersets)if(ss.exerciseIds.includes(id))return `ss:${ss.id}`;if(l.favorites.includes(id))return'favorites';if(l.rest.includes(id))return'rest';if(l.done.includes(id))return'done';return null;}
function addActiveExercise(id,target='rest'){if(allActiveIds().includes(id))return;state.active.targetSets=state.active.targetSets||{};if(!Object.prototype.hasOwnProperty.call(state.active.targetSets,id))state.active.targetSets[id]=defaultTargetSets(id,state.active.template);state.active.layout.homeSections[id]=target==='favorites'?'favorites':'rest';state.active.layout[target==='favorites'?'favorites':'rest'].push(id);saveState();renderWorkout();}
function moveActiveToSuperset(id,ssId){const l=state.active.layout;const prev=activeSectionKey(id);if(prev&&prev!=='done')l.lastSections[id]=prev;removeActiveId(id);l.supersets.find(s=>s.id===ssId)?.exerciseIds.push(id);saveState();renderWorkout();}
function removeActiveFromSuperset(id){const l=state.active.layout;removeActiveId(id);const home=l.homeSections[id]||'rest';l[home].push(id);saveState();renderWorkout();}
function toggleActiveFavorite(id){const l=state.active.layout;const cur=activeSectionKey(id);const next=l.homeSections[id]==='favorites'?'rest':'favorites';l.homeSections[id]=next;if(cur==='favorites'||cur==='rest'){removeActiveId(id);l[next].push(id);}saveState();renderWorkout();}
function markDone(id){const l=state.active.layout;const prev=activeSectionKey(id);l.lastSections[id]=prev;removeActiveId(id);l.done.push(id);saveState();renderWorkout();}
function reactivate(id){const l=state.active.layout;removeActiveId(id);let key=l.lastSections[id]||l.homeSections[id]||'rest';if(key.startsWith('ss:')){const ss=l.supersets.find(s=>s.id===key.slice(3));if(ss){ss.exerciseIds.push(id);saveState();renderWorkout();return;}}l[l.homeSections[id]||'rest'].push(id);saveState();renderWorkout();}
function addLiveSuperset(){const l=state.active.layout;const n=l.supersets.length+1;l.supersets.push({id:uid('ss'),name:`Superset ${n}`,exerciseIds:[]});saveState();renderWorkout();}
function deleteLiveSuperset(ssId){const l=state.active.layout;const i=l.supersets.findIndex(s=>s.id===ssId);if(i<0)return;const ss=l.supersets[i];ss.exerciseIds.forEach(id=>{const home=l.homeSections[id]||'rest';l[home].push(id);});l.supersets.splice(i,1);saveState();renderWorkout();}

function renderWorkout(){
  if(!state.active){showView('home');return;}
  document.getElementById('workoutTitle').textContent=state.active.title;document.getElementById('workoutTemplateLabel').textContent=state.active.template==='blank'?'FREE WORKOUT':`TEMPLATE ${state.active.template}`;document.getElementById('sessionClock').textContent=fmtDuration((Date.now()-new Date(state.active.startedAt))/1000);document.getElementById('sessionFocusInput').value=state.active.sessionFocus||'';
  renderMuscles();
  const ssWrap=document.getElementById('supersetSections');ssWrap.innerHTML=state.active.layout.supersets.map((ss,i)=>`<div class="superset-box"><div class="superset-head"><div><div class="eyebrow">CURRENT SUPERSET</div><h3>${esc(ss.name)}</h3></div><div class="superset-actions"><button class="mini-btn" data-add-to-live-ss="${ss.id}">+ Exercise</button><button class="mini-btn danger-text" data-delete-live-ss="${ss.id}">Delete</button></div></div><div class="exercise-list sortable-list" data-section-key="ss:${ss.id}">${renderExerciseCards(ss.exerciseIds,`ss:${ss.id}`)}</div></div>`).join('');
  document.getElementById('favoriteList').innerHTML=renderExerciseCards(state.active.layout.favorites,'favorites');document.getElementById('restList').innerHTML=renderExerciseCards(state.active.layout.rest,'rest');document.getElementById('doneList').innerHTML=renderExerciseCards(state.active.layout.done,'done');bindDragHandles();
}
function renderExerciseCards(ids,section){if(!ids.length)return'<div class="empty-box">Nothing here.</div>';return ids.map(id=>exerciseCard(id,section)).join('');}
function exerciseCard(id,section){
  const e=exercise(id);if(!e)return'';const last=lastActiveEntry(id);const rec=recoveryStatus(id);const prog=targetProgress(id);const rx=prescriptionText(id);const inDone=section==='done',inSS=section.startsWith('ss:');const starred=state.active.layout.homeSections[id]==='favorites';
  return `<div class="exercise-card" data-exercise-id="${id}"><div class="drag-handle" data-drag-handle title="Drag inside this section">≡</div><div><div class="exercise-name">${esc(e.name)}</div><div class="exercise-meta">${esc(e.equipment)} • ${restLabel(e)}</div>${rx?`<div class="target-rx">Target: ${esc(rx)}</div>`:''}${prog?`<div class="target-progress ${prog.over?'over':prog.met?'met':''}">${esc(prog.text)}</div>`:''}${last?`<div class="last-line">${esc(formatEntry(last,e))}</div>`:''}${!inDone?`<div class="recovery ${rec.wait?'wait':''}" data-recovery-id="${id}">${esc(rec.text)}</div>`:''}</div><div class="card-actions">${inDone?`<button class="mini-btn" data-reactivate="${id}">Reactivate</button>`:`<button class="log-btn" data-log="${id}">LOG</button><button class="mini-btn ${starred?'active':''}" data-favorite="${id}" title="Favorite">${starred?'★':'☆'}</button>${inSS?`<button class="mini-btn" data-remove-ss="${id}">−SS</button><button class="mini-btn" data-move-ss="${id}">Move</button>`:`<button class="mini-btn" data-move-ss="${id}">+SS</button>`}<button class="mini-btn" data-done="${id}">Done</button>`}</div></div>`;
}
function restLabel(e){const r=restTarget(e);return r?`${fmtDuration(r)} recovery`:'No recovery timer';}
function lastActiveEntry(id){if(!state.active)return null;const a=state.active.sets.filter(s=>s.exerciseId===id).sort((x,y)=>new Date(x.timestamp)-new Date(y.timestamp));return a[a.length-1]||null;}
function recoveryStatus(id){const e=exercise(id),r=restTarget(e);if(!r)return{text:'NO TIMER',wait:false};const last=lastActiveEntry(id);if(!last)return{text:'READY',wait:false};const elapsed=(Date.now()-new Date(last.timestamp))/1000;if(elapsed>=r)return{text:`READY • ${fmtDuration(elapsed)} since last`,wait:false};return{text:`RECOVERING • ${fmtDuration(r-elapsed)} left`,wait:true};}
function updateRecoveryOnly(){if(currentView!=='workout'||!state.active)return;document.querySelectorAll('[data-recovery-id]').forEach(el=>{const r=recoveryStatus(el.dataset.recoveryId);el.textContent=r.text;el.classList.toggle('wait',r.wait);});}

function renderMuscles(){const m={};if(state.active)state.active.sets.forEach(s=>{if((s.setType||'Working').toLowerCase()==='warmup')return;const e=exercise(s.exerciseId);if(!e)return;(e.primary||[]).forEach(x=>m[x]=(m[x]||0)+1);(e.secondary||[]).forEach(x=>m[x]=(m[x]||0)+.5);});const rows=Object.entries(m).sort((a,b)=>b[1]-a[1]);document.getElementById('muscleCounter').innerHTML=rows.length?rows.slice(0,9).map(([k,v])=>`<span class="muscle-pill">${esc(k)} <b>${v.toFixed(v%1?1:0)}</b></span>`).join(''):'<span class="subtle">No working sets logged yet.</span>';document.getElementById('muscleDetail').innerHTML=rows.map(([k,v])=>`<div>${esc(k)}</div><strong>${v.toFixed(v%1?1:0)}</strong>`).join('');}

function bindDragHandles(){document.querySelectorAll('[data-drag-handle]').forEach(h=>{h.onpointerdown=startDrag;});}
function startDrag(ev){const card=ev.currentTarget.closest('.exercise-card,.template-row');const list=card?.closest('.sortable-list');if(!card||!list||list.querySelector('.empty-box'))return;ev.preventDefault();ev.currentTarget.setPointerCapture?.(ev.pointerId);dragCtx={card,list,pointerId:ev.pointerId};card.classList.add('dragging');document.addEventListener('pointermove',dragMove,{passive:false});document.addEventListener('pointerup',endDrag,{once:true});}
function dragMove(ev){if(!dragCtx)return;ev.preventDefault();const under=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.exercise-card,.template-row');if(!under||under===dragCtx.card||under.parentElement!==dragCtx.list)return;const rect=under.getBoundingClientRect();dragCtx.list.insertBefore(dragCtx.card,ev.clientY<rect.top+rect.height/2?under:under.nextSibling);}
function endDrag(){if(!dragCtx)return;dragCtx.card.classList.remove('dragging');const key=dragCtx.list.dataset.sectionKey;const ids=[...dragCtx.list.querySelectorAll('[data-exercise-id]')].map(x=>x.dataset.exerciseId);if(dragCtx.list.dataset.template==='1')setTemplateSectionOrder(templateTab,key,ids);else setActiveSectionOrder(key,ids);dragCtx=null;document.removeEventListener('pointermove',dragMove);}
function setActiveSectionOrder(key,ids){if(!state.active)return;if(key==='favorites'||key==='rest'||key==='done')state.active.layout[key]=ids;else if(key.startsWith('ss:')){const ss=state.active.layout.supersets.find(s=>s.id===key.slice(3));if(ss)ss.exerciseIds=ids;}saveState();}
function setTemplateSectionOrder(tab,key,ids){const t=state.templates[tab];if(key==='favorites'||key==='rest')t[key]=ids;else if(key.startsWith('ss:')){const ss=t.supersets.find(s=>s.id===key.slice(3));if(ss)ss.exerciseIds=ids;}saveState();}
function weightOptions(source='generic',max=500){
  if(source==='kb')return KB_WEIGHTS;
  if(source==='db')return Array.from({length:21},(_,i)=>i*5);
  if(source==='machine')return Array.from({length:81},(_,i)=>i*5);
  if(source==='bodyweight')return Array.from({length:21},(_,i)=>i*5);
  if(source==='barbell'){const a=[];for(let x=0;x<=20;x+=2.5)a.push(x);for(let x=25;x<=max;x+=5)a.push(x);return a;}
  return Array.from({length:101},(_,i)=>i*5);
}
function selectHtml(id,label,values,value,formatter=x=>x){return `<label>${label}<select id="${id}">${values.map(v=>`<option value="${v}" ${String(v)===String(value)?'selected':''}>${formatter(v)}</option>`).join('')}</select></label>`;}
function numberHtml(id,label,value,step=1,min=0,placeholder=''){return `<label>${label}<input id="${id}" type="number" value="${value??''}" step="${step}" min="${min}" placeholder="${placeholder}" /></label>`;}
function durationFields(seconds=0,prefix='dur'){return `${numberHtml(`${prefix}Min`,'Min',Math.floor(number(seconds)/60),1,0)}${numberHtml(`${prefix}Sec`,'Sec',number(seconds)%60,1,0)}`;}
function readDuration(prefix='dur'){return number(document.getElementById(`${prefix}Min`)?.value)*60+number(document.getElementById(`${prefix}Sec`)?.value);}

function previousWorkoutEntry(exId){const ws=[...state.workouts].sort((a,b)=>new Date(b.startedAt)-new Date(a.startedAt));for(const w of ws){const entries=w.sets.filter(s=>s.exerciseId===exId);if(entries.length)return entries[entries.length-1];}return null;}
function entryByEditRef(){if(!logger.entryId)return null;if(logger.editScope==='active')return state.active?.sets.find(s=>s.id===logger.entryId)||null;if(logger.editScope==='history'){const w=state.workouts.find(w=>w.id===logger.workoutId);return w?.sets.find(s=>s.id===logger.entryId)||null;}return null;}
function openLogger(exId,edit=null){
  const e=exercise(exId);if(!e)return;logger={exerciseId:exId,editScope:edit?.scope||null,workoutId:edit?.workoutId||null,entryId:edit?.entryId||null,setType:'Working',quickNote:''};
  const existing=entryByEditRef();if(existing){logger.exerciseId=existing.exerciseId;logger.setType=existing.setType||'Working';logger.quickNote=existing.quickNote||'';}
  document.getElementById('sheetSub').textContent=existing?'EDIT ENTRY':'LOG ENTRY';document.getElementById('sheetTitle').textContent=exercise(logger.exerciseId)?.name||'Exercise';
  document.getElementById('editExerciseWrap').classList.toggle('hidden',!existing);const editSel=document.getElementById('editExerciseSelect');editSel.innerHTML=state.exercises.map(x=>`<option value="${x.id}" ${x.id===logger.exerciseId?'selected':''}>${esc(x.name)}</option>`).join('');
  renderLoggerFields(existing);renderTodayEntries();document.getElementById('deleteEntryBtn').classList.toggle('hidden',!existing);document.getElementById('saveEntryBtn').textContent=existing?'SAVE CHANGES ✓':'LOG ✓';openSheet('logSheet');
}
function renderLoggerFields(existing=null){
  const e=exercise(logger.exerciseId);if(!e)return;document.getElementById('sheetTitle').textContent=e.name;const seed=existing||lastActiveEntry(e.id)||previousWorkoutEntry(e.id)||{};const f=document.getElementById('logFields');let html='';const spec=targetSpec(e.id);if(state.active&&logger.editScope!=='history'){const target=currentTargetSets(e.id);html+=`<div class="target-editor"><div><strong>Today's set target</strong><small>Starting target only — autoregulate freely.</small></div><input id="fTargetSets" type="number" min="0" step="1" value="${target??''}" placeholder="N/A" /></div>${(prescriptionText(e.id)||spec.note)?`<div class="target-guidance">${prescriptionText(e.id)?`<strong>Prescription:</strong> ${esc(prescriptionText(e.id))} • Rest ${esc(restLabel(e).replace(' recovery',''))}`:''}${spec.note?`<small>${esc(spec.note)}</small>`:''}</div>`:''}`;}
  switch(e.mode){
    case 'strength':{
      const ws=weightOptions(e.weightSource||'generic');html+=`<div class="field-grid">${selectHtml('fWeight','Weight (lb)',ws,seed.weight??ws[0])}${numberHtml('fReps',e.perSide?'Reps / side':'Reps',seed.reps??10,1,0)}${selectHtml('fRir','RIR',RIR_VALUES,seed.rir||'2')}</div>`;
      break;
    }
    case 'bodyweight':{
      html+=`<div class="field-grid">${selectHtml('fWeight','Added lb',weightOptions('bodyweight'),seed.weight??0)}${numberHtml('fReps',e.perSide?'Reps / side':'Reps',seed.reps??5,1,0)}${selectHtml('fRir','RIR',RIR_VALUES,seed.rir||'2')}</div>`;
      if(e.special?.includes('negatives')||e.id==='pullup')html+=`<div class="field-grid two">${numberHtml('fNegatives','Negatives',seed.negatives??0,1,0)}${numberHtml('fHold','Top hold sec',seed.holdSeconds??0,1,0)}</div>`;
      break;
    }
    case 'assisted':html+=`<div class="field-grid">${selectHtml('fAssist','Assistance lb',Array.from({length:61},(_,i)=>i*5),seed.assist??70)}${numberHtml('fReps','Reps',seed.reps??8,1,0)}${selectHtml('fRir','RIR',RIR_VALUES,seed.rir||'2')}</div>`;break;
    case 'hold':html+=`<div class="field-grid">${selectHtml('fWeight','Added lb',weightOptions('bodyweight'),seed.weight??0)}${durationFields(seed.durationSeconds||seed.holdSeconds||30)}${selectHtml('fRir','RIR',RIR_VALUES,seed.rir||'3')}</div>`;break;
    case 'plank':html+=`<div class="field-grid">${selectHtml('fWeight','Added lb',VEST_WEIGHTS,seed.weight??0)}${durationFields(seed.durationSeconds||seed.holdSeconds||60)}${selectHtml('fRir','RIR',RIR_VALUES,seed.rir||'3')}</div>`;break;
    case 'plankpull':html+=`<div class="field-grid">${selectHtml('fWeight','Weight lb',weightOptions(e.weightSource||'generic'),seed.weight??25)}${numberHtml('fReps','Pull-through reps',seed.reps??10,1,0)}${selectHtml('fRir','RIR',RIR_VALUES,seed.rir||'2')}</div><div class="field-grid two">${durationFields(seed.durationSeconds||60,'up')}</div>`;break;
    case 'stepdown':html+=`<div class="field-grid four">${selectHtml('fWeight','Added lb',VEST_WEIGHTS,seed.weight??0)}${numberHtml('fReps','Reps / side',seed.reps??10,1,0)}${selectHtml('fStepHeight','Step height',STEP_HEIGHTS,seed.stepHeight||'Treadmill')}${selectHtml('fRir','RIR',RIR_VALUES,seed.rir||'3')}</div>`;break;
    case 'pushup':html+=`<div class="field-grid four">${selectHtml('fWeight','Added lb',VEST_WEIGHTS,seed.weight??0)}${numberHtml('fReps','Reps',seed.reps??10,1,0)}${selectHtml('fStyle','Style',PUSH_STYLES,seed.style||'Normal')}${selectHtml('fSetup','Setup',PUSH_SETUPS,seed.setup||'Flat')}</div><div class="field-grid two">${selectHtml('fRir','RIR',RIR_VALUES,seed.rir||'2')}</div>`;break;
    case 'carry':html=carryFields(e,seed);break;
    case 'treadmill':html=treadmillFields(e,seed);break;
    case 'runwalk':html=runWalkFields(seed);break;
    case 'sled':html+=`<div class="field-grid four">${numberHtml('fWeight','Sled lb',seed.weight??0,5,0)}${numberHtml('fDistance','Distance ft',seed.distanceFt??100,1,0)}${selectHtml('fDirection','Direction',SLED_DIRECTIONS,seed.direction||'Forward')}${durationFields(seed.durationSeconds||0)}</div>`;break;
    default:html+=`<div class="field-grid">${numberHtml('fWeight','Weight',seed.weight??0,5,0)}${numberHtml('fReps','Reps',seed.reps??10,1,0)}${selectHtml('fRir','RIR',RIR_VALUES,seed.rir||'2')}</div>`;
  }
  f.innerHTML=html;renderCommonFields(existing);
}
function carryFields(e,seed){
  const loadType=seed.loadType||'KB';const weights=loadType==='KB'?KB_WEIGHTS:loadType==='DB'?CARRY_DB_WEIGHTS:VEST_WEIGHTS.filter(x=>x>0);
  return `<div class="field-grid four">${selectHtml('fLoadType','Load type',['KB','DB','Vest'],loadType)}${selectHtml('fCarryWeight',e.carryType==='farmer'?'Weight / hand':'Carry weight',weights,seed.carryWeight??weights[0])}${selectHtml('fVest','Vest add-on',VEST_WEIGHTS,seed.vestWeight??0)}${numberHtml('fDistance','Distance ft',seed.distanceFt??100,1,0)}</div><div class="field-grid two">${durationFields(seed.durationSeconds||0)}${e.carryType==='suitcase'?selectHtml('fSide','Side',['Left','Right','Both sequential'],seed.side||'Both sequential'):''}</div>`;
}
function treadmillFields(e,seed){return `<div class="field-grid four">${numberHtml('fSpeed','Speed mph',seed.speed??(e.id==='treadmill_run'?6:3),0.1,0)}${numberHtml('fIncline','Incline %',seed.incline??0,0.5,0)}${durationFields(seed.durationSeconds||1200)}${selectHtml('fVest','Vest lb',VEST_WEIGHTS,seed.vestWeight??0)}</div><div class="field-grid four">${numberHtml('fDistanceMiles','Distance mi',seed.distanceMiles??'',0.01,0,'auto')}${numberHtml('fCalories','Calories',seed.calories??'',1,0,'optional')}${numberHtml('fAvgHr','Avg HR',seed.avgHr??'',1,0,'optional')}${numberHtml('fMaxHr','Max HR',seed.maxHr??'',1,0,'optional')}</div>`;}
function runWalkFields(seed){return `<div class="panel"><strong>Run segment</strong><div class="field-grid four">${numberHtml('fRunSpeed','Run mph',seed.runSpeed??6.2,0.1,0)}${numberHtml('fRunIncline','Incline %',seed.runIncline??0,0.5,0)}${durationFields(seed.runSeconds||90,'run')}</div></div><div class="panel"><strong>Walk segment</strong><div class="field-grid four">${numberHtml('fWalkSpeed','Walk mph',seed.walkSpeed??3,0.1,0)}${numberHtml('fWalkIncline','Incline %',seed.walkIncline??0,0.5,0)}${durationFields(seed.walkSeconds||90,'walk')}</div></div><div class="field-grid four">${numberHtml('fCycles','Cycles',seed.cycles??10,1,1)}${selectHtml('fVest','Vest lb',VEST_WEIGHTS,seed.vestWeight??0)}${numberHtml('fDistanceMiles','Distance mi',seed.distanceMiles??'',0.01,0,'auto')}${numberHtml('fCalories','Calories',seed.calories??'',1,0,'optional')}</div>`;}
function renderCommonFields(existing){
  document.getElementById('setTypeTags').innerHTML=SET_TYPES.map(x=>`<button class="tag-btn ${x===(existing?.setType||logger.setType)?'active':''}" data-set-type="${x}">${x}</button>`).join('');
  document.getElementById('quickNotes').innerHTML=QUICK_NOTES.map(x=>`<button class="tag-btn ${x===(existing?.quickNote||logger.quickNote)?'active':''}" data-quick-note="${x}">${x}</button>`).join('');
  logger.setType=existing?.setType||logger.setType||'Working';logger.quickNote=existing?.quickNote||logger.quickNote||'';document.getElementById('setNoteInput').value=existing?.note||'';
}
function renderTodayEntries(){const box=document.getElementById('todayEntriesList');if(!state.active){box.innerHTML='<div class="empty-box">Completed workout entry.</div>';return;}const entries=state.active.sets.filter(s=>s.exerciseId===logger.exerciseId).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));box.innerHTML=entries.length?entries.map(s=>`<div class="logged-set-row"><div><strong>${esc(formatEntry(s,exercise(s.exerciseId)))}</strong><small>${fmtClock(s.timestamp)}${s.note?` • ${esc(s.note)}`:''}</small></div><button class="mini-btn" data-edit-active-entry="${s.id}">Edit</button></div>`).join(''):'<div class="empty-box">No entries for this exercise yet.</div>';}
function readLoggerEntry(){
  const e=exercise(logger.exerciseId),base=entryByEditRef()||{};const out={...base,id:base.id||uid('set'),exerciseId:e.id,mode:e.mode,timestamp:base.timestamp||nowIso(),setType:logger.setType||'Working',rir:document.getElementById('fRir')?.value||'',quickNote:logger.quickNote||'',note:document.getElementById('setNoteInput').value.trim()};
  if(base.exerciseId&&base.exerciseId!==e.id){['weight','reps','negatives','partials','holdSeconds','durationSeconds','assist','stepHeight','style','setup','loadType','carryWeight','vestWeight','distanceFt','side','speed','incline','distanceMiles','calories','avgHr','maxHr','runSpeed','runIncline','runSeconds','walkSpeed','walkIncline','walkSeconds','cycles','direction'].forEach(k=>delete out[k]);}
  const val=id=>number(document.getElementById(id)?.value);
  switch(e.mode){
    case'strength':out.weight=val('fWeight');out.reps=val('fReps');break;
    case'bodyweight':out.weight=val('fWeight');out.reps=val('fReps');out.negatives=val('fNegatives');out.holdSeconds=val('fHold');break;
    case'assisted':out.assist=val('fAssist');out.reps=val('fReps');break;
    case'hold':case'plank':out.weight=val('fWeight');out.durationSeconds=readDuration();out.holdSeconds=out.durationSeconds;break;
    case'plankpull':out.weight=val('fWeight');out.reps=val('fReps');out.durationSeconds=readDuration('up');break;
    case'stepdown':out.weight=val('fWeight');out.reps=val('fReps');out.stepHeight=document.getElementById('fStepHeight').value;break;
    case'pushup':out.weight=val('fWeight');out.reps=val('fReps');out.style=document.getElementById('fStyle').value;out.setup=document.getElementById('fSetup').value;break;
    case'carry':out.loadType=document.getElementById('fLoadType').value;out.carryWeight=val('fCarryWeight');out.vestWeight=val('fVest');out.distanceFt=val('fDistance');out.durationSeconds=readDuration();if(document.getElementById('fSide'))out.side=document.getElementById('fSide').value;break;
    case'treadmill':out.speed=val('fSpeed');out.incline=val('fIncline');out.durationSeconds=readDuration();out.vestWeight=val('fVest');out.distanceMiles=document.getElementById('fDistanceMiles').value===''?+(out.speed*out.durationSeconds/3600).toFixed(3):val('fDistanceMiles');out.calories=val('fCalories')||'';out.avgHr=val('fAvgHr')||'';out.maxHr=val('fMaxHr')||'';break;
    case'runwalk':out.runSpeed=val('fRunSpeed');out.runIncline=val('fRunIncline');out.runSeconds=readDuration('run');out.walkSpeed=val('fWalkSpeed');out.walkIncline=val('fWalkIncline');out.walkSeconds=readDuration('walk');out.cycles=val('fCycles');out.vestWeight=val('fVest');out.durationSeconds=(out.runSeconds+out.walkSeconds)*out.cycles;out.distanceMiles=document.getElementById('fDistanceMiles').value===''?+(((out.runSpeed*out.runSeconds+out.walkSpeed*out.walkSeconds)*out.cycles)/3600).toFixed(3):val('fDistanceMiles');out.calories=val('fCalories')||'';break;
    case'sled':out.weight=val('fWeight');out.distanceFt=val('fDistance');out.direction=document.getElementById('fDirection').value;out.durationSeconds=readDuration();break;
  }
  return out;
}
function saveLoggerEntry(){
  if(state.active&&logger.editScope!=='history'&&document.getElementById('fTargetSets')){state.active.targetSets=state.active.targetSets||{};const raw=document.getElementById('fTargetSets').value.trim();state.active.targetSets[logger.exerciseId]=raw===''?null:Math.max(0,Math.round(number(raw)));}
  const out=readLoggerEntry();if(logger.editScope==='active'){const i=state.active.sets.findIndex(s=>s.id===logger.entryId);if(i>=0)state.active.sets[i]=out;}
  else if(logger.editScope==='history'){const w=state.workouts.find(w=>w.id===logger.workoutId),i=w?.sets.findIndex(s=>s.id===logger.entryId);if(w&&i>=0)w.sets[i]=out;}
  else{if(!state.active)return;state.active.sets.push(out);}
  saveState();closeSheets();if(state.active&&currentView==='workout')renderWorkout();if(currentView==='history')renderHistory();toast(logger.editScope?'Entry updated':'Logged');
}
function deleteLoggerEntry(){if(!logger.entryId)return;if(logger.editScope==='active')state.active.sets=state.active.sets.filter(s=>s.id!==logger.entryId);if(logger.editScope==='history'){const w=state.workouts.find(w=>w.id===logger.workoutId);if(w)w.sets=w.sets.filter(s=>s.id!==logger.entryId);}saveState();closeSheets();if(state.active&&currentView==='workout')renderWorkout();if(currentView==='history')renderHistory();toast('Entry deleted');}
function formatEntry(s,e=exercise(s.exerciseId)){
  if(!e)return'Unknown entry';let t='';const rir=s.rir?` @${s.rir}`:'';
  switch(e.mode){
    case'strength':t=`${fmtNum(s.weight)} × ${fmtNum(s.reps)}${e.perSide?'/side':''}${rir}`;break;
    case'bodyweight':t=`BW${s.weight?` +${fmtNum(s.weight)}`:''} × ${fmtNum(s.reps)}${e.perSide?'/side':''}`;if(s.negatives)t+=` +${s.negatives} neg`;if(s.holdSeconds)t+=` +${s.holdSeconds}s hold`;t+=rir;break;
    case'assisted':t=`${fmtNum(s.assist)} lb assist × ${fmtNum(s.reps)}${rir}`;break;
    case'hold':case'plank':t=`BW${s.weight?` +${fmtNum(s.weight)}`:''} × ${fmtDuration(s.durationSeconds||s.holdSeconds)}${rir}`;break;
    case'plankpull':t=`${fmtNum(s.weight)} lb × ${fmtNum(s.reps)} pulls • ${fmtDuration(s.durationSeconds)} up${rir}`;break;
    case'stepdown':t=`${s.weight?`+${fmtNum(s.weight)} lb`:'BW'} × ${fmtNum(s.reps)}/side • ${s.stepHeight||'Treadmill'}${rir}`;break;
    case'pushup':t=`BW${s.weight?` +${fmtNum(s.weight)}`:''} × ${fmtNum(s.reps)} • ${s.style||'Normal'} / ${s.setup||'Flat'}${rir}`;break;
    case'carry':t=`${fmtNum(s.carryWeight)} lb ${s.loadType||'KB'}${e.carryType==='farmer'?'/hand':''}${s.vestWeight?` +${fmtNum(s.vestWeight)} vest`:''} • ${fmtNum(s.distanceFt)} ft${s.side?` • ${s.side}`:''}${s.durationSeconds?` • ${fmtDuration(s.durationSeconds)}`:''}`;break;
    case'treadmill':t=`${fmtDuration(s.durationSeconds)} @ ${fmtNum(s.speed,1)} mph / ${fmtNum(s.incline,1)}%${s.vestWeight?` / +${fmtNum(s.vestWeight)} vest`:''} • ${fmtNum(s.distanceMiles,2)} mi${s.calories?` • ${s.calories} kcal`:''}`;break;
    case'runwalk':t=`${fmtNum(s.cycles)}×(${fmtDuration(s.runSeconds)} @${fmtNum(s.runSpeed,1)} / ${fmtDuration(s.walkSeconds)} @${fmtNum(s.walkSpeed,1)}) • ${fmtNum(s.distanceMiles,2)} mi${s.vestWeight?` • +${fmtNum(s.vestWeight)} vest`:''}${s.calories?` • ${s.calories} kcal`:''}`;break;
    case'sled':t=`${fmtNum(s.weight)} lb • ${fmtNum(s.distanceFt)} ft • ${s.direction||'Forward'}${s.durationSeconds?` • ${fmtDuration(s.durationSeconds)}`:''}`;break;
    default:t=`${fmtNum(s.weight)} × ${fmtNum(s.reps)}${rir}`;
  }
  if(s.setType&&s.setType!=='Working')t+=` • ${s.setType}`;if(s.quickNote)t+=` • ${s.quickNote}`;return t;
}
function fmtNum(v,d=0){const n=number(v);return Number.isInteger(n)?String(n):n.toFixed(d||1).replace(/\.0+$/,'');}
function estimated1RM(s,e=exercise(s.exerciseId)){if(!e?.e1rm||e.mode!=='strength'||!s.weight||!s.reps||s.reps>12||s.rir==='FAIL'||s.rir==='6+')return null;const rir=Number(s.rir||0);const effective=s.reps+(Number.isFinite(rir)?rir:0);return s.weight*(1+effective/30);}

function renderHistory(){
  document.querySelectorAll('[data-range]').forEach(b=>b.classList.toggle('active',b.dataset.range===historyRange));const cutoff=historyRange==='all'?0:Date.now()-Number(historyRange)*86400000;const ws=state.workouts.filter(w=>new Date(w.startedAt).getTime()>=cutoff).sort((a,b)=>new Date(b.startedAt)-new Date(a.startedAt));const entries=ws.flatMap(w=>w.sets);document.getElementById('historySummary').innerHTML=`<div class="summary-box"><strong>${ws.length}</strong><span>workouts</span></div><div class="summary-box"><strong>${entries.length}</strong><span>entries</span></div><div class="summary-box"><strong>${new Set(entries.map(s=>s.exerciseId)).size}</strong><span>exercises</span></div>`;
  document.getElementById('historyList').innerHTML=ws.length?ws.map(w=>`<button class="history-card history-button" data-history-workout="${w.id}"><strong>${esc(w.title)}</strong><div class="meta">${fmtDate(w.startedAt)} • ${w.sets.length} entries • ${fmtDuration((new Date(w.endedAt)-new Date(w.startedAt))/1000)}</div></button>`).join(''):'<div class="empty-box">No workouts in this range.</div>';
  const sel=document.getElementById('historyExerciseSelect'),cur=sel.value;sel.innerHTML='<option value="">Choose exercise</option>'+state.exercises.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('');if(state.exercises.some(e=>e.id===cur))sel.value=cur;renderExerciseHistory(sel.value);
}
function renderExerciseHistory(id){const box=document.getElementById('exerciseHistory');if(!id){box.innerHTML='<div class="empty-box">Choose an exercise.</div>';return;}const rows=[];state.workouts.forEach(w=>w.sets.filter(s=>s.exerciseId===id).forEach(s=>rows.push({w,s})));rows.sort((a,b)=>new Date(b.s.timestamp)-new Date(a.s.timestamp));box.innerHTML=rows.length?rows.map(({w,s})=>{const e=exercise(id),one=estimated1RM(s,e);return `<div class="history-card"><strong>${esc(formatEntry(s,e))}</strong><div class="meta">${fmtDate(w.startedAt)}${one?` • e1RM ~${Math.round(one)} lb`:''}${s.note?` • ${esc(s.note)}`:''}</div><button class="mini-btn" data-edit-history-entry="${s.id}" data-workout-id="${w.id}">Edit</button></div>`;}).join(''):'<div class="empty-box">No entries yet.</div>';}
function openWorkoutDetail(id){currentHistoryWorkoutId=id;const w=state.workouts.find(x=>x.id===id);if(!w)return;document.getElementById('workoutDetailTitle').textContent=`${w.title} — ${fmtDate(w.startedAt)}`;document.getElementById('workoutDetailMeta').innerHTML=`<strong>${w.sets.length} entries</strong><p>${fmtDuration((new Date(w.endedAt)-new Date(w.startedAt))/1000)} total</p>`;document.getElementById('workoutDetailList').innerHTML=[...w.sets].sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp)).map((s,i)=>`<div class="logged-set-row"><div><strong>${i+1}. ${esc(exercise(s.exerciseId)?.name||s.exerciseId)} — ${esc(formatEntry(s))}</strong><small>${fmtClock(s.timestamp)}${s.note?` • ${esc(s.note)}`:''}</small></div><button class="mini-btn" data-edit-history-entry="${s.id}" data-workout-id="${w.id}">Edit</button></div>`).join('')||'<div class="empty-box">No entries.</div>';document.getElementById('workoutDetailFocus').textContent=w.sessionFocus||'—';document.getElementById('workoutDetailNotes').textContent=w.notes||'—';openSheet('workoutDetailSheet');}

function groupedText(w){let out=`${w.title} — ${fmtDate(w.startedAt)}\n`;if(w.sessionFocus)out+=`Session focus: ${w.sessionFocus}\n`;out+='\n';const order=[];const groups={};[...w.sets].sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp)).forEach(s=>{if(!groups[s.exerciseId]){groups[s.exerciseId]=[];order.push(s.exerciseId);}groups[s.exerciseId].push(s);});order.forEach(id=>{out+=`${exercise(id)?.name||id}:\n`;groups[id].forEach(s=>out+=`${formatEntry(s)}${s.note?` — ${s.note}`:''}\n`);out+='\n';});if(w.notes)out+=`Workout notes:\n${w.notes}\n`;return out.trim();}
function timelineText(w){let out=`${w.title} — ${fmtDate(w.startedAt)}\nFULL ROTATION\n`;if(w.sessionFocus)out+=`Session focus: ${w.sessionFocus}\n`;out+='\n';const sorted=[...w.sets].sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp)),last={};sorted.forEach((s,i)=>{const name=exercise(s.exerciseId)?.name||s.exerciseId;const gap=last[s.exerciseId]?(new Date(s.timestamp)-new Date(last[s.exerciseId]))/1000:null;out+=`${String(i+1).padStart(2,'0')}. ${fmtClock(s.timestamp)} — ${name}: ${formatEntry(s)}${gap!=null?` • ${fmtDuration(gap)} since prior ${name}`:''}${s.note?` — ${s.note}`:''}\n`;last[s.exerciseId]=s.timestamp;});if(w.notes)out+=`\nWorkout notes:\n${w.notes}\n`;return out.trim();}
async function copyText(text,msg){try{await navigator.clipboard.writeText(text);toast(msg);}catch{const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast(msg);}}

function openFinish(){if(!state.active)return;document.getElementById('finishSummary').innerHTML=`<strong>${state.active.sets.length} entries</strong><p>${new Set(state.active.sets.map(s=>s.exerciseId)).size} exercises • ${fmtDuration((Date.now()-new Date(state.active.startedAt))/1000)}</p>`;document.getElementById('workoutNotes').value=state.active.notes||'';openSheet('finishSheet');}
function currentWorkoutForCopy(){if(!state.active)return null;state.active.sessionFocus=document.getElementById('sessionFocusInput')?.value.trim()||state.active.sessionFocus||'';state.active.notes=document.getElementById('workoutNotes')?.value.trim()||state.active.notes||'';return state.active;}
function saveFinishedWorkout(){if(!state.active)return;state.active.sessionFocus=document.getElementById('sessionFocusInput')?.value.trim()||state.active.sessionFocus||'';state.active.notes=document.getElementById('workoutNotes').value.trim();state.active.endedAt=nowIso();state.workouts.push(clone(state.active));state.active=null;saveState();clearInterval(sessionTimer);closeSheets();showView('home');toast('Workout saved');}

function renderTemplates(){const locked=!!state.active;document.getElementById('templateLockedNotice').classList.toggle('hidden',!locked);document.getElementById('templateEditor').classList.toggle('template-disabled',locked);document.getElementById('templateAddSuperset').disabled=locked;document.getElementById('createCustomExerciseBtn').disabled=locked;document.querySelectorAll('[data-template-tab]').forEach(b=>b.classList.toggle('active',b.dataset.templateTab===templateTab));const t=state.templates[templateTab];let html='';t.supersets.forEach(ss=>{html+=`<div class="superset-box template-section"><div class="superset-head"><div><div class="eyebrow">TEMPLATE SUPERSET</div><h3>${esc(ss.name)}</h3></div><div class="superset-actions"><button class="mini-btn" data-template-add-section="ss:${ss.id}">+ Exercise</button><button class="mini-btn danger-text" data-delete-template-ss="${ss.id}">Delete</button></div></div><div class="exercise-list sortable-list" data-template="1" data-section-key="ss:${ss.id}">${renderTemplateRows(ss.exerciseIds,`ss:${ss.id}`)}</div></div>`;});html+=templateSectionHtml('Favorites','favorites',t.favorites,'★ go-to exercises');html+=templateSectionHtml('Rest','rest',t.rest,'Other exercises preloaded into this workout');document.getElementById('templateEditor').innerHTML=html;bindDragHandles();}
function templateSectionHtml(title,key,ids,sub){return `<div class="template-section"><div class="template-section-head"><div><h3>${title}</h3><small>${sub}</small></div><button class="mini-btn" data-template-add-section="${key}">+ Exercise</button></div><div class="exercise-list sortable-list" data-template="1" data-section-key="${key}">${renderTemplateRows(ids,key)}</div></div>`;}
function renderTemplateRows(ids,key){if(!ids.length)return'<div class="empty-box">Nothing here.</div>';return ids.map(id=>{const e=exercise(id);return `<div class="template-row" data-exercise-id="${id}"><div class="drag-handle" data-drag-handle>≡</div><div><strong>${esc(e?.name||id)}</strong><small>${esc(e?.equipment||'')} • ${restLabel(e)}</small></div><div class="card-actions">${key==='favorites'?`<button class="mini-btn active" data-template-star="${id}">★</button>`:key==='rest'?`<button class="mini-btn" data-template-star="${id}">☆</button>`:''}<button class="mini-btn" data-template-move-ss="${id}">+SS</button><button class="mini-btn danger-text" data-template-remove="${id}">×</button></div></div>`;}).join('');}
function templateAllIds(t){return unique([...t.supersets.flatMap(s=>s.exerciseIds),...t.favorites,...t.rest]);}
function removeTemplateId(t,id){t.supersets.forEach(s=>s.exerciseIds=s.exerciseIds.filter(x=>x!==id));t.favorites=t.favorites.filter(x=>x!==id);t.rest=t.rest.filter(x=>x!==id);}
function addTemplateSuperset(){const t=state.templates[templateTab],n=t.supersets.length+1;t.supersets.push({id:uid(`${templateTab}_ss`),name:`Superset ${n}`,exerciseIds:[]});saveState();renderTemplates();}
function deleteTemplateSuperset(id){const t=state.templates[templateTab],i=t.supersets.findIndex(s=>s.id===id);if(i<0)return;const ss=t.supersets[i];ss.exerciseIds.forEach(x=>{if(!t.favorites.includes(x))t.favorites.push(x)});t.supersets.splice(i,1);saveState();renderTemplates();}
function toggleTemplateStar(id){const t=state.templates[templateTab];if(t.favorites.includes(id)){t.favorites=t.favorites.filter(x=>x!==id);if(!t.rest.includes(id))t.rest.push(id);}else{removeTemplateId(t,id);t.favorites.push(id);}saveState();renderTemplates();}
function moveTemplateToSuperset(id,ssId){const t=state.templates[templateTab];removeTemplateId(t,id);t.supersets.find(s=>s.id===ssId)?.exerciseIds.push(id);saveState();renderTemplates();}

function openExercisePicker(context){pickerContext=context;document.getElementById('pickerTitle').textContent=context?.title||'Add exercise';document.getElementById('exerciseSearch').value='';renderExercisePicker();openSheet('exercisePickerSheet');}
function renderExercisePicker(){const q=document.getElementById('exerciseSearch').value.trim().toLowerCase();let unavailable=new Set();if(pickerContext?.scope==='active')unavailable=new Set(allActiveIds());if(pickerContext?.scope==='template')unavailable=new Set(templateAllIds(state.templates[templateTab]));const list=state.exercises.filter(e=>!unavailable.has(e.id)&&(!q||`${e.name} ${e.equipment}`.toLowerCase().includes(q))).sort((a,b)=>a.name.localeCompare(b.name));document.getElementById('exercisePickerList').innerHTML=list.length?list.map(e=>`<button class="picker-item" data-pick-exercise="${e.id}"><strong>${esc(e.name)}</strong><small>${esc(e.equipment)}<br>${esc(restLabel(e))}</small></button>`).join(''):'<div class="empty-box">No matches.</div>';}
function pickExercise(id){const c=pickerContext;if(!c)return;if(c.scope==='active'){if(c.section?.startsWith('ss:')){addActiveExercise(id,'rest');moveActiveToSuperset(id,c.section.slice(3));}else addActiveExercise(id,c.section||'rest');}else if(c.scope==='template'){const t=state.templates[templateTab];if(c.section?.startsWith('ss:'))t.supersets.find(s=>s.id===c.section.slice(3))?.exerciseIds.push(id);else t[c.section||'rest'].push(id);saveState();renderTemplates();}closeSheets();}
function openSupersetPicker(id,scope='active'){supersetMoveContext={id,scope};const supersets=scope==='active'?state.active.layout.supersets:state.templates[templateTab].supersets;document.getElementById('supersetPickerList').innerHTML=supersets.length?supersets.map(s=>`<button class="secondary full" data-choose-ss="${s.id}">${esc(s.name)}</button>`).join('')+'<button class="secondary full" data-create-and-move-ss>+ New superset</button>':'<button class="primary full" data-create-and-move-ss>+ Create first superset</button>';openSheet('supersetPickerSheet');}
function chooseSuperset(id){if(supersetMoveContext.scope==='active')moveActiveToSuperset(supersetMoveContext.id,id);else moveTemplateToSuperset(supersetMoveContext.id,id);closeSheets();}
function createSupersetAndMove(){if(supersetMoveContext.scope==='active'){addLiveSuperset();const ss=state.active.layout.supersets.at(-1);moveActiveToSuperset(supersetMoveContext.id,ss.id);}else{addTemplateSuperset();const ss=state.templates[templateTab].supersets.at(-1);moveTemplateToSuperset(supersetMoveContext.id,ss.id);}closeSheets();}

function openCustomExercise(returnContext=null){customReturnContext=returnContext;['customName','customEquipment','customPrimary','customSecondary'].forEach(id=>document.getElementById(id).value='');document.getElementById('customMode').value='strength';document.getElementById('customRestType').value='accessory';document.getElementById('customPerSide').checked=false;openSheet('customExerciseSheet');}
function saveCustomExercise(){const name=document.getElementById('customName').value.trim();if(!name){toast('Give it a name');return;}const e={id:uid('custom'),name,equipment:document.getElementById('customEquipment').value.trim()||'Custom',mode:document.getElementById('customMode').value,restType:document.getElementById('customRestType').value,primary:document.getElementById('customPrimary').value.split(',').map(x=>x.trim()).filter(Boolean),secondary:document.getElementById('customSecondary').value.split(',').map(x=>x.trim()).filter(Boolean),perSide:document.getElementById('customPerSide').checked,weightSource:'generic',custom:true};state.exercises.push(e);saveState();const ret=customReturnContext;closeSheets();toast('Custom exercise created');if(ret){pickerContext=ret;renderExercisePicker();openSheet('exercisePickerSheet');}else if(currentView==='templates')renderTemplates();}
function renderSettings(){document.getElementById('bodyweightInput').value=state.settings.bodyweight;['heavy','compound','accessory','small','skill','core'].forEach(k=>document.getElementById(`${k}RestInput`).value=state.settings.restDefaults[k]);}
function saveSettings(){state.settings.bodyweight=number(document.getElementById('bodyweightInput').value);['heavy','compound','accessory','small','skill','core'].forEach(k=>state.settings.restDefaults[k]=number(document.getElementById(`${k}RestInput`).value));saveState();toast('Settings saved');}

function csvEscape(v){const s=String(v??'');return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s;}
function exportCsv(){const head=['workout_id','workout_title','workout_start','workout_end','session_focus','workout_notes','entry_timestamp','exercise','equipment','mode','set_type','rir','quick_note','entry_note','weight_lb','reps','negatives','hold_seconds','assist_lb','step_height','style','setup','load_type','carry_weight_lb','vest_lb','distance_ft','duration_seconds','speed_mph','incline_percent','distance_miles','calories','avg_hr','max_hr','run_speed','run_seconds','walk_speed','walk_seconds','cycles','sled_direction','primary_muscles','secondary_muscles'];const rows=[head];state.workouts.forEach(w=>w.sets.forEach(s=>{const e=exercise(s.exerciseId);rows.push([w.id,w.title,w.startedAt,w.endedAt,w.sessionFocus||'',w.notes||'',s.timestamp,e?.name||s.exerciseId,e?.equipment||'',e?.mode||'',s.setType||'',s.rir||'',s.quickNote||'',s.note||'',s.weight||'',s.reps||'',s.negatives||'',s.holdSeconds||s.durationSeconds||'',s.assist||'',s.stepHeight||'',s.style||'',s.setup||'',s.loadType||'',s.carryWeight||'',s.vestWeight||'',s.distanceFt||'',s.durationSeconds||'',s.speed||'',s.incline||'',s.distanceMiles||'',s.calories||'',s.avgHr||'',s.maxHr||'',s.runSpeed||'',s.runSeconds||'',s.walkSpeed||'',s.walkSeconds||'',s.cycles||'',s.direction||'',(e?.primary||[]).join('|'),(e?.secondary||[]).join('|')]);}));download(`gym-logger-v02-${new Date().toISOString().slice(0,10)}.csv`,rows.map(r=>r.map(csvEscape).join(',')).join('\n'),'text/csv');}
function exportJson(){download(`gym-logger-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(state,null,2),'application/json');}
function download(name,text,type){const blob=new Blob([text],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);}
function importJson(file){const r=new FileReader();r.onload=()=>{try{state=migrateState(JSON.parse(r.result));saveState();toast('Backup restored');showView('home');}catch(e){console.error(e);toast('Invalid backup');}};r.readAsText(file);}

function reorderCarryWeights(){if(!document.getElementById('fLoadType'))return;const type=document.getElementById('fLoadType').value,sel=document.getElementById('fCarryWeight'),current=number(sel.value),vals=type==='KB'?KB_WEIGHTS:type==='DB'?CARRY_DB_WEIGHTS:VEST_WEIGHTS.filter(x=>x>0);sel.innerHTML=vals.map(v=>`<option value="${v}">${v}</option>`).join('');sel.value=vals.includes(current)?current:vals[0];}

// Global event delegation keeps dynamically rendered cards simple.
document.addEventListener('click',ev=>{
  const b=ev.target.closest('button');if(!b)return;
  if(b.dataset.startTemplate){startWorkout(b.dataset.startTemplate);return;}
  if(b.dataset.nav){showView(b.dataset.nav);return;}
  if(b.id==='resumeWorkoutBtn'){showView('workout');startClock();return;}
  if(b.id==='backHomeBtn'){showView('home');return;}
  if(b.id==='addSupersetBtn'){addLiveSuperset();return;}
  if(b.id==='addExerciseBtn'){openExercisePicker({scope:'active',section:'rest',title:'Add exercise to workout'});return;}
  if(b.id==='finishWorkoutBtn'){openFinish();return;}
  if(b.id==='musclePanelToggle'){document.getElementById('muscleDetail').classList.toggle('hidden');return;}
  if(b.dataset.addToLiveSs){openExercisePicker({scope:'active',section:`ss:${b.dataset.addToLiveSs}`,title:'Add to superset'});return;}
  if(b.dataset.deleteLiveSs){deleteLiveSuperset(b.dataset.deleteLiveSs);return;}
  if(b.dataset.log){openLogger(b.dataset.log);return;}
  if(b.dataset.favorite){toggleActiveFavorite(b.dataset.favorite);return;}
  if(b.dataset.moveSs){openSupersetPicker(b.dataset.moveSs,'active');return;}
  if(b.dataset.removeSs){removeActiveFromSuperset(b.dataset.removeSs);return;}
  if(b.dataset.done){markDone(b.dataset.done);return;}
  if(b.dataset.reactivate){reactivate(b.dataset.reactivate);return;}
  if(b.dataset.editActiveEntry){openLogger(state.active.sets.find(s=>s.id===b.dataset.editActiveEntry)?.exerciseId,{scope:'active',entryId:b.dataset.editActiveEntry});return;}
  if(b.dataset.setType){logger.setType=b.dataset.setType;document.querySelectorAll('[data-set-type]').forEach(x=>x.classList.toggle('active',x.dataset.setType===logger.setType));return;}
  if(b.dataset.quickNote){logger.quickNote=logger.quickNote===b.dataset.quickNote?'':b.dataset.quickNote;document.querySelectorAll('[data-quick-note]').forEach(x=>x.classList.toggle('active',x.dataset.quickNote===logger.quickNote));return;}
  if(b.id==='saveEntryBtn'){saveLoggerEntry();return;}
  if(b.id==='deleteEntryBtn'){deleteLoggerEntry();return;}
  if(b.dataset.pickExercise){pickExercise(b.dataset.pickExercise);return;}
  if(b.id==='pickerCreateCustomBtn'){const c=pickerContext;closeSheets();openCustomExercise(c);return;}
  if(b.dataset.chooseSs){chooseSuperset(b.dataset.chooseSs);return;}
  if(b.hasAttribute('data-create-and-move-ss')){createSupersetAndMove();return;}
  if(b.id==='copySummaryBtn'){copyText(groupedText(currentWorkoutForCopy()),'Grouped workout copied');return;}
  if(b.id==='copyTimelineBtn'){copyText(timelineText(currentWorkoutForCopy()),'Full rotation copied');return;}
  if(b.id==='saveWorkoutBtn'){saveFinishedWorkout();return;}
  if(b.dataset.historyWorkout){openWorkoutDetail(b.dataset.historyWorkout);return;}
  if(b.dataset.range){historyRange=b.dataset.range;renderHistory();return;}
  if(b.dataset.editHistoryEntry){const w=state.workouts.find(w=>w.id===b.dataset.workoutId),s=w?.sets.find(s=>s.id===b.dataset.editHistoryEntry);if(s){closeSheets();openLogger(s.exerciseId,{scope:'history',workoutId:w.id,entryId:s.id});}return;}
  if(b.id==='workoutDetailCopySummary'){const w=state.workouts.find(w=>w.id===currentHistoryWorkoutId);copyText(groupedText(w),'Grouped workout copied');return;}
  if(b.id==='workoutDetailCopyTimeline'){const w=state.workouts.find(w=>w.id===currentHistoryWorkoutId);copyText(timelineText(w),'Full rotation copied');return;}
  if(b.dataset.templateTab){templateTab=b.dataset.templateTab;renderTemplates();return;}
  if(b.id==='templateAddSuperset'){addTemplateSuperset();return;}
  if(b.dataset.deleteTemplateSs){deleteTemplateSuperset(b.dataset.deleteTemplateSs);return;}
  if(b.dataset.templateAddSection){openExercisePicker({scope:'template',section:b.dataset.templateAddSection,title:'Add to template'});return;}
  if(b.dataset.templateStar){toggleTemplateStar(b.dataset.templateStar);return;}
  if(b.dataset.templateMoveSs){openSupersetPicker(b.dataset.templateMoveSs,'template');return;}
  if(b.dataset.templateRemove){const t=state.templates[templateTab];removeTemplateId(t,b.dataset.templateRemove);saveState();renderTemplates();return;}
  if(b.id==='createCustomExerciseBtn'||b.id==='createCustomExerciseSettingsBtn'){openCustomExercise();return;}
  if(b.id==='saveCustomExerciseBtn'){saveCustomExercise();return;}
  if(b.id==='saveSettingsBtn'){saveSettings();return;}
  if(b.id==='exportCsvBtn'){exportCsv();return;}
  if(b.id==='exportJsonBtn'){exportJson();return;}
  if(b.id==='themeBtn'){document.documentElement.classList.toggle('light');state.settings.theme=document.documentElement.classList.contains('light')?'light':'dark';saveState();return;}
  if(b.hasAttribute('data-close-sheet')){closeSheets();return;}
});

document.addEventListener('change',ev=>{
  if(ev.target.id==='editExerciseSelect'){logger.exerciseId=ev.target.value;renderLoggerFields(entryByEditRef());renderTodayEntries();return;}
  if(ev.target.id==='historyExerciseSelect'){renderExerciseHistory(ev.target.value);return;}
  if(ev.target.id==='fLoadType'){reorderCarryWeights();return;}
  if(ev.target.id==='importJsonInput'&&ev.target.files?.[0]){importJson(ev.target.files[0]);return;}
});
document.getElementById('exerciseSearch').addEventListener('input',renderExercisePicker);
document.getElementById('sessionFocusInput').addEventListener('input',ev=>{if(state.active){state.active.sessionFocus=ev.target.value;saveState();}});
document.getElementById('scrim').addEventListener('click',closeSheets);

function applyTheme(){document.documentElement.classList.toggle('light',state.settings.theme==='light');}
function boot(){applyTheme();showView('home');if(state.active)startClock();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});}
boot();
