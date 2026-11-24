/* ESCAPE SUBSECTOR 086 — The Citadel. Self-contained ASCII endless runner. */
(function(){
"use strict";
var T=(window.CitadelI18n&&window.CitadelI18n.t)||function(s){return s;};
var IT=!!(window.CitadelI18n&&window.CitadelI18n.lang==="it");
var CFG={
  cols:64, rows:24, ground:18, px:16,
  baseSpeed:15, speedGain:1.8, speedTau:2600,
  jumpTime:0.75, jumpPeak:6.5, slideTime:0.75, landTime:0.09,
  gapMin:[1.25,0.80], gapMax:[2.20,1.25], gapMixed:0.12,
  diffScore:5000,
  firstEnemy:350, enemyGapEasy:[1100,1900], enemyGapHard:[500,900],
  robot:{w:7,close:9,prep:0.78,win:0.30,minPrep:0.5,minWin:0.2},
  beast:{w:7,close:15,prep:0.58,win:0.25,minPrep:0.4,minWin:0.18},
  lunge:0.14, post:0.12, parryLock:0.5,
  best:"citadel-escape-086-best", sfx:"citadel-escape-086-sfx"
};
var MUSIC={title:"kill TIME",artist:"Subsector086Compiler",file:"audio/kill-time.mp3",vol:0.25};
var SCRIPT_SRC=document.currentScript&&document.currentScript.src;
var COLS=CFG.cols, ROWS=CFG.rows, GR=CFG.ground, FEET=GR-1, PX=CFG.px, STEP=1/60;
var PAL=["","#ff3b30","#ff8a7e","#9c2d26","#5a1713","#a3a3a3","#ececec","#5d5d5d"];
var RED=1,HI=2,DIM=3,LINE=4,GREY=5,WHITE=6,DARK=7;

function rnd(a,b){return a+Math.random()*(b-a);}
function pick(a){return a[(Math.random()*a.length)|0];}
function lerp(a,b,t){return a+(b-a)*t;}
function pad(n,l){n=String(Math.floor(n));while(n.length<l)n="0"+n;return n;}
function lsGet(k){try{return localStorage.getItem(k);}catch(e){return null;}}
function lsSet(k,v){try{localStorage.setItem(k,v);}catch(e){}}
function el(t,c){var e=document.createElement(t);if(c)e.className=c;return e;}
function center(s,w){var n=Math.max(0,w-s.length),l=n>>1;return new Array(l+1).join(" ")+s;}
function mult(score){return 1+CFG.speedGain*(1-Math.exp(-score/CFG.speedTau));}
function diff(score){return Math.min(1,score/CFG.diffScore);}

/* ---------- sprites ---------- */
var RUN=[[" O ","/|\\","/ \\"],[" O ","/|\\"," | "],[" O ","\\|/","< >"],[" O ","/|\\"," | "]];
var CROUCH=["   "," O ","/_\\"], UP=["\\O/"," | ","/ \\"], DOWN=[" O ","/|\\","| |"], LAND=["   "," O ","/_\\"];
var SLIDE=["___O__","__-O__"];
var ROBOT_RUN=[[" [RBT] ","/|###|\\"," _/ \\_ "],[" [RBT] ","/|###|\\"," /_ _\\ "]];
var ROBOT_PREP=[" [RBT] ","\\|###|/"," _/ \\_ "], ROBOT_STRIKE=[" [RBT] ","-|###|>"," _/ \\_ "];
var BEAST_RUN=[["/X\\_/X\\","( 0 0 )"," \\_^^_/"],["/X\\_/X\\","( 0 0 )"," /_^^_\\"]];
var BEAST_PREP=["/X\\_/X\\","( @ @ )"," \\_^^_/"], BEAST_STRIKE=["/X\\_/X\\","( > < )"," \\_vv_/"];

var LOWS=[
 {w:6,inset:1,art:[" #### ","######"],col:GREY},
 {w:4,inset:0,art:[".--.","|##|"],col:GREY},
 {w:5,inset:0,art:[" /\\/ ","~^~^~"],col:HI},
 {w:5,inset:0,art:["[===]","|~~~|"],col:GREY}
];
var FIRE={w:5,inset:1,haz:1,frames:[[" ) ( ","(^^^)"],["( ) )","(^^^)"],[" (  )","(^^^)"]],col:RED};
var HIGHS=[
 {w:4,inset:0,body:"|##|",cap:"\\==/",col:GREY},
 {w:4,inset:0,body:"[::]",cap:"/vv\\",col:GREY}
];
var SPARK={w:4,inset:0,haz:1,body:["\\/\\/","/\\/\\"],cap:"(**)",col:RED};

var BGART=[
 {a:[".--.","|~~|","|~~|","'--'"],b:2},
 {a:[".--.","|~ |","| /|","'/-'"],b:2},
 {a:IT?["+----------+","| PERICOLO |","+----------+"]:["+--------+","| DANGER! |","+--------+"],b:-1,y:7},
 {a:IT?["+--------+","| USCITA |","+--------+"," ->->->"]:["+------+","| EXIT |","+------+"," ->->->"],b:-1,y:9},
 {a:["[:::]","|___|"],b:2},
 {a:["/!\\","---"],b:-1,y:6},
 {a:["+-------------+","| SUBSECTOR 086 |","+-------------+"],b:-1,y:5}
];

/* ---------- mount ---------- */
function mount(host,opts){
  opts=opts||{};
  var embedded=!!opts.embedded, dead_=false;
  var coarse=window.matchMedia&&matchMedia("(pointer:coarse)").matches;
  var reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;

  var wrap=el("div","es-wrap"), cv=el("canvas"), ctx=cv.getContext("2d");
  cv.setAttribute("role","img"); cv.setAttribute("aria-label",T("ESCAPE SUBSECTOR 086 game area"));
  var screenEl=el("div","es-screen"), parryBtn=el("button","btn es-parry");
  parryBtn.type="button"; parryBtn.textContent=T("PARRY");
  var help=el("p","es-help");
  help.textContent=coarse?T("TAP TOP: JUMP  //  TAP BOTTOM / SWIPE DOWN: SLIDE  //  PARRY BUTTON WHEN ENEMY NEARS"):T("SPACE/W/UP: JUMP  //  S/DOWN: SLIDE  //  F/SHIFT: PARRY  //  P: PAUSE  //  M: SOUND");
  var credit=el("span","es-music"); credit.textContent="\u266A  "+MUSIC.title+"  //  "+MUSIC.artist;
  help.appendChild(credit);
  wrap.appendChild(cv); wrap.appendChild(screenEl); wrap.appendChild(parryBtn);
  host.appendChild(wrap); host.appendChild(help);

  var buf=new Array(COLS*ROWS), colr=new Uint8Array(COLS*ROWS);
  var cw=8,chh=17,fs=14,dpr=1;
  var S="title", G=null, best=parseInt(lsGet(CFG.best),10)||0, sfxOn=lsGet(CFG.sfx)!=="0";
  var raf=0,last=0,acc=0;

  /* ---------- audio ---------- */
  var AC=null, noiseBuf=null;
  function ac(){ if(!AC){ try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return AC; }
  function tone(f1,f2,dur,type,vol){
    if(!sfxOn) return; var a=ac(); if(!a) return;
    try{ var o=a.createOscillator(),g=a.createGain(),t=a.currentTime;
      o.type=type||"square"; o.frequency.setValueAtTime(f1,t); o.frequency.exponentialRampToValueAtTime(Math.max(20,f2),t+dur);
      g.gain.setValueAtTime(vol||0.05,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      o.connect(g); g.connect(a.destination); o.start(t); o.stop(t+dur+0.02); }catch(e){}
  }
  function noise(dur,vol,freq){
    if(!sfxOn) return; var a=ac(); if(!a) return;
    try{ if(!noiseBuf){ noiseBuf=a.createBuffer(1,a.sampleRate*0.5,a.sampleRate); var d=noiseBuf.getChannelData(0); for(var i=0;i<d.length;i++) d[i]=Math.random()*2-1; }
      var s=a.createBufferSource(),f=a.createBiquadFilter(),g=a.createGain(),t=a.currentTime;
      s.buffer=noiseBuf; f.type="lowpass"; f.frequency.value=freq||1800;
      g.gain.setValueAtTime(vol||0.08,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
      s.connect(f); f.connect(g); g.connect(a.destination); s.start(t); s.stop(t+dur); }catch(e){}
  }
  function sfx(n){
    if(n==="jump") tone(300,640,0.1,"square",0.04);
    else if(n==="slide") noise(0.14,0.04,900);
    else if(n==="warn") { tone(880,880,0.07,"square",0.05); setTimeout(function(){tone(880,880,0.07,"square",0.05);},120); }
    else if(n==="alarm") { tone(500,900,0.35,"sawtooth",0.04); }
    else if(n==="swing") noise(0.07,0.03,3000);
    else if(n==="parry") { tone(1500,500,0.18,"triangle",0.08); noise(0.1,0.05,4000); }
    else if(n==="shot") noise(0.2,0.12,2500);
    else if(n==="boom") { noise(0.4,0.1,700); tone(160,40,0.35,"sawtooth",0.05); }
    else if(n==="die") { tone(260,40,0.55,"sawtooth",0.07); noise(0.3,0.08,600); }
    else if(n==="land") noise(0.05,0.03,500);
  }

  /* ---------- background music (25% volume, only while playing) ---------- */
  var mus=null;
  function musInit(){
    if(mus) return mus;
    try{
      var url=SCRIPT_SRC?new URL("../../"+MUSIC.file,SCRIPT_SRC).href:MUSIC.file;
      mus=new Audio(url); mus.loop=true; mus.preload="auto"; mus.volume=MUSIC.vol;
    }catch(e){ mus=null; }
    return mus;
  }
  function musPlay(){
    var m=musInit(); if(!m) return;
    m.volume=MUSIC.vol; m.muted=!sfxOn;
    if(window.CitadelPlayer&&window.CitadelPlayer.duck) window.CitadelPlayer.duck();
    var p=m.play(); if(p&&p.catch) p.catch(function(){});
  }
  function musPause(release){
    if(mus) mus.pause();
    if(release&&window.CitadelPlayer&&window.CitadelPlayer.release) window.CitadelPlayer.release();
  }

  /* ---------- game state ---------- */
  function newGame(){
    return { t:0,dist:0,score:0,speed:CFG.baseSpeed,
      py:0,vy:0,pst:"run",slideT:0,jt:0,landT:0,runAnim:0,slideQ:false,jumpBuf:0,
      obs:[],bg:[],parts:[],enemy:null,cine:null,dead:null,
      lastEdge:COLS+14,gap:0,last:[],lastHi:null,
      enc:{ph:"idle",next:CFG.firstEnemy,cool:0},
      parryCd:0,swing:0,msg:null,msgT:0,grace:0,shake:0,flash:0,bgNext:COLS,sparkT:0,dustT:0 };
  }
  function msg(t,s,col){ G.msg={text:t,col:col||RED}; G.msgT=s; }

  function startGame(){
    G=newGame(); S="play"; hideScreen(); parryBtn.classList.remove("on");
    G.gap=0; last=performance.now(); acc=0;
    ac(); musPlay();
  }
  function setBest(){ if(G.score>best){ best=G.score; lsSet(CFG.best,String(best)); return true; } return false; }

  function die(cause){
    if(S!=="play"||G.dead) return;
    G.dead={t:0,cause:cause}; S="dead"; G.shake=0.4; G.flash=0.5;
    parryBtn.classList.remove("on"); sfx("die");
    for(var i=0;i<26;i++) G.parts.push({x:PX+1,y:FEET-1,vx:rnd(-14,14),vy:rnd(-18,-2),ch:pick(["*","#","%","+","."]),col:pick([RED,HI,WHITE]),life:rnd(0.5,1.1),g:40});
  }
  function gameOver(){
    var rec=setBest(); S="over"; G.rec=rec; musPause(true);
    showScreen([
      "========================================",
      center(T("RUN TERMINATED"),40),
      "========================================",
      "",
      center(T("SUBSECTOR 086 LOST."),40),
      "",
      center(T("FINAL SCORE: ")+pad(G.score,6),40),
      center(T("PERSONAL BEST: ")+pad(best,6)+(rec?T("  *NEW*"):""),40),
      "",
      "========================================"
    ],[[T("RETRY"),startGame],[embedded?T("BACK TO TERMINAL"):T("EXIT TO TERMINAL"),exit]]);
  }
  function exit(){
    musPause(true);
    if(embedded){ location.href="index.html"; return; }
    destroy(); if(opts.onExit) opts.onExit();
  }

  /* ---------- input actions ---------- */
  function jump(){
    if(S!=="play"||G.cine) return;
    if(G.py>0.01){ G.jumpBuf=0.12; return; }
    G.pst="jump"; G.py=0.001; G.vy=4*CFG.jumpPeak/CFG.jumpTime; G.jt=0; G.slideT=0; G.slideQ=false; sfx("jump");
  }
  function slide(){
    if(S!=="play"||G.cine) return;
    if(G.py>0.01){ G.slideQ=true; if(G.vy>-26) G.vy=-26; return; }
    if(G.pst!=="slide"){ G.pst="slide"; G.slideT=CFG.slideTime; sfx("slide"); }
  }
  function parry(){
    if(S!=="play"||G.cine||G.parryCd>0) return;
    G.swing=0.2; sfx("swing");
    var e=G.enemy, ok=false;
    if(e){ if(e.state==="ready"&&e.t>=e.prep-e.win) ok=true; else if(e.state==="strike"&&e.t<=CFG.post) ok=true; }
    if(ok){ startCine(); }
    else { G.parryCd=e?CFG.parryLock:0.3; if(e) msg(T("MISTIMED"),0.6,HI); }
  }
  function startCine(){
    var e=G.enemy; e.state="cine"; e.x=5;
    G.cine={t:0,ts:0.12,shot:false,boom:false};
    G.py=0;G.vy=0;G.pst="run"; G.shake=reduce?0:0.15; G.flash=0.2; sfx("parry");
  }
  function pause(){
    if(S!=="play") return; S="pause"; musPause(false);
    showScreen([center(T("== PAUSED =="),40),"",center(T("SYSTEM HALTED"),40)],[[T("RESUME"),resume],[embedded?T("BACK TO TERMINAL"):T("EXIT TO TERMINAL"),exit]]);
  }
  function resume(){ if(S!=="pause") return; S="play"; hideScreen(); last=performance.now(); acc=0; musPlay(); }

  function onKey(e){
    if(dead_||e.ctrlKey||e.metaKey||e.altKey) return;
    var k=e.key, tg=(e.target&&e.target.tagName||"").toLowerCase();
    if(tg==="input"||tg==="textarea"||tg==="select") return;
    var inter=(tg==="button"||tg==="a");
    if(k==="m"||k==="M"){ sfxOn=!sfxOn; lsSet(CFG.sfx,sfxOn?"1":"0"); if(mus) mus.muted=!sfxOn; if(S==="play") msg(sfxOn?T("SOUND ON"):T("SOUND OFF"),0.8,GREY); return; }
    if(S==="play"||S==="dead"){
      if(k===" "||k==="w"||k==="W"||k==="ArrowUp"){ if(!e.repeat) jump(); e.preventDefault(); }
      else if(k==="s"||k==="S"||k==="ArrowDown"){ if(!e.repeat) slide(); e.preventDefault(); }
      else if(k==="f"||k==="F"||k==="Shift"){ if(!e.repeat) parry(); e.preventDefault(); }
      else if(k==="p"||k==="P"||k==="Escape"){ pause(); e.preventDefault(); }
      return;
    }
    if(inter) return;
    if(S==="title"){
      if(k==="Enter"||(!embedded&&k===" ")){ startGame(); e.preventDefault(); }
      else if(k==="Escape"&&!embedded){ exit(); }
    } else if(S==="over"){
      if(k==="Enter"||k===" "){ startGame(); e.preventDefault(); }
      else if(k==="Escape"&&!embedded){ exit(); }
    } else if(S==="pause"){
      if(k==="Enter"||k==="p"||k==="P"){ resume(); e.preventDefault(); }
      else if(k==="Escape"&&!embedded){ exit(); }
    }
  }
  var ptr=null;
  function onPtrDown(e){
    if(S!=="play") return;
    var r=cv.getBoundingClientRect(), y=(e.clientY-r.top)/r.height;
    ptr={y:e.clientY,done:false};
    if(y<0.55) jump(); else slide();
    e.preventDefault();
  }
  function onPtrMove(e){ if(ptr&&!ptr.done&&e.clientY-ptr.y>36){ ptr.done=true; slide(); } }
  function onPtrUp(){ ptr=null; }
  cv.addEventListener("pointerdown",onPtrDown); cv.addEventListener("pointermove",onPtrMove);
  window.addEventListener("pointerup",onPtrUp); window.addEventListener("pointercancel",onPtrUp);
  parryBtn.addEventListener("pointerdown",function(e){ parry(); e.preventDefault(); });
  parryBtn.addEventListener("keydown",function(e){ e.preventDefault(); });
  window.addEventListener("keydown",onKey);
  function onVis(){ if(document.hidden&&S==="play") pause(); }
  document.addEventListener("visibilitychange",onVis);
  window.addEventListener("resize",resize);

  /* ---------- DOM screens ---------- */
  function showScreen(lines,btns){
    screenEl.textContent=""; screenEl.classList.add("on");
    var pre=el("pre","es-art"); pre.textContent=lines.join("\n"); screenEl.appendChild(pre);
    var row=el("div","es-btns"), first=null;
    btns.forEach(function(b){ var a=el("button","btn"); a.type="button"; a.textContent=b[0]; a.addEventListener("click",function(ev){ ev.preventDefault(); b[1](); }); row.appendChild(a); if(!first) first=a; });
    screenEl.appendChild(row);
    if(!embedded&&first){ try{ first.focus({preventScroll:true}); }catch(e){} }
  }
  function hideScreen(){
    screenEl.classList.remove("on"); screenEl.textContent="";
    if(document.activeElement&&document.activeElement.blur&&wrap.contains(document.activeElement)) document.activeElement.blur();
  }
  function showTitle(){
    S="title"; G=newGame();
    showScreen([
      "========================================",
      center("ESCAPE SUBSECTOR 086",40),
      "========================================",
      center(T("SUBSECTOR CONTAINMENT FAILURE"),40),
      "",
      center(T("HIGH SCORE: ")+pad(best,6),40),
      "",
      "========================================",
      center(T("THE CITADEL SYSTEM"),40),
      "========================================"
    ],[[T("START GAME"),startGame],[embedded?T("BACK TO TERMINAL"):T("EXIT TO TERMINAL"),exit]]);
  }

  /* ---------- buffer helpers ---------- */
  function clear(){ for(var i=0;i<buf.length;i++){ buf[i]=" "; colr[i]=0; } }
  function put(str,c0,row,col,minC,maxC){
    if(row<0||row>=ROWS) return;
    minC=minC==null?1:minC; maxC=maxC==null?COLS-2:maxC;
    for(var i=0;i<str.length;i++){ var ch=str.charAt(i); if(ch===" ") continue; var c=c0+i; if(c<minC||c>maxC) continue; buf[row*COLS+c]=ch; colr[row*COLS+c]=col; }
  }
  function putSprite(art,c0,rowBottom,col){ for(var i=0;i<art.length;i++) put(art[i],c0,rowBottom-(art.length-1-i),col); }

  /* ---------- update ---------- */
  function worldAdvance(move,wdt,doGen){
    G.dist+=move; G.score=Math.floor(G.dist); G.lastEdge-=move;
    for(var i=G.obs.length-1;i>=0;i--){ var o=G.obs[i]; o.x-=move; if(o.x+o.def.w<1) G.obs.splice(i,1); }
    for(i=G.bg.length-1;i>=0;i--){ var b=G.bg[i]; b.x-=move*0.35; if(b.x+b.w<1) G.bg.splice(i,1); }
    G.bgNext-=move*0.35;
    if(G.bgNext<=COLS){ var t=pick(BGART), w=t.a[0].length;
      for(var k=0;k<t.a.length;k++) w=Math.max(w,t.a[k].length);
      G.bg.push({x:COLS+1,w:w,t:t,col:pick([LINE,LINE,DIM])}); G.bgNext=COLS+rnd(10,26)+w; }
    G.floor=(G.floor||0)+move;
  }
  function spawnObs(){
    var d=diff(G.score), hi, def;
    if(Math.random()<0.15+0.2*d){ hi=Math.random()<0.5; def=hi?SPARK:FIRE; }
    else { hi=Math.random()<0.42; def=hi?pick(HIGHS):pick(LOWS); }
    var L=G.last; if(L.length>=3&&L[0]===L[1]&&L[1]===L[2]&&L[2]===hi){ hi=!hi; def=hi?pick(HIGHS):pick(LOWS); }
    L.push(hi); if(L.length>3) L.shift();
    var x=Math.max(G.lastEdge+G.gap,COLS+2);
    G.obs.push({x:x,def:def,hi:hi});
    var mixed=(G.lastHi!==null&&G.lastHi!==hi)?CFG.gapMixed:0; G.lastHi=hi;
    G.lastEdge=x+def.w;
    var gt=rnd(lerp(CFG.gapMin[0],CFG.gapMin[1],d),lerp(CFG.gapMax[0],CFG.gapMax[1],d))+mixed;
    G.gap=G.speed*gt;
  }
  function spawnEnemy(){
    var d=diff(G.score), beast=Math.random()<0.2+0.5*d&&G.score>900, B=beast?CFG.beast:CFG.robot;
    G.enemy={kind:beast?"beast":"robot",x:-9,state:"run",t:0,anim:0,
      close:B.close*(1+0.35*d),prep:Math.max(B.minPrep,B.prep*(1-0.18*d)),win:Math.max(B.minWin,B.win*(1-0.22*d))};
    parryBtn.classList.add("on");
  }
  function explodeEnemy(){
    var e=G.enemy, art=enemyArt(e);
    for(var r=0;r<art.length;r++) for(var c=0;c<art[r].length;c++){ var ch=art[r].charAt(c); if(ch===" ") continue;
      G.parts.push({x:e.x+c,y:FEET-(art.length-1-r),vx:rnd(-14,6),vy:rnd(-16,-2),ch:ch,col:pick([RED,HI,DIM]),life:rnd(0.7,1.3),g:38}); }
  }
  function enemyArt(e){
    if(e.kind==="robot") return e.state==="ready"?ROBOT_PREP:e.state==="strike"?ROBOT_STRIKE:ROBOT_RUN[Math.floor(e.anim*9)%2];
    return e.state==="ready"?BEAST_PREP:e.state==="strike"?BEAST_STRIKE:BEAST_RUN[Math.floor(e.anim*9)%2];
  }
  function endEncounter(){
    G.enemy=null; parryBtn.classList.remove("on");
    var d=diff(G.score);
    G.enc.ph="cool"; G.enc.cool=1.3;
    G.enc.next=G.score+rnd(lerp(CFG.enemyGapEasy[0],CFG.enemyGapHard[0],d),lerp(CFG.enemyGapEasy[1],CFG.enemyGapHard[1],d));
  }
  function updateEnemy(dt){
    var e=G.enemy; if(!e||e.state==="cine") return;
    e.anim+=dt; e.t+=dt;
    if(e.state==="run"){ e.x+=e.close*dt; if(e.x>=4){ e.x=4; e.state="ready"; e.t=0; sfx("warn"); } }
    else if(e.state==="ready"){ if(e.t>=e.prep){ e.state="strike"; e.t=0; } }
    else if(e.state==="strike"){ e.x=lerp(4,10,Math.min(1,e.t/CFG.lunge)); if(e.t>=CFG.lunge) die("enemy"); }
  }
  function updateCine(dt){
    var c=G.cine; c.t+=dt;
    c.ts=c.t<0.9?0.12:lerp(0.12,1,Math.min(1,(c.t-0.9)/0.4));
    if(!c.shot&&c.t>=0.62){ c.shot=true; sfx("shot"); G.flash=0.15; }
    if(!c.boom&&c.t>=0.68){ c.boom=true; explodeEnemy(); sfx("boom"); G.shake=reduce?0:0.2; G.enemy.state="gone"; }
    if(c.t>=1.3){ G.cine=null; G.grace=0.4; endEncounter(); }
  }
  function physics(dt){
    if(G.pst==="jump"||G.py>0.001){
      var g=8*CFG.jumpPeak/(CFG.jumpTime*CFG.jumpTime);
      G.vy-=g*dt; G.py+=G.vy*dt; G.jt+=dt;
      if(G.py<=0){ G.py=0; G.vy=0; G.landT=CFG.landTime; sfx("land"); G.pst="run";
        for(var i=0;i<4;i++) G.parts.push({x:PX+1,y:FEET,vx:rnd(-9,-2),vy:rnd(-5,-1),ch:".",col:GREY,life:0.4,g:20});
        if(G.slideQ){ G.slideQ=false; G.pst="slide"; G.slideT=CFG.slideTime; sfx("slide"); }
        else if(G.jumpBuf>0){ G.jumpBuf=0; jump(); } }
    } else if(G.pst==="slide"){
      G.slideT-=dt; G.sparkT-=dt;
      if(G.sparkT<=0){ G.sparkT=0.06; G.parts.push({x:PX,y:FEET,vx:rnd(-9,-3),vy:rnd(-7,-2),ch:"*",col:HI,life:0.3,g:30}); }
      if(G.slideT<=0) G.pst="run";
    }
    if(G.landT>0) G.landT-=dt;
    if(G.jumpBuf>0) G.jumpBuf-=dt;
  }
  function hitCheck(){
    if(G.grace>0) return;
    var px0=PX+0.5, px1=PX+3.0, sl=G.pst==="slide", ph=sl?1:3, p0=sl?0:G.py, p1=p0+ph;
    for(var i=0;i<G.obs.length;i++){ var o=G.obs[i], d=o.def;
      var x0=o.x+d.inset, x1=o.x+d.w-d.inset;
      if(px1<=x0||px0>=x1) continue;
      var h0=o.hi?2:0, h1=o.hi?99:1.75;
      if(p0<h1&&p1>h0){ die("obstacle"); return; } }
  }
  function update(dt){
    if(S==="title"){ G.speed=CFG.baseSpeed*0.8; worldAdvance(G.speed*dt,dt,false); G.runAnim+=dt; G.t+=dt; return; }
    if(S==="dead"){ G.dead.t+=dt; updateParts(dt); G.t+=dt; if(G.shake>0) G.shake-=dt; if(G.flash>0) G.flash-=dt; if(G.dead.t>=0.95) gameOver(); return; }
    if(S!=="play") return;
    var ts=1;
    if(G.cine){ updateCine(dt); if(G.cine) ts=G.cine.ts; }
    var wdt=dt*ts;
    G.t+=dt;
    G.speed=CFG.baseSpeed*mult(G.score);
    worldAdvance(G.speed*wdt,wdt,true);
    G.runAnim+=wdt*G.speed/15;
    if(!G.cine){ physics(dt); }
    if(G.parryCd>0) G.parryCd-=dt; if(G.swing>0) G.swing-=dt; if(G.grace>0) G.grace-=dt;
    if(G.msgT>0){ G.msgT-=dt; if(G.msgT<=0) G.msg=null; }
    if(G.shake>0) G.shake-=dt; if(G.flash>0) G.flash-=dt;
    /* encounter state machine */
    var en=G.enc, d=diff(G.score);
    if(en.ph==="idle"&&G.score>=en.next-G.speed*4.2){ en.ph="warn"; msg(T("WARNING: HOSTILE SIGNATURE DETECTED"),2.6,RED); sfx("alarm"); }
    else if(en.ph==="warn"&&G.obs.length===0){ en.ph="active"; spawnEnemy(); }
    else if(en.ph==="cool"){ en.cool-=dt; if(en.cool<=0){ en.ph="idle"; G.lastEdge=COLS+G.speed*0.9; G.gap=0; } }
    /* obstacle generation */
    if(en.ph==="idle"&&G.lastEdge+G.gap<=COLS+2) spawnObs();
    if(!G.cine) updateEnemy(dt);
    updateParts(wdt);
    G.dustT-=dt; if(G.dustT<=0){ G.dustT=0.12; G.parts.push({x:rnd(2,COLS-3),y:4,vx:-G.speed*0.3,vy:rnd(3,8),ch:pick(["."," ","'",","]),col:LINE,life:3,g:0,dust:1}); }
    if(!G.cine&&S==="play") hitCheck();
  }
  function updateParts(dt){
    for(var i=G.parts.length-1;i>=0;i--){ var p=G.parts[i];
      p.life-=dt; p.vy+=(p.g||0)*dt; p.x+=p.vx*dt; p.y+=p.vy*dt;
      if(p.life<=0||p.x<1||p.x>COLS-2||p.y>FEET+0.5&&!p.dust||p.y>FEET+0.5) G.parts.splice(i,1); }
    if(G.parts.length>150) G.parts.splice(0,G.parts.length-150);
  }

  /* ---------- render ---------- */
  function drawWorld(){
    /* wall seams */
    var off=Math.floor((G.floor||0)*0.25), r, c;
    for(c=1;c<COLS-1;c++){ if(((c+off)%16)===0) for(r=4;r<GR;r++) put(":",c,r,LINE); }
    /* ceiling */
    var lampOn=Math.floor(G.t*1.6)%2===0, foff=Math.floor((G.floor||0)*0.6);
    for(c=1;c<COLS-1;c++) put("=",c,3,LINE);
    for(c=1;c<COLS-1;c++) if(((c+foff)%20)===0) put("(o)",c,3,lampOn?RED:LINE);
    /* background decor */
    G.bg.forEach(function(b){
      var t=b.t, h=t.a.length, bottom=t.b>=0?(GR-1-t.b+ (t.b>0?0:0)):(t.y+h-1);
      if(t.b>=0) bottom=GR-1;
      t.a.forEach(function(line,i){ put(line,Math.round(b.x),bottom-(h-1-i),b.col); });
    });
    /* ground */
    var f=Math.floor(G.floor||0);
    for(c=1;c<COLS-1;c++){ put(((c+f)%8===0)?"+":"=",c,GR,DIM); }
    for(c=1;c<COLS-1;c++){ var h=((c+f)*2654435761>>>0)%7; put(h===0?".":h===1?":":h===2?"'":h===3?",":" ",c,GR+1,LINE); put(h===4?"_":h===5?".":" ",c,GR+2,LINE); }
    /* obstacles */
    G.obs.forEach(function(o){
      var d=o.def, x=Math.round(o.x), art;
      if(o.hi){
        var a=Math.floor(G.t*10)%2;
        for(var rr=4;rr<=14;rr++) put(d.haz?d.body[(rr+a)%2]:d.body,x,rr,d.col);
        put(d.cap,x,15,d.haz?(a?HI:RED):d.col);
      } else {
        art=d.frames?d.frames[Math.floor(G.t*9)%d.frames.length]:d.art;
        putSprite(art,x,FEET,d.col);
      }
    });
  }
  function drawEnemy(){
    var e=G.enemy; if(!e||e.state==="gone") return;
    var art=enemyArt(e), col=e.kind==="robot"?GREY:HI, blink=Math.floor(G.t*12)%2;
    if(e.state==="ready"){ col=blink?RED:HI;
      var open=e.t>=e.prep-e.win;
      put(open?"[!!]":" !! ",Math.round(e.x)+1,FEET-3,open?(blink?RED:WHITE):RED);
      if(open) put(T(">> PARRY <<"),Math.floor((COLS-T(">> PARRY <<").length)/2),6,blink?RED:WHITE);
    }
    if(e.state==="strike") col=RED;
    if(e.state==="cine") col=RED;
    putSprite(art,Math.round(e.x),FEET,col);
  }
  function drawPlayer(){
    var c0=PX, col=WHITE, G_=G;
    if(S==="dead"&&G.dead){ var tt=G.dead.t; if(tt>0.15){ return; } col=RED; }
    if(G.cine){
      var t=G.cine.t;
      if(t<0.3){ putSprite(["\\O/"," | ","/ \\"],PX,FEET,col); put("-X-",PX-4,FEET-1,Math.floor(t*20)%2?RED:WHITE); put(T(">>> PARRY! <<<"),Math.floor((COLS-T(">>> PARRY! <<<").length)/2),6,RED); }
      else if(t<0.62){ put(" O",PX,FEET-2,col); put("<==|\\",PX-3,FEET-1,col); put("/ \\",PX,FEET,col); put(T(">>> PARRY! <<<"),Math.floor((COLS-T(">>> PARRY! <<<").length)/2),6,RED); }
      else { put(" O",PX,FEET-2,col); put("<==|\\",PX-3,FEET-1,col); put("/ \\",PX,FEET,col);
        if(t<0.8){ put("*",PX-4,FEET-1,WHITE); put("\\|/",PX-6,FEET-2,RED); put("-*-",PX-6,FEET-1,WHITE); put("/|\\",PX-6,FEET,RED); }
        else put(T("TARGET DOWN"),Math.floor((COLS-T("TARGET DOWN").length)/2),6,WHITE); }
      return;
    }
    var a;
    if(G.pst==="slide"){ put(SLIDE[Math.floor(G.runAnim*8)%2],PX-2,FEET,col); }
    else {
      var rb=FEET-Math.round(G.py);
      if(G.py>0.01){ a=G.jt<0.05?CROUCH:(G.vy>0?UP:DOWN); }
      else if(G.landT>0) a=LAND;
      else a=RUN[Math.floor(G.runAnim*8)%4];
      putSprite(a,PX,rb,col);
      if(G.grace>0&&Math.floor(G.t*16)%2) { /* blink during grace */ }
    }
    if(G.swing>0) { put(")",PX+3,FEET-1,HI); put(")",PX+4,FEET-1,GREY); }
  }
  function drawParts(){
    G.parts.forEach(function(p){ put(p.ch,Math.round(p.x),Math.round(p.y),p.col); });
  }
  function drawHud(){
    var spd=(G.speed/CFG.baseSpeed).toFixed(1);
    put("+"+new Array(COLS-1).join("-")+"+",0,0,DIM,0,COLS-1);
    put("+"+new Array(COLS-1).join("-")+"+",0,2,DIM,0,COLS-1);
    put("+"+new Array(COLS-1).join("-")+"+",0,21,DIM,0,COLS-1);
    put("+"+new Array(COLS-1).join("-")+"+",0,23,DIM,0,COLS-1);
    for(var r=1;r<=22;r++){ if(r===2||r===21) continue; put("|",0,r,DIM,0,COLS-1); put("|",COLS-1,r,DIM,0,COLS-1); }
    put(" CITADEL // SUBSECTOR 086",1,1,HI);
    var right=T("SCORE: ")+pad(G.score,8)+T("  SPD: ")+spd+" ";
    put(right,COLS-1-right.length,1,WHITE);
    var st=T("SYSTEM STATUS: CRITICAL"), sc=Math.floor(G.t*2)%2?RED:DIM;
    if(G.enemy&&G.enemy.state!=="gone"){ st=T("!! HOSTILE CONTACT !!"); sc=RED; }
    put(" "+st,1,22,sc);
    var bs=T("BEST: ")+pad(Math.max(best,G.score),8)+" "; put(bs,COLS-1-bs.length,22,GREY);
    if(G.msg&&!G.cine){ var t=G.msg.text; if(Math.floor(G.t*6)%2||G.msgT<0.4) put(t,Math.floor((COLS-t.length)/2),6,G.msg.col); }
    if(S==="dead"&&G.dead&&G.dead.t>0.1){ var m=G.dead.cause==="enemy"?T(">>> CRITICAL DAMAGE <<<"):T(">>> IMPACT <<<"); put(m,Math.floor((COLS-m.length)/2),8,RED); }
  }
  function render(){
    if(!G) return;
    clear(); drawWorld(); drawEnemy(); drawParts(); drawPlayer(); drawHud();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.fillStyle="#050000"; ctx.fillRect(0,0,cv.width,cv.height);
    var sx=0,sy=0; if(G.shake>0&&!reduce){ sx=(Math.random()-0.5)*cw*0.8; sy=(Math.random()-0.5)*chh*0.5; }
    ctx.font=fs+"px VT323, ui-monospace, Consolas, 'Courier New', monospace";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    for(var ci=1;ci<PAL.length;ci++){
      ctx.fillStyle=PAL[ci];
      if(ci===RED||ci===HI){ ctx.shadowColor=PAL[RED]; ctx.shadowBlur=cw*0.6; } else { ctx.shadowBlur=0; }
      for(var r=0;r<ROWS;r++) for(var c=0;c<COLS;c++){ var i=r*COLS+c; if(colr[i]===ci){ var ch=buf[i]; if(ch!==" ") ctx.fillText(ch,c*cw+cw/2+sx,r*chh+chh/2+sy); } }
    }
    ctx.shadowBlur=0;
    if(G.flash>0){ ctx.fillStyle="rgba(255,59,48,"+Math.min(0.35,G.flash)+")"; ctx.fillRect(0,0,cv.width,cv.height); }
  }

  /* ---------- sizing ---------- */
  function resize(){
    dpr=Math.min(2,window.devicePixelRatio||1);
    var availW=host.clientWidth||wrap.clientWidth||640, ratio=2.1;
    var availH=embedded?Math.max(320,window.innerHeight*0.8):Math.max(240,(host.clientHeight||window.innerHeight)-92);
    var maxW=Math.min(960,availW);
    var w=Math.min(maxW,availH*COLS/(ROWS*ratio));
    w=Math.max(200,Math.floor(w));
    cw=Math.round(w*dpr)/COLS; chh=cw*ratio;
    cv.width=Math.round(cw*COLS); cv.height=Math.round(chh*ROWS);
    cv.style.width=w+"px"; cv.style.height=(cv.height/dpr)+"px";
    wrap.style.width=w+"px";
    ctx.font="100px VT323, ui-monospace, monospace";
    var m=ctx.measureText("M").width/100||0.5;
    fs=Math.min(cw/m,chh/0.86);
    screenEl.style.fontSize=Math.max(10,w*0.043)+"px";
    help.style.maxWidth=w+"px";
    if(G) render();
  }

  /* ---------- loop ---------- */
  function frame(now){
    if(dead_) return;
    raf=requestAnimationFrame(frame);
    var dt=(now-last)/1000; last=now; if(dt>0.1) dt=0.1; if(dt<0) dt=0;
    acc+=dt; var n=0; while(acc>=STEP&&n<6){ update(STEP); acc-=STEP; n++; } if(n===6) acc=0;
    render();
  }
  function destroy(){
    if(dead_) return; dead_=true; cancelAnimationFrame(raf);
    window.removeEventListener("keydown",onKey); window.removeEventListener("resize",resize);
    document.removeEventListener("visibilitychange",onVis);
    window.removeEventListener("pointerup",onPtrUp); window.removeEventListener("pointercancel",onPtrUp);
    musPause(true); mus=null;
    try{ if(AC&&AC.close) AC.close(); }catch(e){}
    if(wrap.parentNode) wrap.parentNode.removeChild(wrap); if(help.parentNode) help.parentNode.removeChild(help);
  }

  resize(); showTitle(); last=performance.now(); raf=requestAnimationFrame(frame);
  if(document.fonts&&document.fonts.load){ document.fonts.load('20px "VT323"').then(resize,function(){}); }
  return { destroy:destroy, _dbg:{ update:update, state:function(){return {S:S,G:G};}, start:startGame, jump:jump, slide:slide, parry:parry } };
}

window.EscapeSubsector086={mount:mount,config:CFG};
function auto(){ var h=document.querySelectorAll("[data-escape-game]"); for(var i=0;i<h.length;i++) mount(h[i],{embedded:true}); }
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",auto); else auto();
})();
