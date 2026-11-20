/* Gemlight — a calm match-3. No timer, no fail state. */
(() => {
'use strict';
const APP_VERSION = '1.4.1';
const $ = s => document.querySelector(s);
const missing = [];
const on = (sel,ev,fn) => { const el=$(sel); if(el) el.addEventListener(ev,fn); else missing.push(sel); };
const clamp = (v,a,b) => v<a?a:v>b?b:v;
const lerp = (a,b,t) => a+(b-a)*t;
const rnd = (a=1,b) => b===undefined ? Math.random()*a : a+Math.random()*(b-a);
const irnd = n => (Math.random()*n)|0;
const easeIO = t => t<.5 ? 2*t*t : 1-((-2*t+2)**2)/2;
const easeO = t => 1-(1-t)**3;
const hx = h => [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const mix = (h1,h2,t) => { const a=hx(h1),b=hx(h2); return `rgb(${a.map((v,i)=>Math.round(lerp(v,b[i],t))).join(',')})`; };
const rgba = (h,a) => { const c=hx(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };
const fmt = n => (n|0).toLocaleString();
const nat = v => { v=Number(v); return Number.isFinite(v)&&v>0 ? Math.floor(v) : 0; };

/* ---------- data ---------- */
const SHAPES = ['circle','cushion','triangle','hexagon','teardrop','heart','pentagon'];
const NAMES  = ['Ruby','Citrine','Peridot','Sapphire','Amethyst','Rose Quartz','Aquamarine'];
const PLANTS = ['Camellia','Marigold','Fern','Succulent','Lavender','Rose','Water Lily'];
const PLANT_LINES = [
  'A quiet red bloom that opens a little wider with every evening of play.',
  'Little suns in a pot. They lean toward whichever window is brightest.',
  'It unfurls one frond at a time, never in a hurry.',
  'It stores every drop it is given and asks for nothing back.',
  'The whole sill smells like calm when this one is in bloom.',
  'The classic. Slow to bud, worth the wait, first to be missed.',
  'It floats a single flower on still water and calls that enough.'
];
const PALETTES = {
  dusty: { label:'Dusty Blue', bg:['#0e1622','#172536','#1f3349'], panel:'#1c2b3f', cell:'#152238',
    accent:'#8fb8dd', accent2:'#d3e5f5', text:'#e9f1f9', muted:'#93a7bd',
    jewels:['#e2637e','#e9b45b','#8fd0a0','#57b0f2','#b58cf0','#f28bb8','#5fd2c8'] },
  sorbet:{ label:'Sorbet', light:true, bg:['#f7ecdc','#f3e3cd','#eed7bd'], panel:'#fff8ee', cell:'#f1e3cd',
    accent:'#c07a45', accent2:'#8a5a2e', text:'#584431', muted:'#a5907a',
    jewels:['#d95f76','#dd9a35','#5fa87e','#3f8fd6','#9268d8','#e06a9c','#2fa89e'] },
  sea:   { label:'Sea Glass', bg:['#0c1d21','#123037','#1b454e'], panel:'#15323a', cell:'#0f2730',
    accent:'#7fd0c9', accent2:'#d8f3ef', text:'#e6f5f3', muted:'#8fb5b1',
    jewels:['#f2708a','#f0b45e','#9ad6a0','#5ec2f7','#c49af5','#f79cc4','#7fe0d4'] },
  ember: { label:'Ember', bg:['#1c130e','#2a1c13','#3c2818'], panel:'#2d2015', cell:'#241a10',
    accent:'#f0a35e', accent2:'#ffe3c2', text:'#f7ece2', muted:'#b59a85',
    jewels:['#ff6f7d','#ffc35e','#a8d98a','#6ec3ff','#cf9fff','#ff9ec6','#7fe0c8'] },
  rosewood:{ label:'Rosewood', bg:['#1e1216','#2c1a20','#3d2530'], panel:'#2e1c23', cell:'#251620',
    accent:'#e79aab', accent2:'#ffd9e2', text:'#f8e9ee', muted:'#b8949e',
    jewels:['#ff6f86','#f0b45e','#9ad6a0','#6ec3ff','#cf9fff','#ff9ec6','#7fe0c8'] },
  orchid:{ label:'Orchid', bg:['#1a1220','#281a33','#3a2749'], panel:'#2a1d36', cell:'#221730',
    accent:'#cf9fff', accent2:'#f0e2ff', text:'#f4ecfb', muted:'#b09ac4',
    jewels:['#ff7d92','#ffc95e','#9ad6a0','#6ec3ff','#d4a4ff','#ff9ec6','#7fe0c8'] },
  glacier:{ label:'Glacier', light:true, bg:['#eaf2f8','#dfeaf4','#d2e2f0'], panel:'#f6fbff', cell:'#e3eef8',
    accent:'#4a7fa8', accent2:'#2c5a80', text:'#2f4356', muted:'#8aa2b6',
    jewels:['#d1556e','#d09328','#4f9d78','#2f7fc4','#8158cf','#d4568c','#1f9c94'] },
  matcha:{ label:'Matcha', light:true, bg:['#eef2e2','#e4ebd4','#d8e3c6'], panel:'#f7faef', cell:'#e6edd8',
    accent:'#6f8f4f', accent2:'#42562c', text:'#3d4a2c', muted:'#8a9a76',
    jewels:['#c85a68','#cf9430','#5c9a5e','#3d86bd','#8a63c4','#d4638f','#2f9c8e'] },
  midnight:{ label:'Midnight', bg:['#0a0d1c','#121732','#1c2348'], panel:'#161c38', cell:'#111631',
    accent:'#8f9bff', accent2:'#dfe4ff', text:'#eceffd', muted:'#98a0c4',
    jewels:['#f2637e','#e9b45b','#8fd0a0','#57b0f2','#b58cf0','#f28bb8','#5fd2c8'] }
};
const LEGACY_PAL = { sorbet:300, sea:1200, ember:3000 };
const LS = 'gemlight.v1';
const DEF = { sound:true, music:false, volume:.8, motion:false, zen:false, size:8, colors:6, hint:8,
  palette:'dusty', particles:'spark', tray:'glass', scene:'aurora', chimes:'musicbox' };
const freshStats = () => ({ jewels:0, bestCascade:0, bestSession:0, sessions:0, perType:[0,0,0,0,0,0,0],
  seenIntro:false, notified:[], lit:[], prisms:0, blooms:0, comets:0, stirs:0, hints:0,
  palettesUsed:['dusty'], gardenSeen:[0,0,0,0,0,0,0], skySeen:0 });
let S = {...DEF};
let stats = freshStats();
let grid=[], score=0, shownScore=0, lastMilestone=0;
let N=8, K=6, tab='play', canStore=false;

/* ---------- reward catalogs ---------- */
const LABELS = {
  palette:{ sorbet:'Sorbet palette', sea:'Sea Glass palette', ember:'Ember palette', rosewood:'Rosewood palette',
    orchid:'Orchid palette', glacier:'Glacier palette', matcha:'Matcha palette', midnight:'Midnight palette' },
  particles:{ spark:'Classic sparks', petals:'Petals', bubbles:'Bubbles', fireflies:'Fireflies', stardust:'Stardust',
    rainbow:'Rainbow dust', confetti:'Confetti', snowfall:'Snowfall' },
  tray:{ glass:'Glass tray', wood:'Walnut tray', ceramic:'Ceramic tray', moss:'Moss tray', lacquer:'Lacquer tray',
    moonstone:'Moonstone tray', slate:'Slate tray', brass:'Brass tray' },
  scene:{ aurora:'Aurora', rain:'Rainy window', snow:'Snowfall', embers:'Firelight', dawn:'Dawn',
    comets:'Comet night', fireflies:'Firefly evening', petals:'Petal drift' },
  chimes:{ musicbox:'Music box', kalimba:'Kalimba', glass:'Glass harp', celesta:'Celesta', bells:'Small bells', dulcimer:'Dulcimer' },
  decor:{ lights:'String lights', lantern:'Paper lantern', butterfly:'A butterfly', cat:'A sleeping cat',
    chime:'A wind chime', bird:'A small bird' }
};
const BASE = { palette:'dusty', particles:'spark', tray:'glass', scene:'aurora', chimes:'musicbox' };
const rewardUnlocked = (type,id) => (BASE[type]===id) ||
  MILESTONES.some(m => m.reward && m.reward.type===type && m.reward.id===id && stats.lit.includes(m.id));
const unlocked = id => id==='dusty' ||
  MILESTONES.some(m => m.reward && m.reward.type==='palette' && m.reward.id===id && stats.lit.includes(m.id)) ||
  (LEGACY_PAL[id]!==undefined && stats.jewels>=LEGACY_PAL[id]);
const pal = () => PALETTES[S.palette] || PALETTES.dusty;

/* ---------- the constellation: 40 stars ---------- */
const MILESTONES = [
  {id:'s1', x:14,y:88, metric:'jewels', goal:300,   title:'First Light',        desc:'Clear 300 jewels.',                reward:{type:'palette',id:'sorbet'}},
  {id:'s2', x:26,y:80, metric:'cascade',goal:3,     title:'A Small Chain',      desc:'Reach a ×3 cascade.',              reward:{type:'particles',id:'petals'}},
  {id:'s3', x:38,y:86, metric:'sessions',goal:5,    title:'Five Evenings',      desc:'Start 5 boards.',                  reward:{type:'chimes',id:'kalimba'}},
  {id:'s4', x:50,y:78, metric:'blooms', goal:10,    title:'Ten Blooms',         desc:'Create 10 Bloom jewels.',          reward:{type:'decor',id:'lights'}},
  {id:'s5', x:62,y:84, metric:'type5',  goal:300,   title:'Rosewood Hour',      desc:'Clear 300 Rose Quartz.',           reward:{type:'palette',id:'rosewood'}},
  {id:'s6', x:74,y:76, metric:'jewels', goal:1200,  title:'Tide Glass',         desc:'Clear 1,200 jewels.',              reward:{type:'palette',id:'sea'}},
  {id:'s7', x:84,y:66, metric:'cascade',goal:5,     title:'The Long Chime',     desc:'Reach a ×5 cascade.',              reward:{type:'tray',id:'wood'}},
  {id:'s8', x:76,y:56, metric:'prisms', goal:1,     title:'Light, Split',       desc:'Make your first Prism.',           reward:{type:'chimes',id:'bells'}},
  {id:'s9', x:64,y:60, metric:'hints',  goal:25,    title:'A Little Help',      desc:'Use 25 hints. Nothing wrong with that.', reward:{type:'chimes',id:'glass'}},
  {id:'s10',x:52,y:54, metric:'type2',  goal:500,   title:'Green Thumb',        desc:'Clear 500 Peridot.',               reward:{type:'decor',id:'butterfly'}},
  {id:'s11',x:40,y:60, metric:'stirs',  goal:10,    title:'Stirred, Not Rushed',desc:'Stir the board 10 times.',         reward:{type:'scene',id:'rain'}},
  {id:'s12',x:28,y:52, metric:'comets', goal:10,    title:'Ten Comets',         desc:'Create 10 Comet jewels.',          reward:{type:'particles',id:'confetti'}},
  {id:'s13',x:18,y:42, metric:'sessions',goal:15,   title:'Fifteen Evenings',   desc:'Start 15 boards.',                 reward:{type:'particles',id:'bubbles'}},
  {id:'s14',x:26,y:32, metric:'jewels', goal:3000,  title:'Ember Hour',         desc:'Clear 3,000 jewels.',              reward:{type:'palette',id:'ember'}},
  {id:'s15',x:38,y:38, metric:'type0',  goal:500,   title:'Camellia Red',       desc:'Clear 500 Ruby.',                  reward:{type:'tray',id:'brass'}},
  {id:'s16',x:50,y:30, metric:'blooms', goal:50,    title:'A Full Shelf',       desc:'Create 50 Bloom jewels.',          reward:{type:'tray',id:'ceramic'}},
  {id:'s17',x:62,y:36, metric:'type4',  goal:500,   title:'Lavender Dusk',      desc:'Clear 500 Amethyst.',              reward:{type:'scene',id:'fireflies'}},
  {id:'s18',x:74,y:28, metric:'cascade',goal:7,     title:'Seven Deep',         desc:'Reach a ×7 cascade.',              reward:{type:'scene',id:'snow'}},
  {id:'s19',x:86,y:20, metric:'prisms', goal:10,    title:'Ten Prisms',         desc:'Create 10 Prisms.',                reward:{type:'particles',id:'fireflies'}},
  {id:'s20',x:78,y:10, metric:'type1',  goal:500,   title:'Marigold Sun',       desc:'Clear 500 Citrine.',               reward:{type:'decor',id:'lantern'}},
  {id:'s21',x:64,y:14, metric:'sessions',goal:40,   title:'Forty Evenings',     desc:'Start 40 boards.',                 reward:{type:'tray',id:'moss'}},
  {id:'s22',x:52,y:8,  metric:'type3',  goal:500,   title:'Still Water',        desc:'Clear 500 Sapphire.',              reward:{type:'decor',id:'cat'}},
  {id:'s23',x:40,y:14, metric:'comets', goal:40,    title:'Comet Weather',      desc:'Create 40 Comets.',                reward:{type:'tray',id:'lacquer'}},
  {id:'s24',x:28,y:8,  metric:'type6',  goal:300,   title:'One Lily',           desc:'Clear 300 Aquamarine. Aquamarine only appears on the 7-jewel board.', reward:{type:'palette',id:'glacier'}},
  {id:'s25',x:16,y:16, metric:'jewels', goal:8000,  title:'Orchid Night',       desc:'Clear 8,000 jewels.',              reward:{type:'palette',id:'orchid'}},
  {id:'s26',x:10,y:28, metric:'hints',  goal:100,   title:'Patience',           desc:'Use 100 hints.',                   reward:{type:'decor',id:'chime'}},
  {id:'s27',x:12,y:52, metric:'stirs',  goal:40,    title:'Fresh Start, Again', desc:'Stir 40 times.',                   reward:{type:'particles',id:'stardust'}},
  {id:'s28',x:8, y:66, metric:'prisms', goal:40,    title:'Forty Prisms',       desc:'Create 40 Prisms.',                reward:{type:'scene',id:'embers'}},
  {id:'s29',x:14,y:74, metric:'jewels', goal:15000, title:'Fifteen Thousand',   desc:'Clear 15,000 jewels.',             reward:{type:'particles',id:'rainbow'}},
  {id:'s30',x:88,y:44, metric:'sessions',goal:80,   title:'Eighty Evenings',    desc:'Start 80 boards.',                 reward:{type:'decor',id:'bird'}},
  {id:'s31',x:92,y:56, metric:'blooms', goal:120,   title:'Garden in Full',     desc:'Create 120 Blooms.',               reward:{type:'chimes',id:'celesta'}},
  {id:'s32',x:90,y:78, metric:'jewels', goal:25000, title:'Moonstone',          desc:'Clear 25,000 jewels.',             reward:{type:'tray',id:'moonstone'}},
  {id:'s33',x:60,y:94, metric:'cascade',goal:9,     title:'Nine Deep',          desc:'Reach a ×9 cascade.',              reward:{type:'scene',id:'dawn'}},
  {id:'s34',x:44,y:94, metric:'type5',  goal:2000,  title:'Two Thousand Roses', desc:'Clear 2,000 Rose Quartz.',         reward:{type:'scene',id:'petals'}},
  {id:'s35',x:28,y:94, metric:'comets', goal:120,   title:'A Sky of Comets',    desc:'Create 120 Comets.',               reward:{type:'scene',id:'comets'}},
  {id:'s36',x:90,y:90, metric:'prisms', goal:100,   title:'Midnight',           desc:'Create 100 Prisms.',               reward:{type:'palette',id:'midnight'}},
  {id:'s37',x:6, y:40, metric:'jewels', goal:40000, title:'Forty Thousand',     desc:'Clear 40,000 jewels.',             reward:{type:'palette',id:'matcha'}},
  {id:'s38',x:94,y:32, metric:'jewels', goal:60000, title:'Sixty Thousand',     desc:'Clear 60,000 jewels.',             reward:{type:'tray',id:'slate'}},
  {id:'s39',x:50,y:46, metric:'stars',  goal:30,    title:'Most of the Sky',    desc:'Light 30 stars.',                  reward:{type:'particles',id:'snowfall'}},
  {id:'s40',x:50,y:22, metric:'stars',  goal:39,    title:'The Whole Journey',  desc:'Light 39 stars.',                  reward:{type:'chimes',id:'dulcimer'}}
];
const metricValue = m => m.metric==='jewels'?stats.jewels : m.metric==='cascade'?stats.bestCascade :
  m.metric==='sessions'?stats.sessions : m.metric==='stirs'?stats.stirs : m.metric==='hints'?stats.hints :
  m.metric==='prisms'?stats.prisms : m.metric==='blooms'?stats.blooms : m.metric==='comets'?stats.comets :
  m.metric==='stars'?stats.lit.length : m.metric.startsWith('type')?stats.perType[+m.metric.slice(4)] : 0;

/* ---------- save codec (encoding + integrity check, not real security) ---------- */
const SECRET = 'gemlight·dusty·2026·keep-it-kind';
function h32(str,seed){
  let h=seed>>>0;
  for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619)>>>0; }
  h^=h>>>15; h=Math.imul(h,2246822507)>>>0; h^=h>>>13; h=Math.imul(h,3266489909)>>>0; h^=h>>>16;
  return h>>>0;
}
function sig(s){
  const k=SECRET+'|'+s.length+'|';
  return [h32(k+s,2166136261),h32(s+k,2246822519),h32(k+s+k,3266489917)]
    .map(x=>x.toString(36).padStart(7,'0')).join('');
}
function keystream(n){
  let s=h32(SECRET,0x9e3779b9)||1; const out=new Uint8Array(n);
  for(let i=0;i<n;i++){ s^=s<<13; s>>>=0; s^=s>>>17; s^=s<<5; s>>>=0; out[i]=s&255; }
  return out;
}
function xorBytes(bytes){ const ks=keystream(bytes.length), out=new Uint8Array(bytes.length);
  for(let i=0;i<bytes.length;i++) out[i]=bytes[i]^ks[i]; return out; }
function b64enc(bytes){ let s=''; for(let i=0;i<bytes.length;i+=0x8000) s+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000)); return btoa(s); }
function b64dec(str){ const bin=atob(str), out=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i); return out; }
function encodePayload(o){ return b64enc(xorBytes(new TextEncoder().encode(JSON.stringify(o)))); }
function decodePayload(b){ return JSON.parse(new TextDecoder().decode(xorBytes(b64dec(b)))); }
function payload(){ return { S, stats, score, lastMilestone,
  grid: grid.map(r=>r.map(j=>j?{t:j.t,sp:j.sp}:null)) }; }
function envelope(){ const d=encodePayload(payload()); return JSON.stringify({v:2,d,h:sig(d)}); }

function storageOK(){
  try{ const k='gemlight.probe'; localStorage.setItem(k,'1');
    const v=localStorage.getItem(k); localStorage.removeItem(k); return v==='1'; }catch(e){ return false; }
}
function save(){ if(!canStore) return;
  try{ localStorage.setItem(LS, envelope()); }catch(e){ canStore=false; showStoreWarn(); syncStoreState(); } }

function sanitizeSettings(raw){
  const s={...DEF};
  if(raw&&typeof raw==='object'){
    for(const k of ['sound','music','motion','zen']) if(typeof raw[k]==='boolean') s[k]=raw[k];
    if(Number.isFinite(+raw.volume)) s.volume=clamp(+raw.volume,0,1);
    if(raw.size===7||raw.size===8) s.size=raw.size;
    if(raw.colors===6||raw.colors===7) s.colors=raw.colors;
    if([0,5,8,15].includes(+raw.hint)) s.hint=+raw.hint;
    for(const k of ['palette','particles','tray','scene','chimes']) if(typeof raw[k]==='string') s[k]=raw[k];
  }
  return s;
}
function sanitizeStats(raw){
  const s=freshStats();
  if(!raw||typeof raw!=='object') return s;
  for(const k of ['jewels','bestCascade','bestSession','sessions','prisms','blooms','comets','stirs','hints','skySeen']) s[k]=nat(raw[k]);
  if(Array.isArray(raw.perType)) for(let i=0;i<7;i++) s.perType[i]=nat(raw.perType[i]);
  if(Array.isArray(raw.gardenSeen)) for(let i=0;i<7;i++) s.gardenSeen[i]=clamp(nat(raw.gardenSeen[i]),0,4);
  if(Array.isArray(raw.palettesUsed)) s.palettesUsed=raw.palettesUsed.filter(id=>PALETTES[id]);
  if(!s.palettesUsed.includes('dusty')) s.palettesUsed.unshift('dusty');
  s.seenIntro=!!raw.seenIntro;
  s.bestCascade=clamp(s.bestCascade,0,99);
  return s;
}
/* Stars are always re-derived from the counters, never trusted from the file. */
function deriveLit(){
  stats.lit=[];
  for(let pass=0;pass<4;pass++){
    let added=false;
    for(const m of MILESTONES) if(!stats.lit.includes(m.id)&&metricValue(m)>=m.goal){ stats.lit.push(m.id); added=true; }
    if(!added) break;
  }
}
function readSave(raw){
  if(!raw) return null;
  try{
    const env=JSON.parse(raw);
    if(env&&env.v===2&&typeof env.d==='string'&&typeof env.h==='string'){
      if(sig(env.d)!==env.h) return null;
      const o=decodePayload(env.d);
      return o&&typeof o==='object'?o:null;
    }
    if(env&&env.stats) return env;           // legacy plain save → migrated on next write
  }catch(e){}
  return null;
}
function applyPayload(o){
  S=sanitizeSettings(o.S);
  stats=sanitizeStats(o.stats);
  deriveLit();
  for(const k of ['particles','tray','scene','chimes']) if(!rewardUnlocked(k,S[k])) S[k]=BASE[k];
  if(!PALETTES[S.palette]||!unlocked(S.palette)) S.palette='dusty';
  score=nat(o.score); shownScore=score; lastMilestone=nat(o.lastMilestone);
  N=S.size; K=S.colors; grid=[];
  if(Array.isArray(o.grid)&&o.grid.length===N&&o.grid.every(r=>Array.isArray(r)&&r.length===N)){
    grid=o.grid.map((row,r)=>row.map((c,cc)=>{
      if(!c||typeof c.t!=='number'||c.t>=K||c.t<-1) return null;
      let sp=(c.sp==='bloom'||c.sp==='comet'||c.sp==='prism')?c.sp:null;
      let t=Math.floor(c.t);
      if(sp==='prism') t=-1; else if(t<0) return null;
      return mk(t,r,cc,sp);
    }));
    if(grid.flat().some(j=>!j)||findMatches().length||!hasMove()) grid=[];
  }
  return grid.length>0;
}

/* ---------- geometry & sprites ---------- */
const wrap=$('#boardWrap'), cv=$('#board'), ctx=cv?cv.getContext('2d'):null;
let W=0,H=0,dpr=1,cell=40,ox=0,oy=0, sprites=[], prismSpr=null, backdrop=null;
let lastW=0,lastH=0,lastDpr=0,lastCell=0,lastN=0,lastK=0;
const px = j => ox+(j.x+.5)*cell, py = j => oy+(j.y+.5)*cell;
function rr(c,x,y,w,h,r){ r=Math.min(r,w/2,h/2); c.beginPath(); c.moveTo(x+r,y);
  c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
function shapePath(c,shape,cx,cy,R){
  c.beginPath();
  if(shape==='circle'){ c.arc(cx,cy,R,0,7); }
  else if(shape==='cushion'){ rr(c,cx-R,cy-R,R*2,R*2,R*.38); }
  else if(shape==='teardrop'){
    c.moveTo(cx,cy-R); c.bezierCurveTo(cx+R*.82,cy-R*.32,cx+R*.86,cy+R*.34,cx,cy+R*.82);
    c.bezierCurveTo(cx-R*.86,cy+R*.34,cx-R*.82,cy-R*.32,cx,cy-R);
  } else if(shape==='heart'){
    c.moveTo(cx,cy+R*.78); c.bezierCurveTo(cx-R*1.12,cy+R*.02,cx-R*.74,cy-R*.86,cx,cy-R*.24);
    c.bezierCurveTo(cx+R*.74,cy-R*.86,cx+R*1.12,cy+R*.02,cx,cy+R*.78);
  } else {
    const n = shape==='triangle'?3 : shape==='hexagon'?6 : 5;
    for(let i=0;i<n;i++){ const a=-Math.PI/2+i*2*Math.PI/n;
      i?c.lineTo(cx+R*Math.cos(a),cy+R*Math.sin(a)):c.moveTo(cx+R*Math.cos(a),cy+R*Math.sin(a)); }
    c.closePath();
  }
}
function bakeJewel(color, shape){
  const P=cell*1.28, s=document.createElement('canvas');
  s.width=s.height=Math.max(8,Math.round(P*dpr));
  const c=s.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0);
  const cx=P/2, cy=P/2, R=cell*.36;
  const g=c.createRadialGradient(cx-R*.35,cy-R*.4,R*.08,cx,cy,R*1.05);
  g.addColorStop(0,mix(color,'#ffffff',.6)); g.addColorStop(.45,color); g.addColorStop(1,mix(color,'#000000',.38));
  c.shadowColor=rgba(color,.55); c.shadowBlur=cell*.16;
  shapePath(c,shape,cx,cy,R); c.fillStyle=g; c.fill();
  c.shadowBlur=0; c.lineWidth=Math.max(1,cell*.025);
  shapePath(c,shape,cx,cy,R); c.strokeStyle=mix(color,'#000000',.45); c.globalAlpha=.7; c.stroke(); c.globalAlpha=1;
  c.save(); c.translate(cx,cy); c.scale(.58,.58); c.translate(-cx,-cy);
  shapePath(c,shape,cx,cy,R); c.fillStyle='rgba(255,255,255,.10)'; c.fill();
  c.lineWidth=Math.max(1,cell*.02); c.strokeStyle='rgba(255,255,255,.32)'; c.stroke(); c.restore();
  c.save(); c.translate(cx-R*.3,cy-R*.38); c.rotate(-.5);
  c.beginPath(); c.ellipse(0,0,R*.22,R*.11,0,0,7); c.fillStyle='rgba(255,255,255,.55)'; c.fill(); c.restore();
  return s;
}
function bake(){
  sprites=[]; for(let i=0;i<7;i++) sprites.push(bakeJewel(pal().jewels[i],SHAPES[i]));
  prismSpr=bakeJewel('#c9d4e4','circle');
}
/* Halo + 64 sockets are static: bake once, blit every frame. */
function buildBackdrop(){
  if(!W||!H) return;
  backdrop=document.createElement('canvas');
  backdrop.width=Math.max(1,Math.round(W*dpr)); backdrop.height=Math.max(1,Math.round(H*dpr));
  const c=backdrop.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0);
  const p=pal();
  const halo=c.createRadialGradient(W/2,H/2,cell,W/2,H/2,Math.max(W,H)*.72);
  halo.addColorStop(0,rgba(p.accent,.07)); halo.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=halo; c.fillRect(0,0,W,H);
  for(let r=0;r<N;r++) for(let cc=0;cc<N;cc++){
    rr(c,ox+cc*cell+2,oy+r*cell+2,cell-4,cell-4,cell*.22);
    c.fillStyle=rgba(p.cell,.55); c.fill();
    c.strokeStyle=rgba(p.accent,.07); c.lineWidth=1; c.stroke();
  }
}
function remapFx(oldCell,oldOx,oldOy){
  if(!oldCell) return;
  const k=cell/oldCell;
  for(const p of particles){ p.x=ox+(p.x-oldOx)*k; p.y=oy+(p.y-oldOy)*k; p.size*=k; p.vx*=k; p.vy*=k; }
  for(const e of effects) if(e.kind==='ring'){ e.x=ox+(e.x-oldOx)*k; e.y=oy+(e.y-oldOy)*k; }
  for(const f of floats){ f.x=ox+(f.x-oldOx)*k; f.y=oy+(f.y-oldOy)*k; }
}
function resize(){
  if(!wrap||!ctx||!wrap.offsetParent) return;
  const r=wrap.getBoundingClientRect();
  if(r.width<10||r.height<10) return;
  const d=Math.min(2,window.devicePixelRatio||1);
  const vw=document.documentElement.clientWidth||Math.round(r.width);
  const w=Math.max(200,Math.min(Math.round(r.width), vw-28));
  const h=Math.round(r.height);
  N=S.size; K=S.colors;
  const cl=Math.max(24,Math.floor(Math.min(w,h)/N));
  if(w===lastW&&h===lastH&&d===lastDpr&&cl===lastCell&&N===lastN&&K===lastK&&sprites.length) return;
  if(Math.round(r.width)>vw-26) console.warn('Gemlight: wrap over-reported width', Math.round(r.width), 'vs', vw);
  const oldCell=lastCell, oldOx=ox, oldOy=oy;
  W=w; H=h; dpr=d; cell=cl;
  ox=(W-cell*N)/2; oy=(H-cell*N)/2;
  const bw=Math.round(W*dpr), bh=Math.round(H*dpr);
  if(cv.width!==bw||cv.height!==bh){ cv.width=bw; cv.height=bh; }
  ctx.setTransform(dpr,0,0,dpr,0,0);
  if(cl!==lastCell||d!==lastDpr||!sprites.length) bake();
  buildBackdrop(); remapFx(oldCell,oldOx,oldOy);
  lastW=w; lastH=h; lastDpr=d; lastCell=cl; lastN=N; lastK=K;
}

/* ---------- jewels & tweens ---------- */
function mk(t,r,c,sp=null){ return {t,sp,r,c,x:c,y:r,scale:1,alpha:1,land:0,glint:0,glintT:rnd(3,11)}; }
const T=[];
function tween(j,props,dur,ease=easeIO,delay=0,done=null){ T.push({j,props,from:null,t:-delay,dur,ease,done}); }
function stepTweens(dt){
  for(let i=T.length-1;i>=0;i--){ const tw=T[i]; tw.t+=dt; if(tw.t<0) continue;
    if(!tw.from){ tw.from={}; for(const k in tw.props) tw.from[k]=tw.j[k]; }
    const p=Math.min(1,tw.t/tw.dur), e=tw.ease(p);
    for(const k in tw.props) tw.j[k]=lerp(tw.from[k],tw.props[k],e);
    if(p>=1){ T.splice(i,1); tw.done&&tw.done(); }
  }
}
const allJewels = () => grid.flat().filter(Boolean);
const at = (r,c) => (r>=0&&r<N&&c>=0&&c<N) ? grid[r][c] : null;

/* ---------- matching ---------- */
function findMatches(){
  const runs=[];
  for(let r=0;r<N;r++){ let c=0; while(c<N){ const j=grid[r][c];
    if(!j||j.t<0){c++;continue;} let e=c+1;
    while(e<N&&grid[r][e]&&grid[r][e].t===j.t) e++;
    if(e-c>=3){ const cells=[]; for(let i=c;i<e;i++) cells.push(grid[r][i]); runs.push({cells,dir:'h'}); }
    c=e; } }
  for(let c=0;c<N;c++){ let r=0; while(r<N){ const j=grid[r][c];
    if(!j||j.t<0){r++;continue;} let e=r+1;
    while(e<N&&grid[e][c]&&grid[e][c].t===j.t) e++;
    if(e-r>=3){ const cells=[]; for(let i=r;i<e;i++) cells.push(grid[i][c]); runs.push({cells,dir:'v'}); }
    r=e; } }
  const groups=[];
  for(const run of runs){
    const hit=groups.filter(g=>run.cells.some(j=>g.set.has(j)));
    if(!hit.length){ groups.push({set:new Set(run.cells),runs:[run]}); }
    else{ const g=hit[0]; run.cells.forEach(j=>g.set.add(j)); g.runs.push(run);
      for(let i=1;i<hit.length;i++){ hit[i].set.forEach(j=>g.set.add(j)); g.runs.push(...hit[i].runs); groups.splice(groups.indexOf(hit[i]),1); } }
  }
  return groups.map(g=>{
    let maxLen=0, crossCell=null;
    const h=new Set(), v=new Set();
    for(const run of g.runs){ maxLen=Math.max(maxLen,run.cells.length);
      run.cells.forEach(j=>(run.dir==='h'?h:v).add(j)); }
    for(const j of h) if(v.has(j)) crossCell=j;
    return { cells:[...g.set], maxLen, cross:!!crossCell, crossCell };
  });
}
function matchAt(r,c){
  const j=grid[r][c]; if(!j||j.t<0) return false; const t=j.t;
  let n=1; for(let i=c-1;i>=0&&grid[r][i]&&grid[r][i].t===t;i--)n++;
  for(let i=c+1;i<N&&grid[r][i]&&grid[r][i].t===t;i++)n++;
  if(n>=3) return true;
  n=1; for(let i=r-1;i>=0&&grid[i][c]&&grid[i][c].t===t;i--)n++;
  for(let i=r+1;i<N&&grid[i][c]&&grid[i][c].t===t;i++)n++;
  return n>=3;
}
function eachPair(fn){
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){
    const a=grid[r][c]; if(!a) continue;
    for(const [dr,dc] of [[0,1],[1,0]]){
      const b=at(r+dr,c+dc); if(!b) continue;
      if(a.sp||b.sp){ if(fn(a,b)) return true; continue; }
      grid[r][c]=b; grid[r+dr][c+dc]=a;
      const ok=matchAt(r,c)||matchAt(r+dr,c+dc);
      grid[r][c]=a; grid[r+dr][c+dc]=b;
      if(ok&&fn(a,b)) return true;
    }
  }
  return false;
}
const hasMove = () => eachPair(()=>true);
const findHint = () => { let pair=null; eachPair((a,b)=>{pair=[a,b];return true;}); return pair; };

/* ---------- phases ---------- */
let phase='idle', phaseT=0, depth=0, swapA=null, swapB=null, pendingClear=null, hintPair=null, idleT=0, sel=null;
const setPhase=(p,d)=>{phase=p;phaseT=d;};
function swapGrid(a,b){
  grid[a.r][a.c]=b; grid[b.r][b.c]=a;
  const r=a.r,c=a.c; a.r=b.r; a.c=b.c; b.r=r; b.c=c;
}
function trySwap(a,b){
  if(phase!=='idle'||!a||!b) return;
  sel=null; hintPair=null; idleT=0;
  swapGrid(a,b);
  tween(a,{x:a.c,y:a.r},.15); tween(b,{x:b.c,y:b.r},.15);
  swapA=a; swapB=b; setPhase('swap',.17);
}
function afterSwap(){
  const a=swapA,b=swapB;
  if(a.sp||b.sp){ specialSwap(a,b); return; }
  const m=findMatches();
  if(!m.length){
    swapGrid(a,b);
    tween(a,{x:a.c,y:a.r},.15); tween(b,{x:b.c,y:b.r},.15);
    setPhase('swapback',.17); sndTuk();
  } else beginResolve(m,1,[a,b]);
}
function specialSwap(a,b){
  const set=new Set([a,b]), handled=new Set();
  const prisms=[a,b].filter(j=>j.sp==='prism');
  if(prisms.length===2){ allJewels().forEach(j=>set.add(j)); prisms.forEach(p=>handled.add(p)); }
  else if(prisms.length===1){
    const p=prisms[0], other=p===a?b:a;
    if(other.t>=0) allJewels().forEach(j=>{ if(j.t===other.t) set.add(j); });
    handled.add(p);
  }
  expandSpecials(set,new Set(),handled);
  beginClear(set,1,[]);
}
function expandSpecials(set,protectedSet,preDone){
  const q=[...set], done=new Set(preDone||[]);
  const add=j=>{ if(j&&!set.has(j)&&!protectedSet.has(j)){ set.add(j); q.push(j); } };
  while(q.length){
    const j=q.pop(); if(!j.sp||done.has(j)) continue; done.add(j);
    if(j.sp==='bloom'){
      effects.push({kind:'ring',x:px(j),y:py(j),t:0,dur:.5,color:'#ffffff'});
      for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) add(at(j.r+dr,j.c+dc));
    } else if(j.sp==='comet'){
      effects.push({kind:'beamH',r:j.r,t:0,dur:.4},{kind:'beamV',c:j.c,t:0,dur:.4});
      for(let i=0;i<N;i++){ add(at(j.r,i)); add(at(i,j.c)); }
    } else if(j.sp==='prism'){
      const types=[...new Set(allJewels().filter(x=>x.t>=0).map(x=>x.t))];
      if(types.length){ const t=types[irnd(types.length)];
        effects.push({kind:'ring',x:px(j),y:py(j),t:0,dur:.6,color:'#ffffff'});
        allJewels().forEach(x=>{ if(x.t===t) add(x); }); }
    }
  }
}
function beginResolve(groups,d,swapCells){
  depth=d;
  const clear=new Set(), creations=[];
  for(const g of groups){
    let kind=null;
    if(g.maxLen>=5) kind='prism'; else if(g.cross) kind='comet'; else if(g.maxLen===4) kind='bloom';
    let host=null;
    if(kind){
      host=(swapCells&&g.cells.find(j=>swapCells.includes(j)))||g.crossCell||g.cells[(g.cells.length/2)|0];
      if(host&&host.sp) host=null;
    }
    if(host) creations.push({j:host,kind});
    for(const j of g.cells) if(j!==host) clear.add(j);
  }
  for(const {j,kind} of creations){
    j.sp=kind; if(kind==='prism') j.t=-1;
    if(kind==='prism') stats.prisms++; else if(kind==='comet') stats.comets++; else stats.blooms++;
    effects.push({kind:'ring',x:px(j),y:py(j),t:0,dur:.5,color:'#ffffff'});
    tween(j,{scale:1.25},.14,easeO,0,()=>tween(j,{scale:1},.18));
  }
  if(creations.length) sndBorn();
  expandSpecials(clear,new Set(creations.map(c=>c.j)));
  beginClear(clear,d,creations);
}
function beginClear(set,d,creations){
  if(!set.size){ collapse(); return; }
  const gained=set.size*10*d;
  score+=gained; stats.jewels+=set.size; stats.bestCascade=Math.max(stats.bestCascade,d);
  stats.bestSession=Math.max(stats.bestSession,score);
  let cx=0,cy=0;
  set.forEach(j=>{ if(j.t>=0) stats.perType[j.t]++; cx+=px(j); cy+=py(j);
    spawnParticles(j); tween(j,{scale:1.3,alpha:0},.22,easeO); });
  cx/=set.size; cy/=set.size;
  floats.push({x:cx,y:cy,txt:'+'+gained,t:0,dur:.95,big:d>1});
  if(d>1){ const b=$('#cascade'); if(b){ b.textContent='×'+d; b.hidden=false; } }
  sndMatch(d);
  pendingClear=set; setPhase('clear',.25); updateHUD();
}
function afterClear(){
  pendingClear.forEach(j=>{ if(grid[j.r][j.c]===j) grid[j.r][j.c]=null; });
  pendingClear=null; collapse();
}
function collapse(){
  let maxDur=0;
  for(let c=0;c<N;c++){
    let write=N-1;
    for(let r=N-1;r>=0;r--){
      const j=grid[r][c]; if(!j) continue;
      if(write!==r){ grid[write][c]=j; grid[r][c]=null; j.r=write; }
      const dur=.1+(write-j.y)*.055;
      tween(j,{x:c,y:write},dur,easeO,0,()=>{j.land=1;});
      maxDur=Math.max(maxDur,dur); write--;
    }
    for(let r=write;r>=0;r--){
      const j=mk(irnd(K),r,c); j.y=r-(write+1); grid[r][c]=j;
      const dur=.1+(write+1)*.055+r*.012;
      tween(j,{x:c,y:r},dur,easeO,0,()=>{j.land=1;});
      maxDur=Math.max(maxDur,dur);
    }
  }
  setPhase('fall',maxDur+.04);
}
function afterFall(){
  const m=findMatches();
  if(m.length){ beginResolve(m,depth+1,null); return; }
  if(!hasMove()){ toast('No moves left — stirring the jewels ✨'); doStir(true); return; }
  finishTurn();
}
function finishTurn(){
  setPhase('idle',0); depth=0; hintPair=null; idleT=0;
  const cb=$('#cascade'); if(cb) cb.hidden=true;
  const m=(score/5000)|0;
  if(m>lastMilestone){ lastMilestone=m; celebrate(); sndChord(); toast(fmt(m*5000)+' sparkles ✨'); }
  checkMilestones(false);
  save(); updateHUD();
}
function doStir(auto){
  if(phase!=='idle'&&!auto) return;
  sel=null; hintPair=null;
  const jewels=allJewels(), pos=[];
  for(let r=0;r<N;r++) for(let c=0;c<N;c++) pos.push([r,c]);
  let tries=0;
  do{
    for(let i=pos.length-1;i>0;i--){ const k=irnd(i+1); [pos[i],pos[k]]=[pos[k],pos[i]]; }
    grid=Array.from({length:N},()=>Array(N).fill(null));
    jewels.forEach((j,i)=>{ j.r=pos[i][0]; j.c=pos[i][1]; grid[j.r][j.c]=j; });
    tries++;
  }while((findMatches().length||!hasMove())&&tries<150);
  jewels.forEach(j=>tween(j,{x:j.c,y:j.r},.5,easeIO,rnd(.06)));
  stats.stirs++; sndStir(); if(!auto) toast('Stirring the jewels ✨');
  setPhase('stir',.6); checkMilestones(false);
}
function afterStir(){
  const m=findMatches();
  if(m.length) beginResolve(m,1,null); else finishTurn();
}
function newBoard(countSession=true){
  T.length=0; particles.length=0; effects.length=0; floats.length=0;
  sel=null; hintPair=null; depth=0; score=0; shownScore=0; lastMilestone=0;
  const cb=$('#cascade'); if(cb) cb.hidden=true;
  let tries=0;
  do{
    grid=[];
    for(let r=0;r<N;r++){ const row=[];
      for(let c=0;c<N;c++){ let t;
        do{ t=irnd(K); }while((c>=2&&row[c-1].t===t&&row[c-2].t===t)||(r>=2&&grid[r-1][c].t===t&&grid[r-2][c].t===t));
        row.push(mk(t,r,c));
      } grid.push(row);
    }
    tries++;
  }while(!hasMove()&&tries<60);
  let maxDur=0;
  allJewels().forEach(j=>{ j.y=j.r-N-rnd(0,1.5);
    const d=.3+j.r*.035+j.c*.012; maxDur=Math.max(maxDur,d);
    tween(j,{x:j.c,y:j.r},d,easeO,0,()=>{j.land=1;}); });
  if(countSession) stats.sessions++;
  setPhase('fall',maxDur+.05); checkMilestones(false); save(); updateHUD();
}

/* ---------- particles / effects / floats ---------- */
const particles=[], effects=[], floats=[];
function spawnParticles(j){
  const style=S.particles, n=S.motion?2:(style==='stardust'?6:8);
  const col=pal().jewels[j.t>=0?j.t:3];
  for(let i=0;i<n;i++){
    const a=rnd(Math.PI*2), sp=rnd(40,170);
    const p={x:px(j),y:py(j),vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-40,t:0,dur:rnd(.4,.85),
      size:rnd(1.5,3.6)*(cell/45),col,style,rot:rnd(6.28),ph:rnd(6.28)};
    if(style==='snowfall'){ p.vx=rnd(-16,16); p.vy=rnd(8,34); p.dur=rnd(1,1.8); p.size=rnd(1.6,3.2)*(cell/45); }
    else if(style==='confetti'){ p.dur=rnd(.6,1.1); p.size=rnd(1.8,3.4)*(cell/45); }
    particles.push(p);
  }
}
function celebrate(){
  if(S.motion) return;
  for(let i=0;i<26;i++)
    particles.push({x:ox+rnd(cell*N),y:oy-rnd(20),vx:rnd(-24,24),vy:rnd(30,80),t:0,dur:rnd(1.3,2),
      size:rnd(3,6.5)*(cell/45),col:pal().jewels[irnd(K)],style:'petals',rot:rnd(6.28),ph:rnd(6.28)});
}
function stepFx(dt){
  for(let i=particles.length-1;i>=0;i--){ const p=particles[i]; p.t+=dt;
    if(p.t>=p.dur){particles.splice(i,1);continue;}
    if(p.style==='bubbles'){ p.vy-=90*dt; p.x+=Math.sin(p.t*6+p.ph)*22*dt; }
    else if(p.style==='fireflies'){ p.vx*=.985; p.vy*=.985; p.x+=Math.sin(p.t*3+p.ph)*30*dt; p.y+=Math.cos(p.t*2.4+p.ph)*24*dt; }
    else if(p.style==='petals'){ p.vy+=26*dt; p.rot+=dt*2; }
    else if(p.style==='confetti'){ p.vy+=95*dt; p.vx*=.99; p.rot+=dt*4.5; }
    else if(p.style==='snowfall'){ p.vy+=8*dt; p.x+=Math.sin(p.t*2+p.ph)*20*dt; }
    else p.vy+=130*dt;
    p.x+=p.vx*dt; p.y+=p.vy*dt; }
  for(let i=effects.length-1;i>=0;i--){ effects[i].t+=dt; if(effects[i].t>=effects[i].dur) effects.splice(i,1); }
  for(let i=floats.length-1;i>=0;i--){ const f=floats[i]; f.t+=dt; f.y-=30*dt; if(f.t>=f.dur) floats.splice(i,1); }
}

/* ---------- audio ---------- */
let AC=null, master=null, musicNodes=null, musicTimer=null;
function ensureAudio(){
  if(!AC){ try{
    AC=new (window.AudioContext||window.webkitAudioContext)();
    master=AC.createGain(); master.gain.value=S.sound?S.volume:0; master.connect(AC.destination);
  }catch(e){} }
  if(AC&&AC.state==='suspended') AC.resume();
  if(AC&&S.music&&!musicNodes) startMusic();
}
const VOICES={ musicbox:{type:'sine',harm:2.001,hg:.25,dm:1}, kalimba:{type:'triangle',harm:3.01,hg:.12,dm:.7},
  glass:{type:'sine',harm:4.02,hg:.18,dm:1.4}, celesta:{type:'sine',harm:5.04,hg:.1,dm:1.1},
  bells:{type:'sine',harm:2.76,hg:.2,dm:1.6}, dulcimer:{type:'triangle',harm:2.02,hg:.2,dm:.9} };
function note(f,dur=.4,g=.2,type=null,when=0){
  if(!AC||!S.sound) return;
  const v=VOICES[S.chimes]||VOICES.musicbox;
  const t=AC.currentTime+when, d=dur*v.dm;
  const o=AC.createOscillator(), o2=AC.createOscillator(), gn=AC.createGain();
  o.type=type||v.type; o.frequency.value=f; o2.type='sine'; o2.frequency.value=f*v.harm;
  const g2=AC.createGain(); g2.gain.value=v.hg;
  gn.gain.setValueAtTime(0,t); gn.gain.linearRampToValueAtTime(g,t+.008);
  gn.gain.exponentialRampToValueAtTime(.0001,t+d);
  o.connect(gn); o2.connect(g2); g2.connect(gn); gn.connect(master);
  o.start(t); o2.start(t); o.stop(t+d+.05); o2.stop(t+d+.05);
}
const PENTA=[1,1.125,1.25,1.5,1.667,2,2.25,2.5,3,3.333,4];
const sndMatch=d=>{ const f=261.63*PENTA[Math.min(d-1,PENTA.length-1)];
  note(f,.45,.2); note(f*1.5,.3,.07,'sine',.03); };
const sndBorn=()=>[0,2,4].forEach((s,i)=>note(261.63*PENTA[s],.3,.1,'sine',i*.06));
const sndTuk=()=>note(110,.13,.14,'triangle');
const sndSelect=()=>note(523.25,.1,.06);
const sndStir=()=>[0,1,2,3].forEach((s,i)=>note(261.63*PENTA[s],.25,.07,'sine',i*.05));
const sndChord=()=>[1,1.25,1.5,2].forEach(f=>note(261.63*f,.9,.09));
const sndUnlock=()=>[1,1.5,2,2.5].forEach((f,i)=>note(261.63*f,.5,.11,'sine',i*.09));
const CHORDS=[[130.81,196,329.63],[110,164.81,261.63],[87.31,174.61,261.63],[98,196,293.66]];
function startMusic(){
  if(!AC||musicNodes) return;
  const gn=AC.createGain(); gn.gain.value=0; gn.connect(master);
  const lp=AC.createBiquadFilter(); lp.type='lowpass'; lp.frequency.value=720; lp.connect(gn);
  const oscs=CHORDS[0].map(f=>{ const o=AC.createOscillator(); o.type='sine'; o.frequency.value=f;
    const g=AC.createGain(); g.gain.value=.33; o.connect(g); g.connect(lp); o.start(); return o; });
  gn.gain.linearRampToValueAtTime(.05,AC.currentTime+3);
  let ci=0;
  musicTimer=setInterval(()=>{ if(!AC) return; ci=(ci+1)%CHORDS.length;
    oscs.forEach((o,i)=>o.frequency.linearRampToValueAtTime(CHORDS[ci][i],AC.currentTime+4)); },12000);
  musicNodes={gn,oscs};
}
function stopMusic(){
  if(!musicNodes) return;
  clearInterval(musicTimer); musicTimer=null;
  const {gn,oscs}=musicNodes; musicNodes=null;
  gn.gain.linearRampToValueAtTime(0,AC.currentTime+.8);
  setTimeout(()=>oscs.forEach(o=>{try{o.stop()}catch(e){}}),1000);
}

/* ---------- input ---------- */
let dragStart=null, dragCell=null, swiped=false, kcur=null, lastInput=0;
const touched=()=>{ lastInput=performance.now(); };
function cellAt(e){
  const r=cv.getBoundingClientRect();
  const c=Math.floor((e.clientX-r.left-ox)/cell), rr_=Math.floor((e.clientY-r.top-oy)/cell);
  return (rr_>=0&&rr_<N&&c>=0&&c<N)?{r:rr_,c}:null;
}
if(cv){
  cv.addEventListener('pointerdown',e=>{
    ensureAudio(); touched(); idleT=0; hintPair=null;
    if(phase!=='idle') return;
    const p=cellAt(e); if(!p) return;
    dragStart={x:e.clientX,y:e.clientY}; dragCell=p; swiped=false; kcur=null;
    try{cv.setPointerCapture(e.pointerId);}catch(err){}
  });
  cv.addEventListener('pointermove',e=>{
    if(!dragStart||swiped||phase!=='idle') return;
    const dx=e.clientX-dragStart.x, dy=e.clientY-dragStart.y;
    if(Math.max(Math.abs(dx),Math.abs(dy))<14) return;
    const [dr,dc]=Math.abs(dx)>Math.abs(dy)?[0,Math.sign(dx)]:[Math.sign(dy),0];
    const b=at(dragCell.r+dr,dragCell.c+dc);
    swiped=true; sel=null; touched();
    if(b) trySwap(grid[dragCell.r][dragCell.c],b);
  });
  cv.addEventListener('pointerup',()=>{
    if(dragStart&&!swiped&&phase==='idle'&&dragCell){
      const j=grid[dragCell.r][dragCell.c];
      if(j){
        touched();
        if(sel===j) sel=null;
        else if(sel&&Math.abs(sel.r-j.r)+Math.abs(sel.c-j.c)===1){ const a=sel; sel=null; trySwap(a,j); }
        else { sel=j; sndSelect(); }
      }
    }
    dragStart=null; dragCell=null;
  });
  cv.addEventListener('pointercancel',()=>{dragStart=null;dragCell=null;});
  cv.addEventListener('contextmenu',e=>e.preventDefault());
}
document.addEventListener('gesturestart',e=>e.preventDefault());
document.addEventListener('keydown',e=>{
  const how=$('#howto'), sheet=$('#sheet'), conf=$('#confirm'), intro=$('#intro');
  if(how&&how.classList.contains('open')){ if(e.key==='Escape'||e.key==='Enter') closeHow(); return; }
  if(sheet&&sheet.classList.contains('open')){ if(e.key==='Escape') closeSheet(); return; }
  if(conf&&conf.classList.contains('open')){ if(e.key==='Escape') closeConfirm(); return; }
  if(intro&&intro.classList.contains('open')){ if(e.key==='Enter'||e.key===' ') begin(); return; }
  if(e.key==='m'){ toggleSound(); return; }
  if(e.key==='Escape'){ sel=null; return; }
  if(tab!=='play') return;
  if(e.key==='h'){ showHint(); return; }
  if(phase!=='idle') return;
  const dirs={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};
  if(dirs[e.key]){ e.preventDefault(); ensureAudio(); touched();
    if(!kcur) kcur={r:(N/2)|0,c:(N/2)|0};
    else{ const [dr,dc]=dirs[e.key];
      if(sel&&sel.r===kcur.r&&sel.c===kcur.c){
        const b=at(kcur.r+dr,kcur.c+dc); if(b){const a=sel;sel=null;trySwap(a,b);kcur={r:b.r,c:b.c};return;}
      }
      kcur={r:clamp(kcur.r+dr,0,N-1),c:clamp(kcur.c+dc,0,N-1)};
    }
  }
  if((e.key===' '||e.key==='Enter')&&kcur){ e.preventDefault(); touched();
    const j=grid[kcur.r][kcur.c]; if(!j) return;
    if(sel===j) sel=null;
    else if(sel&&Math.abs(sel.r-j.r)+Math.abs(sel.c-j.c)===1){const a=sel;sel=null;trySwap(a,j);}
    else {sel=j;sndSelect();}
  }
});

/* ---------- drawing ---------- */
function drawJewel(j,time){
  const x=px(j),y=py(j);
  ctx.globalAlpha=j.alpha*.22;
  ctx.beginPath(); ctx.ellipse(x,y+cell*.36,cell*.3,cell*.085,0,0,7);
  ctx.fillStyle=pal().light?'rgba(120,90,60,1)':'rgba(0,0,0,1)'; ctx.fill();
  ctx.globalAlpha=j.alpha;
  ctx.save(); ctx.translate(x,y);
  const sq=j.land>0?j.land:0, sc=j.scale*(j===sel?1.07:1);
  ctx.scale(sc*(1+sq*.1),sc*(1-sq*.12));
  const P=cell*1.28, spr=j.t<0?prismSpr:sprites[j.t];
  if(spr) ctx.drawImage(spr,-P/2,-P/2,P,P);
  const R=cell*.36;
  if(j.sp==='bloom'){
    ctx.save(); ctx.rotate(time*.7);
    for(let i=0;i<5;i++){ ctx.save(); ctx.rotate(i*Math.PI*2/5);
      ctx.beginPath(); ctx.ellipse(R*.62,0,R*.2,R*.09,0,0,7);
      ctx.fillStyle='rgba(255,255,255,.45)'; ctx.fill(); ctx.restore(); }
    ctx.restore();
    ctx.beginPath(); ctx.arc(0,0,R*(1.02+.05*Math.sin(time*3)),0,7);
    ctx.strokeStyle='rgba(255,255,255,.5)'; ctx.lineWidth=1.5; ctx.stroke();
  } else if(j.sp==='comet'){
    for(let i=0;i<2;i++){ const a=time*2.4+i*Math.PI;
      const sx=Math.cos(a)*R*.78, sy=Math.sin(a)*R*.78;
      ctx.beginPath(); ctx.moveTo(sx*.6,sy*.6); ctx.lineTo(sx,sy);
      ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=2; ctx.stroke();
      ctx.beginPath(); ctx.arc(sx,sy,cell*.05,0,7); ctx.fillStyle='#fff'; ctx.fill(); }
  } else if(j.sp==='prism'){
    ctx.beginPath(); ctx.arc(0,0,R*.96,0,7);
    ctx.strokeStyle=`hsla(${(time*55)%360},85%,72%,.9)`; ctx.lineWidth=2.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(0,0,R*.55,0,7);
    ctx.strokeStyle=`hsla(${(time*55+120)%360},85%,80%,.5)`; ctx.lineWidth=1.5; ctx.stroke();
  }
  if(j.glint>0){
    const gx=R*.34, gy=-R*.4, L=cell*.13*j.glint;
    ctx.strokeStyle=`rgba(255,255,255,${.8*j.glint})`; ctx.lineWidth=1.4;
    ctx.beginPath(); ctx.moveTo(gx-L,gy); ctx.lineTo(gx+L,gy); ctx.moveTo(gx,gy-L); ctx.lineTo(gx,gy+L); ctx.stroke();
  }
  ctx.restore(); ctx.globalAlpha=1;
}
function drawParticle(p){
  const a=1-p.t/p.dur;
  ctx.globalAlpha=a;
  if(p.style==='rainbow') ctx.fillStyle=`hsl(${(p.t*360+p.ph*57)%360},85%,70%)`;
  else ctx.fillStyle=p.col;
  if(p.style==='petals'){ ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
    ctx.beginPath(); ctx.ellipse(0,0,p.size,p.size*.55,0,0,7); ctx.fill(); ctx.restore(); }
  else if(p.style==='confetti'){ ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
    ctx.fillRect(-p.size,-p.size*.45,p.size*2,p.size*.9); ctx.restore(); }
  else if(p.style==='bubbles'){ ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,7);
    ctx.strokeStyle=ctx.fillStyle; ctx.lineWidth=1.2; ctx.stroke(); }
  else if(p.style==='fireflies'){ ctx.shadowColor=ctx.fillStyle; ctx.shadowBlur=8;
    ctx.globalAlpha=a*(.5+.5*Math.sin(p.t*8+p.ph));
    ctx.beginPath(); ctx.arc(p.x,p.y,p.size*.8,0,7); ctx.fill(); ctx.shadowBlur=0; }
  else if(p.style==='stardust'){ const L=p.size*1.6;
    ctx.strokeStyle=ctx.fillStyle; ctx.lineWidth=1.2;
    ctx.beginPath(); ctx.moveTo(p.x-L,p.y); ctx.lineTo(p.x+L,p.y); ctx.moveTo(p.x,p.y-L); ctx.lineTo(p.x,p.y+L); ctx.stroke(); }
  else if(p.style==='snowfall'){ ctx.globalAlpha=a*.85;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,7); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,7); ctx.fill(); }
}
function draw(time){
  if(!ctx||!W||!H) return;
  ctx.clearRect(0,0,W,H);
  if(backdrop) ctx.drawImage(backdrop,0,0,W,H);
  const p=pal();
  if(hintPair&&phase==='idle'){
    const a=.3+.4*(Math.sin(time*4)+1)/2;
    for(const j of hintPair){
      rr(ctx,ox+j.c*cell+3,oy+j.r*cell+3,cell-6,cell-6,cell*.24);
      ctx.strokeStyle=rgba(p.accent2,a); ctx.lineWidth=2.5; ctx.stroke();
    }
  }
  if(sel){
    rr(ctx,ox+sel.c*cell+2.5,oy+sel.r*cell+2.5,cell-5,cell-5,cell*.26);
    ctx.strokeStyle=rgba(p.accent2,.65+.3*Math.sin(time*5)); ctx.lineWidth=3; ctx.stroke();
  }
  if(kcur){
    rr(ctx,ox+kcur.c*cell+1,oy+kcur.r*cell+1,cell-2,cell-2,cell*.28);
    ctx.strokeStyle=rgba(p.accent,.5); ctx.lineWidth=1.5; ctx.setLineDash([5,4]); ctx.stroke(); ctx.setLineDash([]);
  }
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){ const j=grid[r][c]; if(j) drawJewel(j,time); }
  ctx.globalCompositeOperation='lighter';
  for(const e of effects){
    const k=e.t/e.dur, a=1-k;
    if(e.kind==='ring'){
      ctx.beginPath(); ctx.arc(e.x,e.y,cell*.2+k*cell*1.7,0,7);
      ctx.strokeStyle=rgba(e.color==='#ffffff'?p.accent2:e.color,a*.8); ctx.lineWidth=3*(1-k)+1; ctx.stroke();
    } else if(e.kind==='beamH'||e.kind==='beamV'){
      const h=e.kind==='beamH';
      const g=h?ctx.createLinearGradient(ox,0,ox+cell*N,0):ctx.createLinearGradient(0,oy,0,oy+cell*N);
      g.addColorStop(0,'rgba(255,255,255,0)'); g.addColorStop(.5,rgba(p.accent2,a*.85)); g.addColorStop(1,'rgba(255,255,255,0)');
      ctx.fillStyle=g;
      const th=cell*.5*(1-k*.5);
      if(h) ctx.fillRect(ox,oy+(e.r+.5)*cell-th/2,cell*N,th);
      else ctx.fillRect(ox+(e.c+.5)*cell-th/2,oy,th,cell*N);
    }
  }
  for(const pt of particles) drawParticle(pt);
  ctx.globalAlpha=1; ctx.globalCompositeOperation='source-over';
  for(const f of floats){
    const a=f.t<.15?f.t/.15:1-(f.t-.15)/(f.dur-.15);
    ctx.globalAlpha=clamp(a,0,1);
    ctx.font=`800 ${Math.round(cell*(f.big?.4:.32))}px ui-rounded,system-ui,sans-serif`;
    ctx.textAlign='center'; ctx.fillStyle=p.accent2;
    ctx.shadowColor=rgba(p.accent,.8); ctx.shadowBlur=12;
    ctx.fillText(f.txt,f.x,f.y); ctx.shadowBlur=0;
  }
  ctx.globalAlpha=1;
}

/* ---------- loop: 60fps while busy, 30fps idle, 10fps off-screen, stopped when hidden ---------- */
let last=performance.now(), acc=0, raf=0;
const sheetOpen = () => { const el=$('#sheet'); return !!el&&el.classList.contains('open'); };
const howOpen = () => { const el=$('#howto'); return !!el&&el.classList.contains('open'); };
function busy(){
  return phase!=='idle'||T.length>0||particles.length>0||effects.length>0||floats.length>0
    ||sel!==null||Math.abs(shownScore-score)>.5||(performance.now()-lastInput<1500);
}
function frame(now){
  raf=requestAnimationFrame(frame);
  let dt=(now-last)/1000; last=now;
  if(!(dt>0)) dt=0;
  acc+=Math.min(.05,dt);
  const active=busy(), onScreen=(tab==='play'&&!sheetOpen()&&!howOpen());
  const minStep = active ? 0 : (onScreen ? 1/30 : 1/10);
  if(acc<minStep) return;
  const step=acc; acc=0;
  stepTweens(step);
  if(phase!=='idle'){ phaseT-=step;
    if(phaseT<=0){
      if(phase==='swap') afterSwap();
      else if(phase==='swapback') setPhase('idle',0);
      else if(phase==='clear') afterClear();
      else if(phase==='fall') afterFall();
      else if(phase==='stir') afterStir();
    }
  } else if(tab==='play'){
    idleT+=step;
    if(S.hint>0&&!hintPair&&!sel&&idleT>S.hint) hintPair=findHint();
  }
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){
    const j=grid[r][c]; if(!j) continue;
    if(j.land>0) j.land=Math.max(0,j.land-step*5);
    j.glintT-=step; if(j.glintT<=0){ j.glint=1; j.glintT=rnd(5,13); }
    if(j.glint>0) j.glint=Math.max(0,j.glint-step*1.6);
  }
  stepFx(step);
  if(Math.abs(shownScore-score)>.5){ shownScore=lerp(shownScore,score,Math.min(1,step*9)); updateHUD(); }
  else if(shownScore!==score){ shownScore=score; updateHUD(); }
  if(onScreen) draw(now/1000);
}
function startLoop(){ if(!raf&&!document.hidden){ last=performance.now(); acc=0; raf=requestAnimationFrame(frame); } }
function updateHUD(){ const el=$('#score'); if(el) el.textContent=Math.round(shownScore).toLocaleString(); }

/* ---------- milestone engine ---------- */
function checkMilestones(quiet){
  let changed=false;
  for(const m of MILESTONES){
    if(stats.lit.includes(m.id)) continue;
    if(metricValue(m)>=m.goal){
      stats.lit.push(m.id); changed=true;
      if(!quiet){
        toast('✧ Star lit — '+m.title); sndUnlock();
        if(m.reward){
          if(m.reward.type==='palette'){ renderPalettes(); toast('Unlocked: '+LABELS.palette[m.reward.id]+' 🎨'); }
          else if(m.reward.type==='decor'){ toast('Unlocked: '+LABELS.decor[m.reward.id]+' ✿'); }
          else toast('Unlocked: '+LABELS[m.reward.type][m.reward.id]+' ✦');
        }
      }
    }
  }
  if(changed){
    fillCosmeticSelects(); updateTabBadges();
    if(tab==='sky') renderSky();
    if(tab==='garden') renderGarden();
    save();
  }
}

/* ---------- garden ---------- */
const STAGES=['Seed','Sprout','Bud','Bloom','Radiant'];
const STAGE_AT=[0,60,250,800,2000];
const stageOf = i => { let s=0; for(let k=0;k<STAGE_AT.length;k++) if(stats.perType[i]>=STAGE_AT[k]) s=k; return s; };
const favType = () => stats.perType.some(v=>v>0)?stats.perType.indexOf(Math.max(...stats.perType)):-1;
const bloomCount = () => { let n=0; for(let i=0;i<7;i++) if(stageOf(i)>=3) n++; return n; };
function plantSVG(i,st,fav){
  const col=pal().jewels[i], hi=mix(col,'#ffffff',.5), dk=mix(col,'#000000',.3);
  const pot=`<path d="M30 92 h40 l-5 24 h-30 z" fill="${mix('#b0714f','#000000',.15)}"/><rect x="27" y="88" width="46" height="8" rx="4" fill="#c07f58"/><ellipse cx="50" cy="92" rx="18" ry="3" fill="#5a3a28"/>`;
  if(st===0) return `<svg viewBox="0 0 100 120">${pot}<circle cx="50" cy="88" r="3.4" fill="${dk}"/></svg>`;
  const top=92-st*15;
  const stem=`<path d="M50 90 C 48 ${top+22} 52 ${top+12} 50 ${top}" stroke="#6fae7c" stroke-width="3.4" fill="none" stroke-linecap="round"/>`;
  const leaves=`<path d="M50 ${top+26} q -16 -4 -20 -16 q 16 -2 20 12 z" fill="#7fc98f"/><path d="M50 ${top+18} q 16 -4 20 -16 q -16 -2 -20 12 z" fill="#8fd0a0"/>`;
  let bloom='';
  if(st===1) bloom=`<circle cx="50" cy="${top}" r="4" fill="#9ad6a0"/>`;
  else if(st===2) bloom=`<ellipse cx="50" cy="${top}" rx="7" ry="10" fill="${dk}"/>`;
  else {
    const petals = i===5 ? `<path d="M50 ${top+12} C 34 ${top+2} 38 ${top-16} 50 ${top-6} C 62 ${top-16} 66 ${top+2} 50 ${top+12} Z" fill="${col}"/>`
      : [0,1,2,3,4,5].map(k=>`<ellipse cx="50" cy="${top-11}" rx="6.5" ry="12" fill="${k%2?col:hi}" transform="rotate(${k*60} 50 ${top})"/>`).join('');
    bloom=petals+`<circle cx="50" cy="${top}" r="5.5" fill="${pal().jewels[1]}"/>`;
    if(st===4) bloom=`<circle cx="50" cy="${top}" r="20" fill="${rgba(col,.22)}"/>`+bloom+
      `<path d="M74 ${top-16} l2.4 6 6 2.4 -6 2.4 -2.4 6 -2.4 -6 -6 -2.4 6 -2.4 z" fill="${hi}" class="twinkle"/>`;
  }
  const crown = fav&&st>=3 ? `<path d="M50 ${top-26} l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" fill="${pal().accent2}" class="twinkle"/>` : '';
  return `<svg viewBox="0 0 100 120">${pot}<g class="sway">${stem}${leaves}${bloom}${crown}</g></svg>`;
}
function decorSVG(){
  const p=pal(); let s='';
  if(rewardUnlocked('decor','lights'))
    s+=`<path d="M4 10 Q 50 26 96 8" stroke="${rgba(p.accent,.6)}" stroke-width="1.4" fill="none"/>`+
      [12,30,50,70,88].map((x,i)=>`<circle cx="${x}" cy="${i%2?17:13}" r="3" fill="${p.jewels[i%7]}" class="twinkle"/>`).join('');
  if(rewardUnlocked('decor','lantern'))
    s+=`<g transform="translate(6 26)"><line x1="8" y1="-14" x2="8" y2="0" stroke="${rgba(p.accent,.6)}" stroke-width="1.2"/><rect x="0" y="0" width="16" height="20" rx="7" fill="${rgba(p.jewels[1],.85)}"/><circle cx="8" cy="10" r="4" fill="#fff" class="twinkle"/></g>`;
  if(rewardUnlocked('decor','chime'))
    s+=`<g class="swing"><line x1="14" y1="12" x2="14" y2="22" stroke="${rgba(p.accent,.6)}" stroke-width="1.2"/><rect x="7" y="22" width="14" height="3" rx="1.5" fill="${p.accent}"/>`+
      [0,1,2,3].map(i=>`<rect x="${8.5+i*3.4}" y="25" width="2" height="${12+i*3}" rx="1" fill="${rgba(p.accent2,.8)}"/>`).join('')+`</g>`;
  if(rewardUnlocked('decor','butterfly'))
    s+=`<g class="flutter" transform="translate(20 40)"><path d="M0 0 q -8 -8 -2 -12 q 6 -2 2 12 q 8 -8 2 -12 q -6 -2 -2 12" fill="${p.jewels[4]}" opacity=".9"/></g>`;
  if(rewardUnlocked('decor','bird'))
    s+=`<g class="hop" transform="translate(52 84)"><ellipse cx="7" cy="6" rx="7" ry="5" fill="${p.jewels[3]}"/><circle cx="13" cy="2" r="3.4" fill="${p.jewels[3]}"/><path d="M16 2 l4 1 -4 1 z" fill="${p.jewels[1]}"/><path d="M2 4 q -5 -2 -7 2 q 4 2 7 -2" fill="${mix(p.jewels[3],'#000000',.2)}"/><circle cx="14" cy="1.4" r=".8" fill="#101820"/></g>`;
  if(rewardUnlocked('decor','cat'))
    s+=`<g transform="translate(74 96)"><ellipse cx="12" cy="10" rx="14" ry="8" fill="${mix(p.panel,'#000000',.35)}"/><circle cx="24" cy="6" r="6" fill="${mix(p.panel,'#000000',.35)}"/><path d="M20 1 l3 -4 2 4 z M26 1 l3 -4 2 4 z" fill="${mix(p.panel,'#000000',.35)}"/><path d="M-2 10 q -6 -2 -4 -8" stroke="${mix(p.panel,'#000000',.35)}" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
  return s?`<svg id="gardenDecor" viewBox="0 0 100 120" preserveAspectRatio="none">${s}</svg>`:'';
}
let gardenSel=-1;
function renderGarden(){
  const shelf=$('#gardenShelf'); if(!shelf) return;
  shelf.innerHTML=decorSVG();
  const fav=favType();
  for(let i=0;i<7;i++){
    const st=stageOf(i);
    const b=document.createElement('button');
    b.className='plant'+(gardenSel===i?' sel':'');
    b.innerHTML=plantSVG(i,st,i===fav)+`<span class="pn">${PLANTS[i]}</span><span class="ps">${STAGES[st]}</span>`;
    b.setAttribute('aria-label',PLANTS[i]+', '+STAGES[st]);
    b.addEventListener('click',()=>{ensureAudio();gardenSel=i;sndSelect();renderGarden();});
    shelf.append(b);
  }
  const sub=$('#gardenSub');
  if(sub) sub.textContent = fav>=0
    ? `${fmt(stats.jewels)} jewels tended · the ${PLANTS[fav].toLowerCase()} is tallest today.`
    : 'Every jewel you clear waters its plant.';
  renderGardenDetail();
}
function renderGardenDetail(){
  const d=$('#gardenDetail'); if(!d) return;
  if(gardenSel<0){ d.innerHTML=`<h3>A windowsill of seven</h3><p>Each jewel type tends one plant. Clear jewels to water them; tap a pot to see how it is doing. Nothing here ever wilts.</p>`; return; }
  const i=gardenSel, st=stageOf(i), n=stats.perType[i];
  const next=STAGE_AT[st+1];
  const bar=next?`<div class="bar"><i style="width:${clamp((n-STAGE_AT[st])/(next-STAGE_AT[st])*100,0,100)}%"></i></div><div class="meta">${fmt(n)} / ${fmt(next)} to ${STAGES[st+1]}</div>`:`<div class="meta">Fully radiant · ${fmt(n)} tended</div>`;
  d.innerHTML=`<h3>${PLANTS[i]} <span class="meta">· ${STAGES[st]}</span></h3><p class="hintline">${PLANT_LINES[i]}</p>${bar}`;
}
function markGardenSeen(){
  let grew=false;
  for(let i=0;i<7;i++){ const st=stageOf(i); if(st>stats.gardenSeen[i]) grew=true; stats.gardenSeen[i]=st; }
  if(grew){ renderGarden();
    const shelf=$('#gardenShelf');
    if(shelf) shelf.querySelectorAll('.plant').forEach(el=>el.classList.add('grew'));
    toast('Something on the sill grew while you played ✿');
  }
  save(); updateTabBadges();
}

/* ---------- sky ---------- */
let skySel=null;
function renderSky(){
  const map=$('#skyMap'); if(!map) return;
  const litSet=new Set(stats.lit);
  let lines='';
  for(let i=0;i<MILESTONES.length-1;i++){
    const a=MILESTONES[i], b=MILESTONES[i+1];
    const on_=litSet.has(a.id)&&litSet.has(b.id);
    lines+=`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${on_?'rgba(211,229,245,.55)':'rgba(147,167,189,.16)'}" stroke-width="${on_?.5:.3}"/>`;
  }
  map.innerHTML=`<svg class="lines" viewBox="0 0 100 100" preserveAspectRatio="none">${lines}</svg>`;
  for(let i=0;i<26;i++){ const d=document.createElement('span'); d.className='dust';
    d.style.left=rnd(4,96)+'%'; d.style.top=rnd(4,96)+'%'; d.style.opacity=rnd(.15,.45); map.append(d); }
  const next=MILESTONES.find(m=>!litSet.has(m.id));
  MILESTONES.forEach(m=>{
    const b=document.createElement('button');
    b.className='star'+(litSet.has(m.id)?' lit':'')+(next&&next.id===m.id?' next':'')+(skySel===m.id?' sel':'');
    b.style.left=m.x+'%'; b.style.top=m.y+'%';
    b.innerHTML='<i></i>';
    b.setAttribute('aria-label',m.title+(litSet.has(m.id)?' (lit)':' (not lit)'));
    b.addEventListener('click',()=>{ensureAudio();skySel=m.id;sndSelect();renderSky();});
    map.append(b);
  });
  const sub=$('#skySub');
  if(sub) sub.textContent=`${stats.lit.length} / ${MILESTONES.length} stars lit · lit by playing, never by rushing.`;
  renderSkyDetail();
}
function renderSkyDetail(){
  const d=$('#skyDetail'); if(!d) return;
  const m=MILESTONES.find(x=>x.id===skySel);
  if(!m){ d.innerHTML=`<h3>A sky that fills slowly</h3><p>Each star is a small milestone — jewels, cascades, evenings, hints asked for. Light one and it grants a keepsake you can equip. Tap any star to see it. None of them expire.</p>`; return; }
  const lit=stats.lit.includes(m.id), cur=Math.min(metricValue(m),m.goal);
  const rw=m.reward?LABELS[m.reward.type][m.reward.id]:'a quiet memory';
  let action='';
  if(lit&&m.reward){
    if(m.reward.type==='decor') action=`<div class="meta">Already living on the windowsill ✿</div>`;
    else action=`<button class="wide accent" id="skyAct">Use ${rw}</button>`;
  }
  d.innerHTML=`<h3>${m.title} ${lit?'<span class="meta">· lit ✧</span>':''}</h3><p>${m.desc}</p>
    <div class="bar"><i style="width:${clamp(cur/m.goal*100,0,100)}%"></i></div>
    <div class="meta">${fmt(cur)} / ${fmt(m.goal)} · keepsake: ${rw}</div>${action}`;
  const act=$('#skyAct');
  if(act) act.addEventListener('click',()=>{ ensureAudio(); equip(m.reward.type,m.reward.id); });
}
function markSkySeen(){ stats.skySeen=stats.lit.length; save(); updateTabBadges(); }

/* ---------- cosmetics ---------- */
function equip(type,id){
  if(!rewardUnlocked(type,id)){ toast('That keepsake is still a locked star ✧'); fillCosmeticSelects(); return; }
  if(type==='palette'){ setPalette(id); return; }
  S[type]=id; applyCosmetics(); fillCosmeticSelects(); save();
  toast(LABELS[type][id]+' ✦'); sndSelect();
}
function applyCosmetics(){
  document.body.dataset.tray=S.tray; document.body.dataset.scene=S.scene;
  const fx=$('#sceneFx'); if(!fx) return;
  fx.innerHTML='';
  if(S.motion) return;
  const mkFx=(cls,n,fn)=>{ for(let i=0;i<n;i++){ const e=document.createElement('i'); e.className=cls; fn(e,i); fx.append(e); } };
  if(S.scene==='rain') mkFx('rain',34,e=>{e.style.left=rnd(100)+'%';e.style.animationDuration=rnd(.7,1.3)+'s';e.style.animationDelay=-rnd(2)+'s';e.style.opacity=rnd(.3,.7);});
  else if(S.scene==='snow') mkFx('snow',30,e=>{e.style.left=rnd(100)+'%';e.style.animationDuration=rnd(6,12)+'s';e.style.animationDelay=-rnd(12)+'s';e.style.opacity=rnd(.4,.9);});
  else if(S.scene==='embers') mkFx('ember',20,e=>{e.style.left=rnd(100)+'%';e.style.animationDuration=rnd(6,11)+'s';e.style.animationDelay=-rnd(11)+'s';});
  else if(S.scene==='comets') mkFx('comet',5,e=>{e.style.top=rnd(10,50)+'%';e.style.animationDuration=rnd(7,13)+'s';e.style.animationDelay=-rnd(13)+'s';});
  else if(S.scene==='fireflies') mkFx('fly',18,e=>{e.style.left=rnd(6,94)+'%';e.style.top=rnd(20,92)+'%';e.style.animationDuration=rnd(5,10)+'s';e.style.animationDelay=-rnd(10)+'s';});
  else if(S.scene==='petals') mkFx('petal',22,e=>{e.style.left=rnd(100)+'%';e.style.animationDuration=rnd(9,16)+'s';e.style.animationDelay=-rnd(16)+'s';e.style.opacity=rnd(.45,.85);});
}
function fillCosmeticSelects(){
  const build=(sel,type)=>{
    const el=$(sel); if(!el) return;
    el.innerHTML='';
    for(const id of Object.keys(LABELS[type])){
      const ok=rewardUnlocked(type,id);
      const o=document.createElement('option'); o.value=id; o.disabled=!ok;
      o.textContent=LABELS[type][id]+(ok?'':' 🔒');
      if(S[type]===id) o.selected=true;
      el.append(o);
    }
  };
  build('#setScene','scene'); build('#setTray','tray'); build('#setParticles','particles'); build('#setChimes','chimes');
}

/* ---------- tabs ---------- */
function setTab(t){
  const tabs=$('#tabs'); if(!tabs) return;
  tab=t;
  for(const b of tabs.children) b.classList.toggle('on',b.dataset.tab===t);
  const scr={play:$('#scr-play'),garden:$('#scr-garden'),sky:$('#scr-sky')};
  for(const k in scr) if(scr[k]) scr[k].classList.toggle('on',k===t);
  if(t==='play'){ resize(); startLoop(); }
  if(t==='garden'){ renderGarden(); markGardenSeen(); }
  if(t==='sky'){ renderSky(); markSkySeen(); }
  save();
}
function updateTabBadges(){
  const tabs=$('#tabs'); if(!tabs||tabs.children.length<3) return;
  const g=tabs.children[1].querySelector('.badge'), s=tabs.children[2].querySelector('.badge');
  if(g) g.hidden=!stats.perType.some((v,i)=>stageOf(i)>stats.gardenSeen[i]);
  if(s) s.hidden=!(stats.lit.length>stats.skySeen);
}

/* ---------- storage UI ---------- */
function isFramed(){ try{ return window.top!==window.self; }catch(e){ return true; } }
function showStoreWarn(){
  const el=$('#storeWarn'); if(!el) return;
  const framed=isFramed(), msg=$('#storeMsg'), btn=$('#storeOpen');
  if(msg) msg.textContent = framed
    ? "Saving is blocked in this embedded view. Open in a new tab to keep your garden."
    : "Saving is blocked (private browsing or site settings). Export from Settings to keep a copy.";
  if(btn) btn.hidden=!framed;
  el.hidden=false;
}
function syncStoreState(){
  const el=$('#storeState'); if(!el) return;
  el.textContent = canStore ? 'On this device ✓' : 'Not available ✕';
  el.style.color = canStore ? 'var(--good)' : 'var(--warn)';
}
function exportSave(){
  try{
    const blob=new Blob([envelope()],{type:'application/json'});
    const url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download='gemlight-save-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.append(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
    toast('Save file exported ⤓');
  }catch(e){ toast('Could not export the save.'); }
}
function importSaveText(text){
  const o=readSave(text);
  if(!o){ toast("That file isn't a valid Gemlight save."); return; }
  openConfirm('Replace your current progress with this file? Your existing garden and stars will be overwritten.',()=>{
    const ok=applyPayload(o);
    if(!ok) newBoard(false);
    stats.seenIntro=true;
    if(canStore){ save(); location.reload(); }
    else { refreshAll(); toast('Save loaded for this session ✦'); }
  });
}
function refreshAll(){
  N=S.size; K=S.colors;
  setPalette(S.palette); syncSettingsUI(); fillCosmeticSelects(); applyCosmetics();
  lastCell=0; resize(); updateHUD(); checkMilestones(true); updateTabBadges(); syncStoreState();
  if(tab==='garden') renderGarden();
  if(tab==='sky') renderSky();
  startLoop();
}

/* ---------- UI ---------- */
function toast(msg){
  const box=$('#toasts'); if(!box) return;
  while(box.children.length>=3) box.firstChild.remove();
  const d=document.createElement('div'); d.className='toast'; d.textContent=msg;
  box.append(d);
  setTimeout(()=>d.classList.add('out'),2400); setTimeout(()=>d.remove(),2950);
}
function showHint(){
  if(phase!=='idle'||tab!=='play') return;
  ensureAudio(); touched(); hintPair=findHint(); idleT=0; stats.hints++; sndSelect(); checkMilestones(false); save();
}
function toggleSound(){
  S.sound=!S.sound; ensureAudio();
  if(master&&AC) master.gain.setTargetAtTime(S.sound?S.volume:0,AC.currentTime,.02);
  syncSoundBtn(); save();
}
function syncSoundBtn(){
  const a=$('#icoOn'), b=$('#icoOff'), btn=$('#soundBtn');
  if(a) a.style.display=S.sound?'':'none';
  if(b) b.style.display=S.sound?'none':'';
  if(btn){ btn.setAttribute('aria-pressed',String(S.sound));
    btn.setAttribute('aria-label',S.sound?'Mute sound':'Unmute sound'); }
}
function setPalette(id){
  if(!PALETTES[id]) return;
  if(!unlocked(id)){ toast('That palette is still a locked star in the Sky ✧'); return; }
  S.palette=id;
  if(!stats.palettesUsed.includes(id)) stats.palettesUsed.push(id);
  const p=pal(), root=document.documentElement.style;
  root.setProperty('--bg0',p.bg[0]); root.setProperty('--bg1',p.bg[1]); root.setProperty('--bg2',p.bg[2]);
  root.setProperty('--panel',p.panel); root.setProperty('--panelA',rgba(p.panel,.82));
  root.setProperty('--cell',p.cell); root.setProperty('--cellA',rgba(p.cell,.6));
  root.setProperty('--accent',p.accent); root.setProperty('--accent2',p.accent2);
  root.setProperty('--text',p.text); root.setProperty('--muted',p.muted);
  root.setProperty('--line',rgba(p.accent,.22));
  root.setProperty('--scrim',p.light?'rgba(90,70,50,.35)':'rgba(7,11,18,.55)');
  document.body.dataset.palette=id;
  const meta=document.querySelector('meta[name=theme-color]'); if(meta) meta.content=p.bg[0];
  bake(); buildBackdrop(); renderPalettes();
  if(tab==='garden') renderGarden();
  if(tab==='sky') renderSky();
  checkMilestones(false); save();
}
function renderPalettes(){
  const box=$('#palettes'); if(!box) return;
  box.innerHTML='';
  for(const id of Object.keys(PALETTES)){
    const p=PALETTES[id], ok=unlocked(id);
    const b=document.createElement('button');
    b.className='pal'+(S.palette===id?' on':'')+(ok?'':' locked');
    b.setAttribute('aria-label',p.label+(ok?'':' (locked)'));
    const g=p.jewels.slice(0,4).map((c,i)=>`${c} ${i*25}%`).join(',');
    b.innerHTML=`<span class="sw" style="background:linear-gradient(135deg,${g})"></span><span class="nm">${p.label}</span>${ok?'':'<span class="lock">🔒</span>'}`;
    b.addEventListener('click',()=>{ensureAudio();setPalette(id);});
    box.append(b);
  }
}
function renderStats(){
  const box=$('#stats'); if(!box) return;
  const fav=favType();
  box.innerHTML=`
    <div class="stat"><b>${fmt(stats.jewels)}</b><span>Lifetime sparkles</span></div>
    <div class="stat"><b>${fav>=0?NAMES[fav]:'—'}</b><span>Favorite jewel</span></div>
    <div class="stat"><b>×${stats.bestCascade}</b><span>Longest cascade</span></div>
    <div class="stat"><b>${fmt(stats.bestSession)}</b><span>Best session</span></div>
    <div class="stat"><b>${stats.lit.length}/${MILESTONES.length}</b><span>Stars lit</span></div>
    <div class="stat"><b>${bloomCount()}/7</b><span>Plants in bloom</span></div>`;
  const prog=$('#unlockProg'); if(!prog) return;
  const next=MILESTONES.find(m=>!stats.lit.includes(m.id));
  prog.innerHTML=next
    ? `Next star: ${next.title} — ${fmt(Math.min(metricValue(next),next.goal))} / ${fmt(next.goal)}<div class="bar"><i style="width:${clamp(metricValue(next)/next.goal*100,0,100)}%"></i></div>`
    : 'The whole sky is lit ✨';
}
function openSheet(){
  renderPalettes(); renderStats(); fillCosmeticSelects(); syncStoreState();
  const sh=$('#sheet'), sc=$('#scrim');
  if(sh) sh.classList.add('open'); if(sc) sc.classList.add('open');
}
function closeSheet(){
  const sh=$('#sheet'), sc=$('#scrim');
  if(sh) sh.classList.remove('open'); if(sc) sc.classList.remove('open');
  save(); startLoop();
}
let confirmCb=null;
function openConfirm(text,cb){
  const t=$('#confirmText'), c=$('#confirm');
  if(t) t.textContent=text; confirmCb=cb; if(c) c.classList.add('open');
}
function closeConfirm(){ const c=$('#confirm'); if(c) c.classList.remove('open'); confirmCb=null; }
function openHow(){ const h=$('#howto'); if(h){ h.classList.add('open'); const b=$('#howClose'); if(b) b.focus(); } }
function closeHow(){ const h=$('#howto'); if(h) h.classList.remove('open'); startLoop(); }
function freshBoard(){
  if(score>0) openConfirm('Start a fresh board? Your garden, stars and keepsakes stay.',()=>{newBoard();toast('A fresh board ✧');});
  else { newBoard(); toast('A fresh board ✧'); }
}
function begin(){
  ensureAudio(); stats.seenIntro=true; save();
  const i=$('#intro'); if(i) i.classList.remove('open');
}

/* ---------- wiring ---------- */
function syncSettingsUI(){
  const set=(sel,prop,val)=>{ const el=$(sel); if(el) el[prop]=val; };
  set('#setSound','checked',S.sound); set('#setMusic','checked',S.music);
  set('#setVolume','value',S.volume); set('#setMotion','checked',S.motion);
  set('#setZen','checked',S.zen); set('#setHint','value',String(S.hint));
  document.body.classList.toggle('rm',S.motion);
  document.body.classList.toggle('zen',S.zen);
  const sz=$('#segSize'), cl=$('#segColors');
  if(sz) for(const b of sz.children) b.classList.toggle('on',+b.dataset.v===S.size);
  if(cl) for(const b of cl.children) b.classList.toggle('on',+b.dataset.v===S.colors);
  syncSoundBtn();
}
on('#soundBtn','click',toggleSound);
on('#settingsBtn','click',()=>{ensureAudio();openSheet();});
on('#closeSheet','click',closeSheet);
on('#scrim','click',closeSheet);
on('#hintBtn','click',showHint);
on('#stirBtn','click',()=>{ensureAudio();touched();doStir(false);});
on('#newBtn','click',()=>{ensureAudio();touched();freshBoard();});
on('#freshBtn','click',()=>{closeSheet();freshBoard();});
on('#howBtn','click',()=>{ensureAudio();openHow();});
on('#howBtn2','click',()=>{ensureAudio();openHow();});
on('#howClose','click',closeHow);
on('#howto','click',e=>{ if(e.target&&e.target.id==='howto') closeHow(); });
on('#storeOpen','click',()=>{ try{ window.open(location.href,'_blank','noopener'); }catch(e){} });
on('#exportBtn','click',exportSave);
on('#importBtn','click',()=>{ const f=$('#importFile'); if(f){ f.value=''; f.click(); } });
on('#importFile','change',e=>{
  const f=e.target.files&&e.target.files[0]; if(!f) return;
  const rd=new FileReader();
  rd.onload=()=>importSaveText(String(rd.result||''));
  rd.onerror=()=>toast('Could not read that file.');
  rd.readAsText(f);
});
on('#resetBtn','click',()=>{
  closeSheet();
  openConfirm('Erase all progress, stats and keepsakes? This cannot be undone.',()=>{
    try{localStorage.removeItem(LS);}catch(e){} location.reload();
  });
});
on('#confirmNo','click',closeConfirm);
on('#confirmYes','click',()=>{const cb=confirmCb;closeConfirm();cb&&cb();});
on('#beginBtn','click',begin);
on('#tabs','click',e=>{
  const b=e.target.closest('button'); if(!b||!b.dataset.tab) return;
  ensureAudio(); sndSelect(); setTab(b.dataset.tab);
});
on('#setSound','change',e=>{S.sound=e.target.checked;ensureAudio();
  if(master&&AC)master.gain.setTargetAtTime(S.sound?S.volume:0,AC.currentTime,.02);syncSoundBtn();save();});
on('#setMusic','change',e=>{S.music=e.target.checked;ensureAudio();
  if(S.music)startMusic();else stopMusic();save();});
on('#setVolume','input',e=>{S.volume=+e.target.value;
  if(master&&AC&&S.sound)master.gain.setTargetAtTime(S.volume,AC.currentTime,.02);save();});
on('#setMotion','change',e=>{S.motion=e.target.checked;document.body.classList.toggle('rm',S.motion);applyCosmetics();save();});
on('#setZen','change',e=>{S.zen=e.target.checked;document.body.classList.toggle('zen',S.zen);save();});
on('#setHint','change',e=>{S.hint=+e.target.value;save();});
on('#setScene','change',e=>equip('scene',e.target.value));
on('#setTray','change',e=>equip('tray',e.target.value));
on('#setParticles','change',e=>equip('particles',e.target.value));
on('#setChimes','change',e=>equip('chimes',e.target.value));
on('#segSize','click',e=>{
  const v=e.target.dataset&&+e.target.dataset.v; if(!v||v===S.size)return;
  S.size=v; resize(); newBoard(false); syncSettingsUI(); toast(`A cozy ${v}×${v} board ✧`);
});
on('#segColors','click',e=>{
  const v=e.target.dataset&&+e.target.dataset.v; if(!v||v===S.colors)return;
  S.colors=v; resize(); newBoard(false); syncSettingsUI(); toast(v===6?'Six jewels — gentler matches':'Seven jewels — the classic mix');
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){ cancelAnimationFrame(raf); raf=0; save(); if(AC)AC.suspend(); }
  else{ startLoop(); if(AC&&S.sound)AC.resume(); }
});
window.addEventListener('pagehide',save);
let roPending=false;
const queueResize=()=>{ if(roPending) return; roPending=true;
  requestAnimationFrame(()=>{ roPending=false; resize(); }); };
if(wrap&&window.ResizeObserver) new ResizeObserver(queueResize).observe(wrap);
  window.addEventListener('orientationchange', () => setTimeout(queueResize, 250));

window.addEventListener('pageshow',queueResize);
if(window.visualViewport){
  visualViewport.addEventListener('resize',queueResize);
  visualViewport.addEventListener('scroll',()=>{ if(visualViewport.scale>1.01) queueResize(); });
}

/* ---------- boot ---------- */
canStore=storageOK();
try{ if(canStore && !localStorage.getItem(LS) && window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) S.motion=true; }catch(e){}
let restored=false;
if(canStore){ const o=readSave(localStorage.getItem(LS)); if(o) restored=applyPayload(o); }
N=S.size; K=S.colors;
setPalette(S.palette);
syncSettingsUI();
fillCosmeticSelects();
applyCosmetics();
resize();
requestAnimationFrame(()=>requestAnimationFrame(()=>resize()));
if(!restored) newBoard(); else { updateHUD(); save(); setTimeout(()=>toast('Welcome back — your board was waiting ✦'),700); }
checkMilestones(true);
updateTabBadges();
syncStoreState();
if(!canStore) showStoreWarn();
if(stats.seenIntro){ const i=$('#intro'); if(i) i.classList.remove('open'); }
const ver=$('#ver'); if(ver) ver.textContent='Gemlight v'+APP_VERSION;
if(missing.length) console.warn('Gemlight: markup missing for '+missing.join(', ')+'.');
startLoop();
if('serviceWorker' in navigator && location.protocol!=='file:'){
  const hadController=!!navigator.serviceWorker.controller;
  let refreshing=false;
  navigator.serviceWorker.addEventListener('controllerchange',()=>{
    if(!hadController||refreshing) return;
    refreshing=true; save(); toast('Updating Gemlight ✦');
    setTimeout(()=>location.reload(),600);
  });
  navigator.serviceWorker.register('sw.js?v='+APP_VERSION,{updateViaCache:'none'})
    .then(reg=>{
      reg.update().catch(()=>{});
      document.addEventListener('visibilitychange',()=>{ if(!document.hidden) reg.update().catch(()=>{}); });
    }).catch(()=>{});
}
})();
