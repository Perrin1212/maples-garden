/* =====================================================
   MAPLE'S GARDEN V3.2 — CALM LIVING GARDEN
   Static PWA. No external libraries required.
   ===================================================== */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const els = {
  garden: $("#garden"), rabbit: $("#rabbit"), messageBubble: $("#messageBubble"), messageText: $("#messageText"), heartEffect: $("#heartEffect"), ambientNote: $("#ambientNote"), particleLayer: $("#particleLayer"),
  heartCount: $("#heartCount"), visitCount: $("#visitCount"), gardenLevel: $("#gardenLevel"), settingsGardenLevel: $("#settingsGardenLevel"), weatherIcon: $("#weatherIcon"), weatherLabel: $("#weatherLabel"), timeLabel: $("#timeLabel"), progressFill: $("#progressFill"), progressText: $("#progressText"),
  feedModal: $("#feedModal"), playModal: $("#playModal"), noteModal: $("#noteModal"), noteText: $("#noteText"), memoriesScreen: $("#memoriesScreen"), settingsScreen: $("#settingsScreen"),
  memoryFileInput: $("#memoryFileInput"), memoryUploadPanel: $("#memoryUploadPanel"), memoryPreview: $("#memoryPreview"), memoryCaption: $("#memoryCaption"), memoryDate: $("#memoryDate"), saveMemoryButton: $("#saveMemoryButton"), cancelMemoryButton: $("#cancelMemoryButton"), uploadStatus: $("#uploadStatus"), memoryGallery: $("#memoryGallery"), memoryCount: $("#memoryCount"), emptyMemories: $("#emptyMemories"), memoryLeaves: $("#memoryLeaves"),
  photoViewer: $("#photoViewer"), viewerImage: $("#viewerImage"), viewerCaption: $("#viewerCaption"), viewerDate: $("#viewerDate"),
  visitFrequency: $("#visitFrequency"), soundToggle: $("#soundToggle"), weatherToggle: $("#weatherToggle"), surpriseToggle: $("#surpriseToggle"), motionToggle: $("#motionToggle"), rareEvent: $("#rareEvent"),
  duckToy: $("#duckToy"), rabbitTeddyToy: $("#rabbitTeddyToy"), pondSpot: $("#pondSpot"), flowerSpot: $("#flowerSpot"), blanketSpot: $("#blanketSpot"), carrotSpot: $("#carrotSpot"), hideawaySpot: $("#hideawaySpot")
};

const STORAGE_KEY = "maplesGardenV3State";
const SETTINGS_KEY = "maplesGardenV3Settings";
const DB_NAME = "MaplesGardenMemories";
const DB_VERSION = 1;
const STORE_NAME = "memories";

const DEFAULT_STATE = {
  visits: 0, hearts: 0, feeds: 0, pets: 0, toyMoments: 0, playMoments: 0,
  pondMoments: 0, flowerMoments: 0, blanketMoments: 0, hideawayMoments: 0,
  lastVisitDate: "", lastRareEventDate: "", createdAt: new Date().toISOString()
};
const DEFAULT_SETTINGS = { visitFrequency: "normal", sound: false, weather: true, surprises: true, reducedMotion: false };

let state = loadJson(STORAGE_KEY, DEFAULT_STATE);
const legacySettings = (() => {
  try {
    const old = JSON.parse(localStorage.getItem("maplesGardenSettings") || "{}");
    return { ...DEFAULT_SETTINGS, visitFrequency: old.visitFrequency || DEFAULT_SETTINGS.visitFrequency, sound: typeof old.sound === "boolean" ? old.sound : DEFAULT_SETTINGS.sound };
  } catch { return { ...DEFAULT_SETTINGS }; }
})();
let settings = loadJson(SETTINGS_KEY, legacySettings);
let memories = [];
let selectedMemoryImage = null;
let wanderTimer = null;
let messageTimer = null;
let ambientTimer = null;
let behaviorBusy = false;
let firstMapleClick = true;
let audioContext = null;
let currentWeather = "clear";
let currentTimePhase = "day";
let currentSeason = "autumn";

function loadJson(key, fallback) {
  try { return { ...fallback, ...(JSON.parse(localStorage.getItem(key) || "{}")) }; }
  catch { return { ...fallback }; }
}
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function saveSettings() { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
function todayKey() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
function formatDate(value) { if (!value) return ""; const d = new Date(`${value}T00:00:00`); return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString(undefined,{day:"numeric",month:"long",year:"numeric"}); }
function clamp(n,min,max){ return Math.max(min,Math.min(max,n)); }
function choice(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function sleep(ms){ return new Promise(resolve=>setTimeout(resolve,ms)); }

/* ---------- IndexedDB memories ---------- */
function openDB() {
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME,{keyPath:"id"});
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function dbGetAll(){ const db=await openDB(); return new Promise((resolve,reject)=>{ const req=db.transaction(STORE_NAME,"readonly").objectStore(STORE_NAME).getAll(); req.onsuccess=()=>resolve(req.result||[]); req.onerror=()=>reject(req.error); }); }
async function dbPut(item){ const db=await openDB(); return new Promise((resolve,reject)=>{ const req=db.transaction(STORE_NAME,"readwrite").objectStore(STORE_NAME).put(item); req.onsuccess=()=>resolve(); req.onerror=()=>reject(req.error); }); }
async function dbDelete(id){ const db=await openDB(); return new Promise((resolve,reject)=>{ const req=db.transaction(STORE_NAME,"readwrite").objectStore(STORE_NAME).delete(id); req.onsuccess=()=>resolve(); req.onerror=()=>reject(req.error); }); }

/* ---------- State / progression ---------- */
function recordVisit() {
  const today = todayKey();
  if (state.lastVisitDate !== today) { state.visits += 1; state.lastVisitDate = today; saveState(); }
}
function progressionScore(){ return state.visits + state.hearts*.18 + memories.length*2.5 + state.feeds*.1 + state.pets*.06 + state.toyMoments*.16 + state.playMoments*.12; }
const LEVELS = [0, 3, 10, 24, 45, 75];
function getGardenLevel(){ const score=progressionScore(); let level=1; LEVELS.forEach((threshold,index)=>{ if(score>=threshold) level=index+1; }); return clamp(level,1,6); }
function updateProgressUI(){
  const level=getGardenLevel(); const score=progressionScore(); const current=LEVELS[level-1]||0; const next=LEVELS[level] ?? current+40; const pct=level===6?100:clamp(((score-current)/(next-current))*100,0,100);
  els.heartCount.textContent=state.hearts; els.visitCount.textContent=state.visits; els.gardenLevel.textContent=level; els.settingsGardenLevel.textContent=level; els.garden.dataset.level=String(level); els.progressFill.style.width=`${pct}%`;
  const unlockText = level===1 ? "The garden is already full of life. A few extra daisies appear next." : level===2 ? "The garden is remembering you. Little lanterns are next." : level===3 ? "A water lily and a tiny visitor will join the pond next." : level===4 ? "A wind chime is waiting for the next garden level." : level===5 ? "One final little heart-bloom is still to grow." : "Meeps' garden is in full bloom. ❤️";
  els.progressText.textContent=unlockText;
}

/* ---------- Time, season & daily weather ---------- */
function getSeason(){ const m=new Date().getMonth()+1; if([3,4,5].includes(m))return"spring"; if([6,7,8].includes(m))return"summer"; if([9,10,11].includes(m))return"autumn"; return"winter"; }
function getTimePhase(){ const h=new Date().getHours(); if(h>=5&&h<8)return"dawn"; if(h>=8&&h<18)return"day"; if(h>=18&&h<21)return"dusk"; return"night"; }
function seededNumber(seed){ let h=2166136261; for(let i=0;i<seed.length;i++){ h^=seed.charCodeAt(i); h=Math.imul(h,16777619); } return (h>>>0)/4294967295; }
function dailyWeather(){ const seed=seededNumber(todayKey()+currentSeason); if(currentSeason==="winter"&&seed<.24)return"snow"; if(seed<.18)return"rain"; if(seed<.42)return"cloudy"; if(seed<.62)return"breeze"; return"clear"; }
function applyWorld(){
  currentSeason=getSeason(); currentTimePhase=getTimePhase(); currentWeather=dailyWeather();
  els.garden.classList.remove("season-spring","season-summer","season-autumn","season-winter","time-dawn","time-day","time-dusk","time-night","weather-clear","weather-cloudy","weather-breeze","weather-rain","weather-snow");
  els.garden.classList.add(`season-${currentSeason}`,`time-${currentTimePhase}`,`weather-${currentWeather}`);
  const timeLabels={dawn:"Dawn",day:"Day",dusk:"Sunset",night:"Night"}; const weather={clear:["Clear","☀️"],cloudy:["Cloudy","☁️"],breeze:["Breezy","🍃"],rain:["Rain","🌧️"],snow:["Snow","❄️"]};
  els.timeLabel.textContent=timeLabels[currentTimePhase]; els.weatherLabel.textContent=weather[currentWeather][0]; els.weatherIcon.textContent=currentTimePhase==="night"&&currentWeather==="clear"?"🌙":weather[currentWeather][1];
}

/* ---------- Messages / particles ---------- */
function positionMessageBubble(){ const r=els.rabbit.getBoundingClientRect(); const g=els.garden.getBoundingClientRect(); els.messageBubble.style.left=`${r.left-g.left+r.width/2}px`; els.messageBubble.style.top=`${r.top-g.top-8}px`; }
function showMessage(text,duration=3000){ clearTimeout(messageTimer); els.messageText.textContent=text; positionMessageBubble(); els.messageBubble.classList.remove("hidden"); messageTimer=setTimeout(()=>els.messageBubble.classList.add("hidden"),duration); }
function showAmbient(text,duration=2800){ clearTimeout(ambientTimer); els.ambientNote.textContent=text; els.ambientNote.classList.remove("hidden"); ambientTimer=setTimeout(()=>els.ambientNote.classList.add("hidden"),duration); }
function getRabbitPercent(){ const r=els.rabbit.getBoundingClientRect(),g=els.garden.getBoundingClientRect(); return {x:((r.left+r.width/2-g.left)/g.width)*100,y:((r.top+r.height/2-g.top)/g.height)*100}; }
function makePuff(x,y){ if(settings.reducedMotion)return; const p=document.createElement("span"); p.className="hop-puff"; p.style.left=`${x}%`; p.style.top=`${y+5}%`; els.particleLayer.append(p); setTimeout(()=>p.remove(),650); }
function sparkleAt(x,y,count=5,symbol="✦"){ if(settings.reducedMotion)return; for(let i=0;i<count;i++){ const p=document.createElement("span"); p.className="sparkle-particle"; p.textContent=symbol; p.style.left=`${x+(Math.random()*8-4)}%`; p.style.top=`${y+(Math.random()*5-2)}%`; p.style.animationDelay=`${i*55}ms`; els.particleLayer.append(p); setTimeout(()=>p.remove(),1100); } }
function showHeart(){ const r=getRabbitPercent(); els.heartEffect.style.left=`${r.x}%`; els.heartEffect.style.top=`${r.y-4}%`; els.heartEffect.classList.remove("hidden"); els.heartEffect.style.animation="none"; void els.heartEffect.offsetWidth; els.heartEffect.style.animation=""; sparkleAt(r.x,r.y-2,4,"♡"); setTimeout(()=>els.heartEffect.classList.add("hidden"),1250); }

/* ---------- Meeps movement ---------- */
const RABBIT_STATES=["idle","walking","happy","binky","zooming","grooming","flopped","sleeping","inspecting","nibbling","hidden-in-hideaway"];
function setRabbitState(name){ RABBIT_STATES.forEach(s=>els.rabbit.classList.remove(s)); els.rabbit.classList.add(name); }
function elementCenterPercent(el){ const e=el.getBoundingClientRect(),g=els.garden.getBoundingClientRect(); return {x:((e.left+e.width/2-g.left)/g.width)*100,y:((e.top+e.height/2-g.top)/g.height)*100}; }
async function moveMeepsToPercent(targetX,targetY,options={}){
  if(behaviorBusy && !options.force)return false;
  behaviorBusy=true;
  const start=getRabbitPercent(); const x=clamp(targetX,10,90), y=clamp(targetY,42,84); const dx=x-start.x,dy=y-start.y; const distance=Math.hypot(dx,dy);
  const zoom=options.zoom===true; const stepMs=settings.reducedMotion?20:(zoom?185:285); const steps=settings.reducedMotion?1:clamp(Math.ceil(distance/(zoom?15:11)),2,zoom?5:7);
  els.rabbit.style.setProperty("--hop-lean",`${dx>=0?2:-2}deg`); setRabbitState(zoom?"zooming":"walking");
  for(let i=1;i<=steps;i++){
    const t=i/steps; const ease=t*t*(3-2*t); const nx=start.x+dx*ease, ny=start.y+dy*ease;
    els.rabbit.style.transitionDuration=`${stepMs}ms`; els.rabbit.style.left=`${nx}%`; els.rabbit.style.top=`${ny}%`; if(i<steps)makePuff(nx,ny); await sleep(stepMs);
  }
  setRabbitState("idle"); behaviorBusy=false; positionMessageBubble(); return true;
}

/* ---------- Purposeful garden interactions ---------- */
async function interactWithToy(type,announce=true){
  if(behaviorBusy)return; const toy=type==="duck"?els.duckToy:els.rabbitTeddyToy; const pos=elementCenterPercent(toy); if(!(await moveMeepsToPercent(pos.x+(type==="duck"?7:-7),pos.y+5)))return;
  behaviorBusy=true; setRabbitState("inspecting"); state.toyMoments+=1; state.playMoments+=1; saveState(); updateProgressUI();
  const msg=type==="duck"?choice(["Meeps found her little blue duck. 🦆","A tiny nose boop for the duck. ❤️","Meeps checks that her duck is still here.","Duck inspection complete. Very important work. 🐰"]):choice(["Meeps sits beside her little friend. 🧸","A soft little nose touch for the teddy. ❤️","Meeps found her rabbit teddy.","She gives her teddy a tiny cuddle. 🤎"]);
  if(announce)showMessage(msg,3400); sparkleAt(pos.x,pos.y,4,"♡"); playSoftSound("toy"); await sleep(settings.reducedMotion?100:1900); setRabbitState("idle"); behaviorBusy=false;
}
async function visitPond(announce=true){
  if(behaviorBusy)return; const pos=elementCenterPercent(els.pondSpot); if(!(await moveMeepsToPercent(pos.x-8,pos.y-4)))return; behaviorBusy=true; setRabbitState("inspecting"); state.pondMoments+=1;state.playMoments+=1;saveState();updateProgressUI();
  if(announce)showMessage(choice(["Meeps takes a tiny drink by the pond. 💧","She watches the water for a moment. 🐰","Meeps checks her reflection. Still very cute. 🤎"]),3300); sparkleAt(pos.x,pos.y,5,"·"); await sleep(settings.reducedMotion?120:2200);setRabbitState("idle");behaviorBusy=false;
}
async function sniffFlowers(announce=true){
  if(behaviorBusy)return; const pos=elementCenterPercent(els.flowerSpot); if(!(await moveMeepsToPercent(pos.x+5,pos.y+7)))return; behaviorBusy=true;setRabbitState("inspecting");state.flowerMoments+=1;state.playMoments+=1;saveState();updateProgressUI();
  els.flowerSpot.animate?.([{transform:"rotate(0deg)"},{transform:"rotate(2deg)"},{transform:"rotate(-2deg)"},{transform:"rotate(0deg)"}],{duration:900}); if(announce)showMessage(choice(["Meeps has a very serious flower sniff. 🌸","A tiny nose twitch among the flowers. 🤎","Meeps approves of today's flowers. 🌼"]),3200);sparkleAt(pos.x,pos.y,6,"✿");await sleep(settings.reducedMotion?120:2000);setRabbitState("idle");behaviorBusy=false;
}
async function relaxOnBlanket(announce=true){
  if(behaviorBusy)return;const pos=elementCenterPercent(els.blanketSpot);if(!(await moveMeepsToPercent(pos.x,pos.y+1)))return;behaviorBusy=true;setRabbitState("flopped");state.blanketMoments+=1;state.playMoments+=1;saveState();updateProgressUI();if(announce)showMessage(choice(["A proper Meeps flop on the blanket. ❤️","Meeps has claimed the comfy spot.","This seems like a good place for five more minutes. 🐰"]),3500);await sleep(settings.reducedMotion?200:4200);setRabbitState("idle");behaviorBusy=false;
}
async function nibbleCarrots(announce=true){
  if(behaviorBusy)return;const pos=elementCenterPercent(els.carrotSpot);if(!(await moveMeepsToPercent(pos.x+7,pos.y+3)))return;behaviorBusy=true;setRabbitState("nibbling");state.feeds+=1;state.playMoments+=1;saveState();updateProgressUI();if(announce)showMessage(choice(["Meeps found the carrot patch. 🥕","Crunch crunch. Excellent gardening. 🐰","Just a little garden snack for Meeps. 🤎"]),3200);playSoftSound("feed");await sleep(settings.reducedMotion?150:2100);setRabbitState("idle");behaviorBusy=false;
}
async function visitHideaway(announce=true){
  if(behaviorBusy)return;const pos=elementCenterPercent(els.hideawaySpot);if(!(await moveMeepsToPercent(pos.x-7,pos.y+10)))return;behaviorBusy=true;setRabbitState("inspecting");if(announce)showMessage(choice(["Meeps checks her little hideaway. 🏡","Home inspection. Everything seems cosy.","Meeps pops in to make sure her spot is just right. 🤎"]),2800);await sleep(settings.reducedMotion?100:1000);setRabbitState("hidden-in-hideaway");state.hideawayMoments+=1;state.playMoments+=1;saveState();updateProgressUI();await sleep(settings.reducedMotion?150:1500);setRabbitState("idle");showMessage("There she is. 🐰❤️",1800);behaviorBusy=false;
}
async function binky(announce=true){ if(behaviorBusy)return;behaviorBusy=true;setRabbitState("binky");if(announce)showMessage(choice(["A little Meeps binky! ❤️","That was definitely a happy hop. 🐰","Meeps has a tiny burst of joy. 🤎"]),2600);playSoftSound("happy");const p=getRabbitPercent();sparkleAt(p.x,p.y,6,"♡");await sleep(settings.reducedMotion?120:900);setRabbitState("idle");behaviorBusy=false; }
async function groom(announce=false){ if(behaviorBusy)return;behaviorBusy=true;setRabbitState("grooming");if(announce||Math.random()<.35)showMessage("Meeps has a little wash. 🐰",2200);await sleep(settings.reducedMotion?150:3000);setRabbitState("idle");behaviorBusy=false; }
async function nap(){ if(behaviorBusy)return;behaviorBusy=true;setRabbitState("sleeping");showMessage(choice(["Meeps is having a tiny snooze. 🤎","A very important little nap. 🌙","Meeps has gone all sleepy. ❤️"]),2500);await sleep(settings.reducedMotion?250:4700);setRabbitState("idle");behaviorBusy=false; }
async function randomWander(){ if(behaviorBusy)return; await moveMeepsToPercent(16+Math.random()*70,52+Math.random()*28); }
async function zoomies(announce=true){
  if(behaviorBusy)return; state.playMoments+=1;saveState();updateProgressUI(); if(announce)showMessage("Meeps has the zoomies! 💨🐰",2600);
  const route=[[74,72],[32,56],[67,51],[47,75]]; for(const [x,y] of route){ await moveMeepsToPercent(x,y,{zoom:true}); await sleep(settings.reducedMotion?15:70); } await binky(false);
}
async function exploreGarden(){ if(behaviorBusy)return; const actions=[()=>sniffFlowers(true),()=>visitPond(true),()=>relaxOnBlanket(true),()=>nibbleCarrots(true),()=>visitHideaway(true),()=>interactWithToy(Math.random()<.5?"duck":"teddy",true)]; await choice(actions)(); }

async function chooseBehavior(){
  if(document.hidden||behaviorBusy||!els.memoriesScreen.classList.contains("hidden")||!els.settingsScreen.classList.contains("hidden")||!els.feedModal.classList.contains("hidden")||!els.playModal.classList.contains("hidden")||!els.noteModal.classList.contains("hidden"))return;
  const r=Math.random();
  if(r<.18)await randomWander(); else if(r<.30)await sniffFlowers(false); else if(r<.40)await interactWithToy(Math.random()<.5?"duck":"teddy",false); else if(r<.49)await visitPond(false); else if(r<.57)await relaxOnBlanket(false); else if(r<.65)await visitHideaway(false); else if(r<.73)await groom(false); else if(r<.81)await binky(false); else if(r<.88)await zoomies(false); else if(currentTimePhase==="night")await nap(); else await randomWander();
}
function behaviorDelay(){ if(settings.visitFrequency==="off")return null; if(settings.visitFrequency==="often")return 3800+Math.random()*3500; if(settings.visitFrequency==="rare")return 18000+Math.random()*12000; return 7200+Math.random()*6000; }
function scheduleBehavior(initial=false){ clearTimeout(wanderTimer);const delay=initial?4200:behaviorDelay();if(delay===null)return;wanderTimer=setTimeout(async()=>{await chooseBehavior();scheduleBehavior(false);},delay); }

/* ---------- Direct interaction ---------- */
els.rabbit.addEventListener("click",async()=>{
  if(behaviorBusy)return;state.pets+=1;saveState();updateProgressUI();
  const msg=firstMapleClick?"Hello baby Meeps <3":choice(["Meeps looks up at you. 🥹","A tiny curious nose twitch from Meeps. 🤎","Meeps seems very happy you're here. ❤️","She gives you one of her little looks.","Meeps does a tiny happy hop. 🐰","Someone wants some attention. ❤️","A gentle little head nudge. 🤎"]);firstMapleClick=false;
  behaviorBusy=true;setRabbitState("happy");showHeart();showMessage(msg,2800);playSoftSound("pet");await sleep(settings.reducedMotion?120:1050);setRabbitState("idle");behaviorBusy=false;
});
els.duckToy.addEventListener("click",()=>interactWithToy("duck"));
els.rabbitTeddyToy.addEventListener("click",()=>interactWithToy("teddy"));
els.pondSpot.addEventListener("click",()=>visitPond());
els.flowerSpot.addEventListener("click",()=>sniffFlowers());
els.blanketSpot.addEventListener("click",()=>relaxOnBlanket());
els.carrotSpot.addEventListener("click",()=>nibbleCarrots());
els.hideawaySpot.addEventListener("click",()=>visitHideaway());

$("#heartButton").addEventListener("click",async()=>{state.hearts+=1;saveState();updateProgressUI();showHeart();showMessage(choice(["A little heart for Meeps. ❤️","Sent straight into the garden. ❤️","Meeps keeps that one close. 🤎","One more heart for the garden. 🍁❤️"]),2600);playSoftSound("heart");if(!behaviorBusy){behaviorBusy=true;setRabbitState("happy");await sleep(settings.reducedMotion?100:850);setRabbitState("idle");behaviorBusy=false;}});
$("#feedButton").addEventListener("click",()=>els.feedModal.classList.remove("hidden"));
$("#closeFeedButton").addEventListener("click",()=>els.feedModal.classList.add("hidden"));
$$('.food-button').forEach(btn=>btn.addEventListener("click",async()=>{if(behaviorBusy)return;const food=btn.dataset.food;els.feedModal.classList.add("hidden");state.feeds+=1;saveState();updateProgressUI();behaviorBusy=true;setRabbitState("nibbling");const messages={carrot:"Meeps happily nibbles her carrot. 🥕",grass:"Meeps settles down with some fresh grass. 🌿",apple:"Meeps gives the apple a very serious sniff. 🍎"};showMessage(messages[food],3300);showHeart();playSoftSound("feed");await sleep(settings.reducedMotion?100:1750);setRabbitState("idle");behaviorBusy=false;}));

$("#playButton").addEventListener("click",()=>els.playModal.classList.remove("hidden"));
$("#closePlayButton").addEventListener("click",()=>els.playModal.classList.add("hidden"));
$$('.play-choice').forEach(btn=>btn.addEventListener("click",async()=>{const action=btn.dataset.play;els.playModal.classList.add("hidden");if(action==="duck")await interactWithToy("duck");else if(action==="teddy")await interactWithToy("teddy");else if(action==="zoomies")await zoomies();else await exploreGarden();}));

const NOTES=[
  "I saved you a little spot in the sunshine. ❤️",
  "The flowers are doing well. I have inspected them very carefully. 🐰",
  "You can always come and sit with me for a minute. 🍁",
  "My duck is still here. I checked. 🦆",
  "There is plenty of room beside me on the blanket. 🤎",
  "I think you deserve a tiny happy hop today. ❤️",
  "The garden feels extra cosy when you visit. 🍁",
  "I found a nice patch of grass and thought you should know. 🌿",
  "No big reason. Just a little nose boop from Meeps. 🐰❤️"
];
function showNote(){els.noteText.textContent=choice(NOTES);els.noteModal.classList.remove("hidden");playSoftSound("memory");}
$("#noteButton").addEventListener("click",showNote);$("#closeNoteButton").addEventListener("click",()=>els.noteModal.classList.add("hidden"));$("#anotherNoteButton").addEventListener("click",()=>{els.noteText.textContent=choice(NOTES);});

/* ---------- Memory book ---------- */
async function compressImage(file){
  const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});
  const img=await new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=dataUrl;});
  const max=1400;const scale=Math.min(1,max/Math.max(img.width,img.height));const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext("2d",{alpha:false}).drawImage(img,0,0,canvas.width,canvas.height);return canvas.toDataURL("image/jpeg",.82);
}
async function migrateLegacyMemories(){
  try{const existing=await dbGetAll();if(existing.length)return;const raw=localStorage.getItem("maplesGardenMemories");if(!raw)return;const legacy=JSON.parse(raw);if(!Array.isArray(legacy)||!legacy.length)return;for(const item of legacy){if(!item||!item.image)continue;await dbPut({id:item.id||`${Date.now()}-${Math.random().toString(36).slice(2)}`,image:item.image,caption:item.caption||"",date:item.date||todayKey(),createdAt:item.createdAt||new Date().toISOString()});}localStorage.setItem("maplesGardenV3LegacyMigrationComplete","true");}catch(error){console.warn("Legacy memory migration skipped:",error);}
}
async function loadMemories(){try{await migrateLegacyMemories();memories=(await dbGetAll()).sort((a,b)=>String(a.createdAt).localeCompare(String(b.createdAt)));}catch(e){console.warn(e);memories=[];}renderMemories();updateProgressUI();}
function renderMemories(){
  els.memoryGallery.innerHTML="";els.memoryCount.textContent=memories.length;els.emptyMemories.style.display=memories.length?"none":"block";
  [...memories].reverse().forEach(memory=>{const card=document.createElement("article");card.className="memory-photo-card";const img=document.createElement("img");img.className="memory-photo";img.src=memory.image;img.alt=memory.caption||"A memory of Maple";img.loading="lazy";img.addEventListener("click",()=>openPhotoViewer(memory));const details=document.createElement("div");details.className="memory-photo-details";const date=document.createElement("div");date.className="memory-photo-date";date.textContent=formatDate(memory.date);const caption=document.createElement("div");caption.className="memory-photo-caption";caption.textContent=memory.caption||"A little moment with Maple.";const del=document.createElement("button");del.className="memory-delete-button";del.type="button";del.textContent="Delete memory";del.addEventListener("click",()=>deleteMemory(memory.id));details.append(date,caption,del);card.append(img,details);els.memoryGallery.append(card);});renderMemoryLeaves();
}
function renderMemoryLeaves(){
  els.memoryLeaves.innerHTML="";const positions=[[23,31],[42,18],[62,26],[73,42],[46,42],[29,49],[55,8],[13,45],[72,15],[36,2],[54,54],[83,31],[19,14],[64,5],[37,58],[7,29],[79,55],[51,28],[31,24],[61,48],[46,12],[24,59],[70,35],[14,38]];
  memories.slice(-24).forEach((memory,i)=>{const btn=document.createElement("button");btn.className="memory-leaf";btn.type="button";btn.textContent="🍁";btn.title=memory.caption||"Open memory";const[x,y]=positions[i%positions.length];btn.style.left=`${x}%`;btn.style.top=`${y}%`;btn.addEventListener("click",e=>{e.stopPropagation();openPhotoViewer(memory);});els.memoryLeaves.append(btn);});
}
function openPhotoViewer(memory){els.viewerImage.src=memory.image;els.viewerCaption.textContent=memory.caption||"A little moment with Maple.";els.viewerDate.textContent=formatDate(memory.date);els.photoViewer.classList.remove("hidden");}
function closePhotoViewer(){els.photoViewer.classList.add("hidden");els.viewerImage.src="";}
async function deleteMemory(id){if(!confirm("Delete this memory of Maple?"))return;await dbDelete(id);memories=memories.filter(m=>m.id!==id);renderMemories();updateProgressUI();}
$("#addMemoryButton").addEventListener("click",()=>els.memoryFileInput.click());
els.memoryFileInput.addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith("image/")){els.uploadStatus.textContent="Please choose an image.";return;}els.uploadStatus.textContent="Preparing photo…";try{selectedMemoryImage=await compressImage(file);els.memoryPreview.src=selectedMemoryImage;els.memoryUploadPanel.classList.remove("hidden");els.uploadStatus.textContent="";els.memoryCaption.focus();}catch{els.uploadStatus.textContent="That photo could not be prepared.";}});
els.saveMemoryButton.addEventListener("click",async()=>{if(!selectedMemoryImage){els.uploadStatus.textContent="Choose a photo first.";return;}const memory={id:crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`,image:selectedMemoryImage,caption:els.memoryCaption.value.trim(),date:els.memoryDate.value||todayKey(),createdAt:new Date().toISOString()};try{await dbPut(memory);memories.push(memory);renderMemories();resetMemoryUpload();updateProgressUI();showMessage("A new leaf has grown on Meeps' tree. 🍁❤️",3800);playSoftSound("memory");}catch(e){console.error(e);els.uploadStatus.textContent="This memory could not be saved on this device.";}});
function resetMemoryUpload(){selectedMemoryImage=null;els.memoryFileInput.value="";els.memoryPreview.src="";els.memoryCaption.value="";els.memoryDate.value=todayKey();els.uploadStatus.textContent="";els.memoryUploadPanel.classList.add("hidden");}
els.cancelMemoryButton.addEventListener("click",resetMemoryUpload);
$("#treeButton").addEventListener("click",()=>{els.memoriesScreen.classList.remove("hidden");setActiveNav("memoriesButton");});
$("#memoriesButton").addEventListener("click",()=>{els.memoriesScreen.classList.remove("hidden");setActiveNav("memoriesButton");});
$("#closeMemoriesButton").addEventListener("click",()=>{els.memoriesScreen.classList.add("hidden");setActiveNav("homeButton");});
$("#closePhotoViewer").addEventListener("click",closePhotoViewer);els.photoViewer.addEventListener("click",e=>{if(e.target===els.photoViewer)closePhotoViewer();});

/* ---------- Settings / navigation ---------- */
function applySettings(){els.visitFrequency.value=settings.visitFrequency;els.soundToggle.checked=settings.sound;els.weatherToggle.checked=settings.weather;els.surpriseToggle.checked=settings.surprises;els.motionToggle.checked=settings.reducedMotion;document.body.classList.toggle("reduced-motion",settings.reducedMotion);document.body.classList.toggle("weather-effects-off",!settings.weather);}
function readSettings(){settings={visitFrequency:els.visitFrequency.value,sound:els.soundToggle.checked,weather:els.weatherToggle.checked,surprises:els.surpriseToggle.checked,reducedMotion:els.motionToggle.checked};saveSettings();applySettings();scheduleBehavior(false);}
$("#settingsButton").addEventListener("click",()=>els.settingsScreen.classList.remove("hidden"));$("#closeSettingsButton").addEventListener("click",()=>els.settingsScreen.classList.add("hidden"));
els.visitFrequency.addEventListener("change",readSettings);els.soundToggle.addEventListener("change",()=>{readSettings();if(settings.sound)playSoftSound("heart");});els.weatherToggle.addEventListener("change",readSettings);els.surpriseToggle.addEventListener("change",readSettings);els.motionToggle.addEventListener("change",readSettings);
$("#homeButton").addEventListener("click",()=>{els.memoriesScreen.classList.add("hidden");els.settingsScreen.classList.add("hidden");els.feedModal.classList.add("hidden");els.playModal.classList.add("hidden");els.noteModal.classList.add("hidden");setActiveNav("homeButton");});
function setActiveNav(id){$$('.nav-button').forEach(b=>b.classList.toggle("active",b.id===id));}

/* ---------- Rare / ambient moments ---------- */
function maybeRareEvent(){
  if(!settings.weather||!settings.surprises||state.lastRareEventDate===todayKey())return;const chance=seededNumber(todayKey()+"meeps-rare-v32");if(chance>.52)return;state.lastRareEventDate=todayKey();saveState();let type="butterfly";if(currentTimePhase==="night")type="shooting-star";else if(currentWeather==="rain")type="rainbow";else if(chance<.20)type="butterfly";else type="rainbow";
  setTimeout(()=>{els.rareEvent.className=`rare-event ${type}`;els.rareEvent.classList.remove("hidden");const msg=type==="shooting-star"?"A shooting star passes over Meeps' garden. ✨":type==="rainbow"?"A little rainbow found the garden. 🌈":"A butterfly came to visit Meeps. 🦋";showAmbient(msg,4300);setTimeout(()=>{els.rareEvent.className="rare-event";},7600);},settings.reducedMotion?300:3200);
}
function startAmbientMoments(){ setInterval(()=>{if(document.hidden||behaviorBusy)return;const moments=currentTimePhase==="night"?["The lanterns are glowing softly. ✨","A few fireflies have come out to see Meeps.","The garden has gone very quiet. 🌙"]:["A bee is busy in the flowers. 🐝","The leaves rustle above Meeps. 🍃","A butterfly drifts through the garden. 🦋","The flowers are swaying in the breeze. 🌼"];if(Math.random()<.45)showAmbient(choice(moments),2400);},22000); }

/* ---------- Tiny sound engine ---------- */
function ensureAudio(){if(!audioContext)audioContext=new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==="suspended")audioContext.resume();return audioContext;}
function playSoftSound(kind="pet"){
  if(!settings.sound)return;try{const ctx=ensureAudio();const osc=ctx.createOscillator();const gain=ctx.createGain();const freq={pet:520,heart:620,feed:430,toy:480,memory:690,happy:760}[kind]||520;osc.type="sine";osc.frequency.value=freq;gain.gain.setValueAtTime(.0001,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.035,ctx.currentTime+.02);gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+.24);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+.25);}catch(e){console.warn("Sound unavailable",e);}
}

/* ---------- Opening sequence ---------- */
function openingSequence(){
  const messages={dawn:["Morning, baby Meeps. 🌤️","The garden is waking up with Meeps."],day:["Meeps is pottering around her garden. 🌿","A little sunny visit with Meeps. ❤️"],dusk:["The garden is getting golden. 🍁","Meeps is settling into the evening."],night:["Meeps is safe and sleepy in her garden. 🌙","A quiet little night with Meeps. ✨"]};
  setTimeout(()=>showMessage(choice(messages[currentTimePhase]),3200),550);
  setTimeout(()=>{if(!behaviorBusy)showAmbient("Tip: tap the pond, flowers, blanket, carrots or her toys — Meeps will come over. 🐰",5200);},3900);
  setTimeout(()=>{if(!behaviorBusy)binky(false);},7600);
}

/* ---------- Escape / resize / service worker ---------- */
document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;els.feedModal.classList.add("hidden");els.playModal.classList.add("hidden");els.noteModal.classList.add("hidden");els.memoriesScreen.classList.add("hidden");els.settingsScreen.classList.add("hidden");closePhotoViewer();setActiveNav("homeButton");});
window.addEventListener("resize",positionMessageBubble);
document.addEventListener("visibilitychange",()=>{if(document.hidden)clearTimeout(wanderTimer);else scheduleBehavior(true);});
if("serviceWorker" in navigator){window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(console.warn));}

/* ---------- Initialise ---------- */
async function initialise(){
  recordVisit();applySettings();applyWorld();await loadMemories();updateProgressUI();els.memoryDate.value=todayKey();scheduleBehavior(true);maybeRareEvent();openingSequence();startAmbientMoments();setInterval(applyWorld,60000);
}
document.addEventListener("DOMContentLoaded",initialise);
