(function(){
  "use strict";
  var C = window.CITADEL || {};
  var body = document.body;

  /* ---- security: anti-clickjacking + only https links / plain e-mails ---- */
  if(window.top !== window.self){
    try{ window.top.location = window.self.location; }catch(e){ document.documentElement.hidden = true; }
  }
  function safeUrl(u){
    try{ var x = new URL(u, location.href); return x.protocol === "https:" ? x.href : null; }catch(e){ return null; }
  }
  function safeMail(m){ return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(m) ? m : null; }

  /* ---- wire config: mails, links, privacy, social ---- */
  function pending(el, text){
    el.setAttribute("aria-disabled","true"); el.removeAttribute("href");
    if(text) el.textContent = text;
  }
  document.querySelectorAll("[data-mail]").forEach(function(el){
    var v = safeMail((C.email||{})[el.getAttribute("data-mail")] || "");
    if(v){ el.href = "mailto:"+v; el.textContent = v; }
    else { el.removeAttribute("href"); el.textContent = "[ ADDRESS PENDING ]"; el.classList.add("dim"); el.style.border="0"; }
  });
  var ol = document.getElementById("other-lines");
  if(ol){
    var anyMail = ["general","support","collab"].some(function(k){ return safeMail((C.email||{})[k] || ""); });
    if(!anyMail) ol.hidden = true;   /* no e-mail configured: Discord is the only channel shown */
  }
  document.querySelectorAll("[data-link]").forEach(function(el){
    var path = el.getAttribute("data-link").split("."), v = C;
    path.forEach(function(k){ v = v && v[k]; });
    v = v && safeUrl(v);
    if(v){ el.href = v; el.target = "_blank"; el.rel = "noopener noreferrer"; }
    else pending(el, el.getAttribute("data-pending") || null);
  });
  var soc = document.getElementById("social");
  if(soc){
    if(C.social && C.social.length){
      C.social.forEach(function(s){
        var a = document.createElement("a"); a.className="btn"; a.href=safeUrl(s.url)||"#"; a.target="_blank"; a.rel="noopener noreferrer"; a.textContent=s.label;
        soc.appendChild(a);
      });
    } else { var p = soc.closest(".panel"); if(p) p.hidden = true; }
  }

  /* ---- footer year + clock ---- */
  document.querySelectorAll(".year").forEach(function(e){ e.textContent = new Date().getFullYear(); });
  var clock = document.getElementById("clock");
  function tick(){ if(clock){ var d=new Date(); clock.textContent = ("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2); } }
  tick(); setInterval(tick, 20000);

  /* ---- hotkeys 1-4 ---- */
  document.addEventListener("keydown", function(e){
    if(e.ctrlKey||e.metaKey||e.altKey) return;
    var t = (e.target.tagName||"").toLowerCase(); if(t==="input"||t==="textarea") return;
    var a = document.querySelector('.menu a[data-key="'+e.key+'"]');
    if(a && !document.getElementById("boot")) location.href = a.href;
  });

  /* ---- Play button on the Escape Subsector 086 card (games page) ---- */
  (function(){
    var btn = document.querySelector("[data-play-escape]");
    if(!btn) return;
    var busy = false;
    function load(cb){
      if(window.EscapeSubsector086) return cb(true);
      var n = 2, ok = true;
      function one(g){ if(!g) ok = false; if(--n === 0) cb(ok); }
      var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "games/escape-subsector-086/style.css";
      l.onload = function(){ one(true); }; l.onerror = function(){ one(false); }; document.head.appendChild(l);
      var s = document.createElement("script"); s.src = "games/escape-subsector-086/game.js";
      s.onload = function(){ one(true); }; s.onerror = function(){ one(false); }; document.head.appendChild(s);
    }
    btn.addEventListener("click", function(e){
      e.preventDefault();
      if(busy) return; busy = true;
      var old = btn.textContent; btn.textContent = "[ LOADING... ]";
      load(function(ok){
        btn.textContent = old;
        if(!ok || !window.EscapeSubsector086){ busy = false; btn.textContent = "[ UNAVAILABLE ]"; return; }
        var ov = document.createElement("div"); ov.className = "es-overlay"; ov.id = "es-overlay";
        document.body.appendChild(ov); body.classList.add("es-open");
        btn.blur();
        window.EscapeSubsector086.mount(ov, { onExit: function(){
          if(ov.parentNode) ov.parentNode.removeChild(ov);
          body.classList.remove("es-open"); busy = false; btn.focus();
        }});
      });
    });
  })();

  /* ---- fake command console (home) ---- */
  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cin = document.getElementById("con-in"), cout = document.getElementById("con-out");
  if(cin && cout){
    var hist = [], hi = 0;
    var CMDS = {
      "openhome":["home.html","Home"], "home":["home.html","Home"],
      "openappdev":["apps.html","App Development"], "openappdevelopment":["apps.html","App Development"], "openappdevelopments":["apps.html","App Development"], "appdev":["apps.html","App Development"], "openapps":["apps.html","App Development"],
      "opengamedev":["games.html","Game Development"], "opengamedevelopment":["games.html","Game Development"], "gamedev":["games.html","Game Development"], "opengames":["games.html","Game Development"],
      "seekcitadel":["contact.html","Contact"], "contact":["contact.html","Contact"], "opencontact":["contact.html","Contact"]
    };
    var LABEL = { "home.html":"open Home", "apps.html":"open AppDev", "games.html":"open GameDev", "contact.html":"seek Citadel" };
    function say(text, cls){
      var p = document.createElement("p"); if(cls) p.className = cls; p.textContent = text; cout.appendChild(p);
      while(cout.children.length > 60) cout.removeChild(cout.firstChild);
      cout.scrollTop = cout.scrollHeight;
    }
    function lev(a,b){
      var m=[],i,j; for(i=0;i<=a.length;i++){ m[i]=[i]; } for(j=0;j<=b.length;j++){ m[0][j]=j; }
      for(i=1;i<=a.length;i++) for(j=1;j<=b.length;j++)
        m[i][j]=Math.min(m[i-1][j]+1, m[i][j-1]+1, m[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
      return m[a.length][b.length];
    }
    function find(key){
      if(CMDS[key]) return {r:CMDS[key], exact:true};
      var best=null, bd=99, tie=false;
      Object.keys(CMDS).forEach(function(k){
        var d = lev(key,k);
        if(d<bd){ bd=d; best=k; tie=false; } else if(d===bd && CMDS[k][0]!==CMDS[best][0]) tie=true;
      });
      return (bd<=2 && !tie && key.length>=4) ? {r:CMDS[best], exact:false} : null;
    }
    function go(r, fuzzy){
      if(fuzzy) say("Did you mean: " + LABEL[r[0]] + " ?  Running it.", "err");
      say("Opening " + r[1] + " ...", "ok"); setTimeout(function(){ location.href = r[0]; }, 450);
    }

    /* ---- hidden command: kill Time -> ESCAPE SUBSECTOR 086 (offline-capable, no redirect) ---- */
    var launching = false;
    function loadGame(cb){
      if(window.EscapeSubsector086) return cb(true);
      var n = 2, ok = true;
      function one(good){ if(!good) ok = false; if(--n === 0) cb(ok); }
      var l = document.createElement("link"); l.rel = "stylesheet"; l.href = "games/escape-subsector-086/style.css";
      l.onload = function(){ one(true); }; l.onerror = function(){ one(false); }; document.head.appendChild(l);
      var s = document.createElement("script"); s.src = "games/escape-subsector-086/game.js";
      s.onload = function(){ one(true); }; s.onerror = function(){ one(false); }; document.head.appendChild(s);
    }
    function launchGame(){
      if(launching) return; launching = true;
      var msgs = [["[ SYSTEM MESSAGE ]","ok"],["INITIALIZING APPLICATION...",""],["LOADING SUBSECTOR 086...",""],
        ["WARNING: CONTAINMENT FAILURE DETECTED.","err"],["APPLICATION READY.","ok"],["ESCAPE SUBSECTOR 086","ok"],["PRESS ENTER TO BEGIN",""]];
      var i = 0;
      (function next(){
        if(i < msgs.length){ say(msgs[i][0], msgs[i][1]); i++; setTimeout(next, reduceMotion ? 0 : 280); return; }
        setTimeout(function(){
          loadGame(function(ok){
            if(!ok || !window.EscapeSubsector086){ say("ERROR: application module unavailable.", "err"); launching = false; return; }
            var ov = document.createElement("div"); ov.className = "es-overlay"; ov.id = "es-overlay";
            document.body.appendChild(ov); body.classList.add("es-open");
            cin.blur();
            window.EscapeSubsector086.mount(ov, { onExit: function(){
              if(ov.parentNode) ov.parentNode.removeChild(ov);
              body.classList.remove("es-open"); launching = false;
              say("Session closed. Back at the terminal.", "ok"); cin.focus();
            }});
          });
        }, reduceMotion ? 0 : 450);
      })();
    }
    function run(raw){
      var c = raw.toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
      say("visitor@citadel:~$ " + raw, "cmd");
      if(!c) return;
      if(c==="help" || c==="?" || c==="h"){
        say("Available commands:");
        say("open Home — the Citadel home");
        say("open AppDev — App Development");
        say("open GameDev — Game Development");
        say("seek Citadel — Contact");
        say("clear — clear the console");
        say("Tip: tap the buttons below the console to run a command.");
        return;
      }
      if(c==="clear" || c==="cls"){ cout.textContent = ""; return; }
      if(c==="kill time" || c==="killtime"){ launchGame(); return; }
      var f = find(c.replace(/ /g,""));
      if(f){ go(f.r, !f.exact); return; }
      say("Command not recognized: " + raw.slice(0,40) + ". Type help, or tap a command below.", "err");
    }
    function submit(){ var v = cin.value; cin.value = ""; if(v.trim()){ hist.push(v); hi = hist.length; } run(v); }
    var gob = document.getElementById("con-go");
    if(gob) gob.addEventListener("click", function(){ submit(); cin.focus(); });
    var quick = document.getElementById("con-quick");
    if(quick) quick.addEventListener("click", function(e){
      var a = e.target.closest ? e.target.closest("a[data-cmd]") : null; if(!a) return;
      e.preventDefault();
      var cmd = a.getAttribute("data-cmd");
      if(reduceMotion){ cin.value = cmd; submit(); return; }
      cin.value = ""; var k = 0;
      (function type(){ if(k < cmd.length){ cin.value += cmd.charAt(k++); setTimeout(type, 35); } else setTimeout(submit, 200); })();
    });
    cin.addEventListener("keydown", function(e){
      if(e.key === "Enter"){ submit(); } else if(e.key === "ArrowUp"){ if(hi>0){ hi--; cin.value = hist[hi]; } e.preventDefault(); }
      else if(e.key === "ArrowDown"){ if(hi<hist.length-1){ hi++; cin.value = hist[hi]; } else { hi = hist.length; cin.value = ""; } e.preventDefault(); }
    });
    document.getElementById("console").addEventListener("click", function(e){ if(e.target.tagName !== "A") cin.focus(); });
  }

  /* ---- boot sequence (home only, once per session) ---- */
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var seen = false;
  try{ seen = sessionStorage.getItem("citadel-boot") === "1"; }catch(e){}
  if(body.getAttribute("data-page")==="terminal" && !seen && !reduce){
    var lines = [
      "CITADEL-OS v1.0  //  CONTINUITY PROTOCOL",
      "",
      "> INITIALIZING BASTION CORE ........... OK",
      "> LOADING DIVISION REGISTRY ........... OK",
      "> LINKING APP DEVELOPMENTS ............ OK",
      "> LINKING GAME DEVELOPMENT ............ OK",
      "> SECURE CHANNEL (HTTPS) .............. OK",
      "",
      "ACCESS GRANTED. WELCOME, VISITOR."
    ];
    var boot = document.createElement("div"); boot.id="boot";
    boot.innerHTML = '<pre></pre><div class="skiphint">[ click or press any key to skip ]</div>';
    body.appendChild(boot);
    var pre = boot.querySelector("pre"), i = 0, done = false;
    function finish(){
      if(done) return; done = true;
      try{ sessionStorage.setItem("citadel-boot","1"); }catch(e){}
      boot.remove(); document.removeEventListener("keydown", finish);
    }
    boot.addEventListener("click", finish); document.addEventListener("keydown", finish);
    (function next(){
      if(done) return;
      if(i >= lines.length){ setTimeout(finish, 500); return; }
      pre.textContent += lines[i++] + "\n";
      setTimeout(next, 150);
    })();
  }
})();
