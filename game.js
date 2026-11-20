/* Gemlight — a calm match-3. No timer, no fail state. */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const clamp = (v,a,b) => v<a?a:v>b?b:v;
const lerp = (a,b,t) => a+(b-a)*t;
const rnd = (a=1,b) => b===undefined ? Math.random()*a : a+Math.random()*(b-a);
const irnd = n => (Math.random()*n)|0;
const easeIO = t => t<.5 ? 2*t*t : 1-((-2*t+2)**2)/2;
const easeO = t => 1-(1-t)**3;
const hx = h => [parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const mix = (h1,h2,t) => { const a=hx(h1),b=hx(h2); return `rgb(${a.map((v,i)=>Math.round(lerp(v,b[i],t))).join(',')})`; };
const rgba = (h,a) => { const c=hx(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; };

/* ---------- data ---------- */
const SHAPES = ['circle','cushion','triangle','hexagon','teardrop','heart','pentagon'];
const NAMES  = ['Ruby','Citrine','Peridot','Sapphire','Amethyst','Rose Quartz','Aquamarine'];
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
    jewels:['#ff6f7d','#ffc35e','#a8d98a','#6ec3ff','#cf9fff','#ff9ec6','#7fe0c8'] }
};
const UNLOCKS = [{id:'sorbet',at:300},{id:'sea',at:1200},{id:'ember',at:3000}];
const LS = 'gemlight.v1';
const DEF = { sound:true, music:false, volume:.8, motion:false, zen:false, size:8, colors:6, hint:8, palette:'dusty' };
let S = {...DEF};
let stats = { jewels:0, bestCascade:0, bestSession:0, sessions:0, perType:[0,0,0,0,0,0,0], seenIntro:false, notified:[] };
let grid=[], score=0, shownScore=0, lastMilestone=0;
let N=8, K=6;

const unlocked = id => id==='dusty' || UNLOCKS.some(u=>u.id===id && stats.jewels>=u.at);
const pal = () => PALETTES[S.palette];

/* ---------- persistence ---------- */
function save(){
  try{
    localStorage.setItem(LS, JSON.stringify({ S, stats, score, lastMilestone,
      grid: grid.map(row=>row.map(j=>j?{t:j.t,sp:j.sp}:null)) }));
  }catch(e){}
}
function load(){
  try{
    const d = JSON.parse(localStorage.getItem(LS)||'null'); if(!d) return false;
    S = {...DEF, ...d.S}; stats = {...stats, ...d.stats};
    if(!Array.isArray(stats.perType)||stats.perType.length!==7) stats.perType=[0,0,0,0,0,0,0];
    if(!Array.isArray(stats.notified)) stats.notified=[];
    if(!unlocked(S.palette)) S.palette='dusty';
    score = d.score|0; shownScore = score; lastMilestone = d.lastMilestone|0;
    N=S.size; K=S.colors;
    if(Array.isArray(d.grid) && d.grid.length===N && d.grid.every(r=>Array.isArray(r)&&r.length===N)){
      grid = d.grid.map((row,r)=>row.map((c,cc)=>{
        if(!c || typeof c.t!=='number' || c.t>=K || c.t<-1) return null;
        return mk(c.t, r, cc, c.sp||null);
      }));
      if(grid.flat().some(j=>!j) || findMatches().length || !hasMove()){ grid=[]; return false; }
      return true;
    }
  }catch(e){}
  return false;
}

/* ---------- geometry & sprites ---------- */
const wrap=$('#boardWrap'), cv=$('#board'), ctx=cv.getContext('2d');
let W=0,H=0,dpr=1,cell=40,ox=0,oy=0, sprites=[], prismSpr=null;
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
  c.shadowBlur=0; c.lineWidth=Math.max(1,cell*.025); c.strokeStyle=rgba(mix(color,'#000000',.5).startsWith('rgb')?color:color,.0);
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
function resize(){
  const r=wrap.getBoundingClientRect(); W=r.width; H=r.height;
  dpr=Math.min(2,window.devicePixelRatio||1);
  cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  N=S.size; K=S.colors;
  cell=Math.max(24,Math.floor(Math.min(W,H)/N));
  ox=(W-cell*N)/2; oy=(H-cell*N)/2;
  bake(); particles.length=0; effects.length=0; floats.length=0;
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
  const set=new Set([a,b]);
  const prism=a.sp==='prism'?a:(b.sp==='prism'?b:null);
  if(prism){
    const other=prism===a?b:a;
    if(other.sp==='prism') allJewels().forEach(j=>set.add(j));
    else { allJewels().forEach(j=>{ if(j.t===other.t) set.add(j); }); if(other.sp) set.add(other); }
  }
  expandSpecials(set,new Set());
  beginClear(set,1,[]);
}
function expandSpecials(set,protectedSet){
  const q=[...set], done=new Set();
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
      if(host.sp) host=null;
    }
    if(host) creations.push({j:host,kind});
    for(const j of g.cells) if(j!==host) clear.add(j);
  }
  for(const {j,kind} of creations){
    j.sp=kind; if(kind==='prism') j.t=-1;
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
  if(d>1){ const b=$('#cascade'); b.textContent='×'+d; b.hidden=false; }
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
  $('#cascade').hidden=true;
  const m=(score/5000)|0;
  if(m>lastMilestone){ lastMilestone=m; celebrate(); sndChord(); toast((m*5000).toLocaleString()+' sparkles ✨'); }
  for(const u of UNLOCKS) if(stats.jewels>=u.at && !stats.notified.includes(u.id)){
    stats.notified.push(u.id); sndUnlock(); toast('Palette unlocked: '+PALETTES[u.id].label+' 🎨'); renderPalettes();
  }
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
  sndStir(); if(!auto) toast('Stirring the jewels ✨');
  setPhase('stir',.6);
}
function afterStir(){
  const m=findMatches();
  if(m.length) beginResolve(m,1,null); else finishTurn();
}
function newBoard(){
  T.length=0; particles.length=0; effects.length=0; floats.length=0;
  sel=null; hintPair=null; depth=0; score=0; shownScore=0; lastMilestone=0;
  $('#cascade').hidden=true;
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
  stats.sessions++; setPhase('fall',maxDur+.05); save(); updateHUD();
}

/* ---------- particles / effects / floats ---------- */
const particles=[], effects=[], floats=[];
function spawnParticles(j){
  const n=S.motion?2:8, col=pal().jewels[j.t>=0?j.t:3];
  for(let i=0;i<n;i++){ const a=rnd(Math.PI*2), sp=rnd(40,170);
    particles.push({x:px(j),y:py(j),vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-40,t:0,dur:rnd(.4,.85),
      size:rnd(1.5,3.6)*(cell/45),col,petal:false}); }
}
function celebrate(){
  if(S.motion) return;
  for(let i=0;i<26;i++)
    particles.push({x:ox+rnd(cell*N),y:oy-rnd(20),vx:rnd(-24,24),vy:rnd(30,80),t:0,dur:rnd(1.3,2),
      size:rnd(3,6.5)*(cell/45),col:pal().jewels[irnd(K)],petal:true,rot:rnd(6.28)});
}
function stepFx(dt){
  for(let i=particles.length-1;i>=0;i--){ const p=particles[i]; p.t+=dt;
    if(p.t>=p.dur){particles.splice(i,1);continue;}
    p.vy+=(p.petal?26:130)*dt; p.x+=p.vx*dt; p.y+=p.vy*dt; if(p.petal)p.rot+=dt*2; }
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
function note(f,dur=.4,g=.2,type='sine',when=0){
  if(!AC||!S.sound) return;
  const t=AC.currentTime+when;
  const o=AC.createOscillator(), o2=AC.createOscillator(), gn=AC.createGain();
  o.type=type; o.frequency.value=f; o2.type='sine'; o2.frequency.value=f*2.001;
  const g2=AC.createGain(); g2.gain.value=.25;
  gn.gain.setValueAtTime(0,t); gn.gain.linearRampToValueAtTime(g,t+.008);
  gn.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(gn); o2.connect(g2); g2.connect(gn); gn.connect(master);
  o.start(t); o2.start(t); o.stop(t+dur+.05); o2.stop(t+dur+.05);
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
  musicTimer=setInterval(()=>{ ci=(ci+1)%CHORDS.length;
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
let dragStart=null, dragCell=null, swiped=false, kcur=null;
function cellAt(e){
  const r=cv.getBoundingClientRect();
  const c=Math.floor((e.clientX-r.left-ox)/cell), rr_=Math.floor((e.clientY-r.top-oy)/cell);
  return (rr_>=0&&rr_<N&&c>=0&&c<N)?{r:rr_,c}:null;
}
cv.addEventListener('pointerdown',e=>{
  ensureAudio(); idleT=0; hintPair=null;
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
  swiped=true; sel=null;
  if(b) trySwap(grid[dragCell.r][dragCell.c],b);
});
cv.addEventListener('pointerup',e=>{
  if(dragStart&&!swiped&&phase==='idle'&&dragCell){
    const j=grid[dragCell.r][dragCell.c];
    if(j){
      if(sel===j) sel=null;
      else if(sel&&Math.abs(sel.r-j.r)+Math.abs(sel.c-j.c)===1){ const a=sel; sel=null; trySwap(a,j); }
      else { sel=j; sndSelect(); }
    }
  }
  dragStart=null; dragCell=null;
});
cv.addEventListener('pointercancel',()=>{dragStart=null;dragCell=null;});
cv.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('gesturestart',e=>e.preventDefault());
document.addEventListener('keydown',e=>{
  if($('#sheet').classList.contains('open')){ if(e.key==='Escape') closeSheet(); return; }
  if($('#intro').classList.contains('open')){ if(e.key==='Enter'||e.key===' ') begin(); return; }
  if(e.key==='m'){ toggleSound(); return; }
  if(e.key==='h'){ showHint(); return; }
  if(e.key==='Escape'){ sel=null; return; }
  if(phase!=='idle') return;
  const dirs={ArrowUp:[-1,0],ArrowDown:[1,0],ArrowLeft:[0,-1],ArrowRight:[0,1]};
  if(dirs[e.key]){ e.preventDefault(); ensureAudio();
    if(!kcur) kcur={r:(N/2)|0,c:(N/2)|0};
    else{ const [dr,dc]=dirs[e.key];
      if(sel&&Math.abs(sel.r-kcur.r)+Math.abs(sel.c-kcur.c)===0){
        const b=at(kcur.r+dr,kcur.c+dc); if(b){const a=sel;sel=null;trySwap(a,b);kcur={r:b.r,c:b.c};return;}
      }
      kcur={r:clamp(kcur.r+dr,0,N-1),c:clamp(kcur.c+dc,0,N-1)};
    }
  }
  if((e.key===' '||e.key==='Enter')&&kcur){ e.preventDefault();
    const j=grid[kcur.r][kcur.c];
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
  ctx.drawImage(spr,-P/2,-P/2,P,P);
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
function draw(time){
  ctx.clearRect(0,0,W,H);
  const p=pal();
  for(let r=0;r<N;r++) for(let c=0;c<N;c++){
    rr(ctx,ox+c*cell+2,oy+r*cell+2,cell-4,cell-4,cell*.22);
    ctx.fillStyle=rgba(p.cell,.55); ctx.fill();
    ctx.strokeStyle=rgba(p.accent,.07); ctx.lineWidth=1; ctx.stroke();
  }
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
  for(const pt of particles){
    const a=1-pt.t/pt.dur;
    ctx.globalAlpha=a;
    ctx.fillStyle=pt.col;
    if(pt.petal){ ctx.save(); ctx.translate(pt.x,pt.y); ctx.rotate(pt.rot);
      ctx.beginPath(); ctx.ellipse(0,0,pt.size,pt.size*.55,0,0,7); ctx.fill(); ctx.restore(); }
    else { ctx.beginPath(); ctx.arc(pt.x,pt.y,pt.size,0,7); ctx.fill(); }
  }
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

/* ---------- loop ---------- */
let last=performance.now(), raf=0;
function frame(now){
  const dt=Math.min(.05,(now-last)/1000); last=now;
  stepTweens(dt);
  if(phase!=='idle'){ phaseT-=dt;
    if(phaseT<=0){
      if(phase==='swap') afterSwap();
      else if(phase==='swapback') setPhase('idle',0);
      else if(phase==='clear') afterClear();
      else if(phase==='fall') afterFall();
      else if(phase==='stir') afterStir();
    }
  } else {
    idleT+=dt;
    if(S.hint>0&&!hintPair&&!sel&&idleT>S.hint) hintPair=findHint();
  }
  for(const j of allJewels()){
    if(j.land>0) j.land=Math.max(0,j.land-dt*5);
    j.glintT-=dt; if(j.glintT<=0){j.glint=1;j.glintT=rnd(5,13);}
    if(j.glint>0) j.glint=Math.max(0,j.glint-dt*1.6);
  }
  stepFx(dt);
  if(Math.abs(shownScore-score)>.5){ shownScore=lerp(shownScore,score,Math.min(1,dt*9)); updateHUD(); }
  else if(shownScore!==score){ shownScore=score; updateHUD(); }
  draw(now/1000);
  raf=requestAnimationFrame(frame);
}
function updateHUD(){ $('#score').textContent=Math.round(shownScore).toLocaleString(); }

/* ---------- UI ---------- */
function toast(msg){
  const box=$('#toasts');
  while(box.children.length>=3) box.firstChild.remove();
  const d=document.createElement('div'); d.className='toast'; d.textContent=msg;
  box.append(d);
  setTimeout(()=>d.classList.add('out'),2400); setTimeout(()=>d.remove(),2950);
}
function showHint(){ if(phase!=='idle')return; ensureAudio(); hintPair=findHint(); idleT=0; sndSelect(); }
function toggleSound(){
  S.sound=!S.sound; ensureAudio();
  if(master) master.gain.setTargetAtTime(S.sound?S.volume:0,AC.currentTime,.02);
  syncSoundBtn(); save();
}
function syncSoundBtn(){
  $('#icoOn').hidden=!S.sound; $('#icoOff').hidden=S.sound;
  $('#soundBtn').setAttribute('aria-pressed',String(S.sound));
  $('#soundBtn').setAttribute('aria-label',S.sound?'Mute sound':'Unmute sound');
}
function setPalette(id){
  if(!unlocked(id)){ const u=UNLOCKS.find(u=>u.id===id);
    toast(`Clear ${(u.at-stats.jewels).toLocaleString()} more jewels to unlock ${PALETTES[id].label}`); return; }
  S.palette=id; const p=pal(), root=document.documentElement.style;
  root.setProperty('--bg0',p.bg[0]); root.setProperty('--bg1',p.bg[1]); root.setProperty('--bg2',p.bg[2]);
  root.setProperty('--panel',p.panel); root.setProperty('--panelA',rgba(p.panel,.82));
  root.setProperty('--cell',p.cell); root.setProperty('--cellA',rgba(p.cell,.6));
  root.setProperty('--accent',p.accent); root.setProperty('--accent2',p.accent2);
  root.setProperty('--text',p.text); root.setProperty('--muted',p.muted);
  root.setProperty('--line',rgba(p.accent,.22));
  root.setProperty('--scrim',p.light?'rgba(90,70,50,.35)':'rgba(7,11,18,.55)');
  document.body.dataset.palette=id;
  document.querySelector('meta[name=theme-color]').content=p.bg[0];
  bake(); renderPalettes(); save();
}
function renderPalettes(){
  const box=$('#palettes'); box.innerHTML='';
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
  const fav=stats.perType.some(v=>v>0)?NAMES[stats.perType.indexOf(Math.max(...stats.perType))]:'—';
  $('#stats').innerHTML=`
    <div class="stat"><b>${stats.jewels.toLocaleString()}</b><span>Lifetime sparkles</span></div>
    <div class="stat"><b>${fav}</b><span>Favorite jewel</span></div>
    <div class="stat"><b>×${stats.bestCascade}</b><span>Longest cascade</span></div>
    <div class="stat"><b>${stats.bestSession.toLocaleString()}</b><span>Best session</span></div>`;
  const next=UNLOCKS.find(u=>stats.jewels<u.at);
  $('#unlockProg').innerHTML=next
    ? `Next palette: ${PALETTES[next.id].label} — ${stats.jewels.toLocaleString()} / ${next.at.toLocaleString()} ✦<div class="bar"><i style="width:${clamp(stats.jewels/next.at*100,0,100)}%"></i></div>`
    : 'All palettes unlocked ✨';
}
function openSheet(){ renderPalettes(); renderStats(); $('#sheet').classList.add('open'); $('#scrim').classList.add('open'); }
function closeSheet(){ $('#sheet').classList.remove('open'); $('#scrim').classList.remove('open'); save(); }
let confirmCb=null;
function openConfirm(text,cb){ $('#confirmText').textContent=text; confirmCb=cb; $('#confirm').classList.add('open'); }
function closeConfirm(){ $('#confirm').classList.remove('open'); confirmCb=null; }
function freshBoard(){
  if(score>0) openConfirm('Start a fresh board? Your keepsakes and lifetime sparkles stay.',()=>{newBoard();toast('A fresh board, just for you ✧');});
  else { newBoard(); toast('A fresh board, just for you ✧'); }
}
function begin(){
  ensureAudio(); stats.seenIntro=true; save();
  $('#intro').classList.remove('open');
}

/* ---------- wiring ---------- */
function syncSettingsUI(){
  $('#setSound').checked=S.sound; $('#setMusic').checked=S.music;
  $('#setVolume').value=S.volume; $('#setMotion').checked=S.motion;
  $('#setZen').checked=S.zen; $('#setHint').value=String(S.hint);
  document.body.classList.toggle('rm',S.motion);
  document.body.classList.toggle('zen',S.zen);
  for(const b of $('#segSize').children) b.classList.toggle('on',+b.dataset.v===S.size);
  for(const b of $('#segColors').children) b.classList.toggle('on',+b.dataset.v===S.colors);
  syncSoundBtn();
}
$('#soundBtn').addEventListener('click',toggleSound);
$('#settingsBtn').addEventListener('click',()=>{ensureAudio();openSheet();});
$('#closeSheet').addEventListener('click',closeSheet);
$('#scrim').addEventListener('click',closeSheet);
$('#hintBtn').addEventListener('click',showHint);
$('#stirBtn').addEventListener('click',()=>{ensureAudio();doStir(false);});
$('#newBtn').addEventListener('click',()=>{ensureAudio();freshBoard();});
$('#freshBtn').addEventListener('click',()=>{closeSheet();freshBoard();});
$('#resetBtn').addEventListener('click',()=>{
  closeSheet();
  openConfirm('Erase all progress, stats and keepsakes? This cannot be undone.',()=>{
    try{localStorage.removeItem(LS);}catch(e){} location.reload();
  });
});
$('#confirmNo').addEventListener('click',closeConfirm);
$('#confirmYes').addEventListener('click',()=>{const cb=confirmCb;closeConfirm();cb&&cb();});
$('#beginBtn').addEventListener('click',begin);
$('#setSound').addEventListener('change',e=>{S.sound=e.target.checked;ensureAudio();
  if(master)master.gain.setTargetAtTime(S.sound?S.volume:0,AC.currentTime,.02);syncSoundBtn();save();});
$('#setMusic').addEventListener('change',e=>{S.music=e.target.checked;ensureAudio();
  if(S.music)startMusic();else stopMusic();save();});
$('#setVolume').addEventListener('input',e=>{S.volume=+e.target.value;
  if(master&&S.sound)master.gain.setTargetAtTime(S.volume,AC.currentTime,.02);save();});
$('#setMotion').addEventListener('change',e=>{S.motion=e.target.checked;document.body.classList.toggle('rm',S.motion);save();});
$('#setZen').addEventListener('change',e=>{S.zen=e.target.checked;document.body.classList.toggle('zen',S.zen);save();});
$('#setHint').addEventListener('change',e=>{S.hint=+e.target.value;save();});
$('#segSize').addEventListener('click',e=>{
  const v=e.target.dataset&&+e.target.dataset.v; if(!v||v===S.size)return;
  S.size=v; resize(); newBoard(); syncSettingsUI(); toast(`A cozy ${v}×${v} board ✧`);
});
$('#segColors').addEventListener('click',e=>{
  const v=e.target.dataset&&+e.target.dataset.v; if(!v||v===S.colors)return;
  S.colors=v; resize(); newBoard(); syncSettingsUI(); toast(v===6?'Six jewels — gentler matches':'Seven jewels — the classic mix');
});
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){ cancelAnimationFrame(raf); save(); if(AC)AC.suspend(); }
  else{ last=performance.now(); raf=requestAnimationFrame(frame); if(AC&&S.sound)AC.resume(); }
});
window.addEventListener('pagehide',save);
new ResizeObserver(()=>resize()).observe(wrap);

/* ---------- home-screen icon (generated, no asset file needed) ---------- */
function makeIcon(){
  try{
    const s=document.createElement('canvas'); s.width=s.height=180;
    const c=s.getContext('2d');
    const g=c.createLinearGradient(0,0,180,180);
    g.addColorStop(0,'#1f3349'); g.addColorStop(1,'#0e1622');
    rr(c,0,0,180,180,40); c.fillStyle=g; c.fill();
    const jg=c.createRadialGradient(72,64,8,90,94,62);
    jg.addColorStop(0,'#ffd7ea'); jg.addColorStop(.45,'#f28bb8'); jg.addColorStop(1,'#a04a78');
    c.shadowColor='rgba(242,139,184,.7)'; c.shadowBlur=26;
    shapePath(c,'heart',90,92,52); c.fillStyle=jg; c.fill(); c.shadowBlur=0;
    c.beginPath(); c.ellipse(72,66,15,8,-.5,0,7); c.fillStyle='rgba(255,255,255,.6)'; c.fill();
    c.fillStyle='#d3e5f5';
    c.beginPath(); c.moveTo(142,32); c.lineTo(146,42); c.lineTo(156,46); c.lineTo(146,50); c.lineTo(142,60); c.lineTo(138,50); c.lineTo(128,46); c.lineTo(138,42); c.closePath(); c.fill();
    $('#ati').href=s.toDataURL('image/png');
  }catch(e){}
}

/* ---------- boot ---------- */
if(!localStorage.getItem(LS) && window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) S.motion=true;
const restored=load();
N=S.size; K=S.colors;
setPalette(S.palette);
syncSettingsUI();
resize();
if(!restored) newBoard(); else { updateHUD(); setTimeout(()=>toast('Welcome back — your board was waiting ✦'),700); }
if(stats.seenIntro) $('#intro').classList.remove('open');
makeIcon();
raf=requestAnimationFrame(frame);
if('serviceWorker' in navigator && location.protocol!=='file:')
  navigator.serviceWorker.register('sw.js').catch(()=>{});
})();